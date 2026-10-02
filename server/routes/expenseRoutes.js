const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const verifyToken = require('../FirebaseToken');
const { notifyExpenseAdded, notifyPaymentLogged } = require('../services/tripMail');

router.use(verifyToken);

async function canAccessItinerary(itineraryId, uid) {
  const { rows } = await pool.query(
    `SELECT i.itinerary_id, i.owner_id, i.title
     FROM core.itineraries i
     LEFT JOIN core.shared s ON s.itinerary_id = i.itinerary_id AND s.guest_id = $2
     WHERE i.itinerary_id = $1 AND (i.owner_id = $2 OR s.guest_id = $2)`,
    [itineraryId, uid]
  );
  return rows[0] || null;
}

async function fetchParticipants(itineraryId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT u.uid, u.first_name, u.last_name, u.email, u.profile_picture,
            CASE WHEN i.owner_id = u.uid THEN 'host' ELSE 'guest' END AS role
     FROM core.itineraries i
     JOIN core.users u ON (
        u.uid = i.owner_id
        OR u.uid IN (SELECT guest_id FROM core.shared WHERE itinerary_id = i.itinerary_id)
        OR u.uid IN (SELECT user_id FROM core.roles WHERE itinerary_id = i.itinerary_id)
     )
     WHERE i.itinerary_id = $1
     ORDER BY role DESC, u.first_name ASC`,
    [itineraryId]
  );
  return rows;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function buildShares({ total, participants, splitMode, customShares }) {
  const uids = participants.map((person) => person.uid);
  if (!uids.length) throw Object.assign(new Error('Select at least one person.'), { status: 400 });

  if (splitMode === 'custom') {
    const map = {};
    (customShares || []).forEach((share) => {
      const uid = String(share.uid || '');
      if (uids.some((id) => String(id) === uid)) {
        map[uid] = roundMoney(share.amount);
      }
    });
    const sum = roundMoney(uids.reduce((acc, uid) => acc + (map[String(uid)] || 0), 0));
    if (Math.abs(sum - roundMoney(total)) > 0.05) {
      throw Object.assign(new Error(`Custom amounts must add up to $${roundMoney(total).toFixed(2)}.`), { status: 400 });
    }
    return uids.map((uid) => ({ uid, amount: map[String(uid)] || 0 }));
  }

  const even = roundMoney(total / uids.length);
  const shares = uids.map((uid) => ({ uid, amount: even }));
  const drift = roundMoney(total - even * uids.length);
  shares[0].amount = roundMoney(shares[0].amount + drift);
  return shares;
}

router.get('/itineraries', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.itinerary_id, i.title, i.start_date, i.end_date, i.destinations, i.owner_id
       FROM core.itineraries i
       WHERE i.owner_id = $1
          OR i.itinerary_id IN (SELECT itinerary_id FROM core.shared WHERE guest_id = $1)
       ORDER BY i.start_date DESC NULLS LAST`,
      [req.user.uid]
    );
    res.json(rows);
  } catch (error) {
    console.error('Failed to list expense itineraries:', error);
    res.status(500).json({ error: 'Failed to load trips for expenses.' });
  }
});

router.get('/itinerary/:itineraryId/participants', async (req, res) => {
  try {
    const itinerary = await canAccessItinerary(req.params.itineraryId, req.user.uid);
    if (!itinerary) return res.status(403).json({ error: 'Access denied.' });
    res.json(await fetchParticipants(req.params.itineraryId));
  } catch (error) {
    console.error('Failed to load participants:', error);
    res.status(500).json({ error: 'Failed to load travelers.' });
  }
});

router.get('/itinerary/:itineraryId', async (req, res) => {
  try {
    const itinerary = await canAccessItinerary(req.params.itineraryId, req.user.uid);
    if (!itinerary) return res.status(403).json({ error: 'Access denied.' });

    const participants = await fetchParticipants(req.params.itineraryId);
    const expensesResult = await pool.query(
      `SELECT e.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM core.expenses e
       LEFT JOIN core.users u ON u.uid = e.created_by
       WHERE e.itinerary_id = $1
       ORDER BY COALESCE(e.expense_date, e.created_at) DESC, e.expense_id DESC`,
      [req.params.itineraryId]
    );

    const sharesResult = await pool.query(
      `SELECT s.*, u.first_name, u.last_name
       FROM core.expense_shares s
       JOIN core.expenses e ON e.expense_id = s.expense_id
       LEFT JOIN core.users u ON u.uid = s.user_uid
       WHERE e.itinerary_id = $1`,
      [req.params.itineraryId]
    );

    const sharesByExpense = {};
    sharesResult.rows.forEach((share) => {
      if (!sharesByExpense[share.expense_id]) sharesByExpense[share.expense_id] = [];
      sharesByExpense[share.expense_id].push(share);
    });

    const expenses = expensesResult.rows.map((expense) => ({
      ...expense,
      amount: Number(expense.amount),
      shares: (sharesByExpense[expense.expense_id] || []).map((share) => ({
        ...share,
        amount: Number(share.amount),
      })),
    }));

    const paymentsResult = await pool.query(
      `SELECT p.*,
              uf.first_name AS from_first_name, uf.last_name AS from_last_name,
              ut.first_name AS to_first_name, ut.last_name AS to_last_name
       FROM core.expense_payments p
       LEFT JOIN core.users uf ON uf.uid = p.from_uid
       LEFT JOIN core.users ut ON ut.uid = p.to_uid
       WHERE p.itinerary_id = $1
       ORDER BY p.created_at DESC`,
      [req.params.itineraryId]
    ).catch(() => ({ rows: [] }));
    const payments = (paymentsResult.rows || []).map((row) => ({ ...row, amount: Number(row.amount) }));
    const payerId = (expense) => expense.paid_by || expense.created_by;

    const balances = participants.map((person) => {
      const share = expenses.reduce((sum, expense) => {
        const shareRow = expense.shares.find((item) => item.user_uid === person.uid);
        return sum + (shareRow ? Number(shareRow.amount) : 0);
      }, 0);
      const paid = expenses.reduce((sum, expense) => (
        payerId(expense) === person.uid ? sum + Number(expense.amount || 0) : sum
      ), 0);
      const received = payments.reduce((sum, payment) => (
        payment.to_uid === person.uid ? sum + Number(payment.amount) : sum
      ), 0);
      const sent = payments.reduce((sum, payment) => (
        payment.from_uid === person.uid ? sum + Number(payment.amount) : sum
      ), 0);
      const net = roundMoney(paid - share + sent - received);
      return {
        ...person,
        owed: roundMoney(share),
        paid: roundMoney(paid),
        net,
      };
    });

    const debtors = balances
      .filter((person) => person.net < -0.009)
      .map((person) => ({ ...person, remaining: roundMoney(-person.net) }));
    const creditors = balances
      .filter((person) => person.net > 0.009)
      .map((person) => ({ ...person, remaining: person.net }));
    const settlements = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const pay = roundMoney(Math.min(debtors[debtorIndex].remaining, creditors[creditorIndex].remaining));
      if (pay > 0) {
        settlements.push({
          fromUid: debtors[debtorIndex].uid,
          fromName: `${debtors[debtorIndex].first_name || debtors[debtorIndex].email} ${debtors[debtorIndex].last_name || ''}`.trim(),
          toUid: creditors[creditorIndex].uid,
          toName: `${creditors[creditorIndex].first_name || creditors[creditorIndex].email} ${creditors[creditorIndex].last_name || ''}`.trim(),
          amount: pay,
        });
      }
      debtors[debtorIndex].remaining = roundMoney(debtors[debtorIndex].remaining - pay);
      creditors[creditorIndex].remaining = roundMoney(creditors[creditorIndex].remaining - pay);
      if (debtors[debtorIndex].remaining <= 0.009) debtorIndex += 1;
      if (creditors[creditorIndex].remaining <= 0.009) creditorIndex += 1;
    }

    const balancesWithIncoming = balances.map((person) => ({
      ...person,
      incoming: settlements
        .filter((item) => item.toUid === person.uid)
        .map((item) => {
          const from = participants.find((row) => row.uid === item.fromUid) || {};
          return {
            uid: item.fromUid,
            name: item.fromName,
            email: from.email || '',
            amount: item.amount,
          };
        }),
      outgoing: settlements
        .filter((item) => item.fromUid === person.uid)
        .map((item) => {
          const to = participants.find((row) => row.uid === item.toUid) || {};
          return {
            uid: item.toUid,
            name: item.toName,
            email: to.email || '',
            amount: item.amount,
          };
        }),
    }));

    res.json({
      itinerary,
      isHost: itinerary.owner_id === req.user.uid,
      participants,
      expenses,
      balances: balancesWithIncoming,
      payments,
      tripTotal: roundMoney(expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)),
    });
  } catch (error) {
    console.error('Failed to load expenses:', error);
    res.status(500).json({ error: 'Failed to load expenses for this trip.' });
  }
});

router.post('/itinerary/:itineraryId', async (req, res) => {
  try {
    const itinerary = await canAccessItinerary(req.params.itineraryId, req.user.uid);
    if (!itinerary) return res.status(403).json({ error: 'Access denied.' });

    const title = String(req.body.title || '').trim();
    const category = String(req.body.category || 'other').trim();
    const amount = roundMoney(req.body.amount);
    const expenseDate = req.body.expense_date || null;
    const splitMode = req.body.split_mode === 'custom' ? 'custom' : 'even';
    const selectedUids = Array.isArray(req.body.participant_uids) ? req.body.participant_uids : [];

    if (!title || !amount || amount <= 0) {
      return res.status(400).json({ error: 'A title and total amount are required.' });
    }

    const allParticipants = await fetchParticipants(req.params.itineraryId);
    const selected = allParticipants.filter((person) => selectedUids.includes(person.uid));
    const shares = buildShares({
      total: amount,
      participants: selected,
      splitMode,
      customShares: req.body.custom_shares,
    });

    const paidByUid = allParticipants.some((person) => person.uid === req.body.paid_by)
      ? req.body.paid_by
      : req.user.uid;

    const inserted = await pool.query(
      `INSERT INTO core.expenses (itinerary_id, category, amount, description, expense_date, title, created_by, paid_by, split_mode, receipt_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.params.itineraryId,
        category,
        amount,
        req.body.description || title,
        expenseDate,
        title,
        req.user.uid,
        paidByUid,
        splitMode,
        req.body.receipt_name || null,
      ]
    );

    const expense = inserted.rows[0];
    notifyExpenseAdded({
      itineraryId: req.params.itineraryId,
      actorUid: req.user.uid,
      title,
      amount,
      shareUids: shares.map((share) => share.uid),
      paidByUid,
      expenseId: expense.expense_id,
    });
    for (const share of shares) {
      await pool.query(
        `INSERT INTO core.expense_shares (expense_id, user_uid, amount) VALUES ($1, $2, $3)`,
        [expense.expense_id, share.uid, share.amount]
      );
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error('Failed to add expense:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to add that expense.' });
  }
});

router.post('/itinerary/:itineraryId/payments', async (req, res) => {
  try {
    const itinerary = await canAccessItinerary(req.params.itineraryId, req.user.uid);
    if (!itinerary) return res.status(403).json({ error: 'Access denied.' });

    const fromUid = String(req.body.from_uid || '').trim();
    const toUid = String(req.body.to_uid || '').trim();
    const amount = roundMoney(req.body.amount);
    if (!fromUid || !toUid || amount <= 0) {
      return res.status(400).json({ error: 'A payer, recipient, and amount are required.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO core.expense_payments (itinerary_id, from_uid, to_uid, amount, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.itineraryId, fromUid, toUid, amount, req.body.note || 'e-transfer']
    );
    notifyPaymentLogged({
      itineraryId: req.params.itineraryId,
      actorUid: req.user.uid,
      fromUid,
      toUid,
      amount,
      paymentId: rows[0].payment_id || rows[0].id,
    });
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Failed to log payment:', error);
    res.status(500).json({ error: 'Failed to log that e-transfer.' });
  }
});

router.delete('/:expenseId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.expense_id, i.owner_id, e.created_by
       FROM core.expenses e
       JOIN core.itineraries i ON i.itinerary_id = e.itinerary_id
       WHERE e.expense_id = $1`,
      [req.params.expenseId]
    );
    const expense = rows[0];
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    if (expense.owner_id !== req.user.uid && expense.created_by !== req.user.uid) {
      return res.status(403).json({ error: 'Only the host or the person who added it can delete this.' });
    }
    await pool.query('DELETE FROM core.expenses WHERE expense_id = $1', [req.params.expenseId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    res.status(500).json({ error: 'Failed to delete that expense.' });
  }
});

module.exports = router;
