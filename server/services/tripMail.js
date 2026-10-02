const pool = require('../database/db');
const { sendAppEmail } = require('./gmailService');

const DEFAULT_PREFS = {
    trip_reminder: true,
    booking_added: true,
    expense_added: true,
    trip_wrap: true,
    friend_request: true,
    trip_invite: true,
    chat_message: true,
};

function money(value) {
    return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function roundMoney(value) {
    return Math.round(Number(value) * 100) / 100;
}

function displayName(person) {
    const name = `${person?.first_name || ''} ${person?.last_name || ''}`.trim();
    return name || person?.email || 'Someone';
}

function formatDay(value) {
    if (!value) return '';
    const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const [year, month, day] = text.split('-').map(Number);
    if (!year || !month || !day) return text;
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function emailHtml({ kicker, headline, intro, rows, note, memory }) {
    const rowHtml = (rows || []).map((row) => `
        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eceef4;color:#222946;font-size:15px;">${escapeHtml(row.label)}</td>
            <td style="padding:10px 0;border-bottom:1px solid #eceef4;color:#222946;font-size:15px;font-weight:700;text-align:right;">${escapeHtml(row.value)}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#e7ebf4;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e7ebf4;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="background:#222946;padding:22px 28px 18px;">
              <img src="cid:travel-logo" alt="Travel" height="46" style="display:block;height:46px;width:auto;border:0;" />
              <div style="height:3px;width:64px;background:#f3ab03;margin-top:14px;border-radius:99px;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 8px;color:#8a6a12;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(kicker)}</p>
              <h1 style="margin:0 0 12px;color:#222946;font-size:26px;line-height:1.25;font-weight:650;">${escapeHtml(headline)}</h1>
              <p style="margin:0 0 18px;color:#3c445c;font-size:16px;line-height:1.55;">${escapeHtml(intro)}</p>
              ${memory || ''}
              ${memory && rowHtml ? '<p style="margin:22px 0 0;font-size:13px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#8a6a12;">Costs</p>' : ''}
              ${rowHtml ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowHtml}</table>` : ''}
              ${note ? `<p style="margin:18px 0 0;padding:14px 16px;background:#f7f4ea;border-radius:12px;color:#222946;font-size:15px;line-height:1.5;">${escapeHtml(note)}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;color:#8b93a7;font-size:12px;line-height:1.5;">
              You can turn these emails on or off in View Profile. The notification center still keeps the rest of your alerts.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function preferencesFor(uid) {
    const { rows } = await pool.query(
        'SELECT trip_reminder, booking_added, expense_added, trip_wrap, friend_request, trip_invite, chat_message FROM core.email_preferences WHERE user_uid = $1',
        [uid]
    );
    return rows[0] || DEFAULT_PREFS;
}

async function loadTrip(itineraryId) {
    const { rows } = await pool.query(
        `SELECT itinerary_id, title, destinations, start_date, end_date, owner_id
         FROM core.itineraries
         WHERE itinerary_id = $1`,
        [itineraryId]
    );
    return rows[0] || null;
}

async function loadParticipants(itineraryId) {
    const { rows } = await pool.query(
        `SELECT DISTINCT u.uid, u.first_name, u.last_name, u.email
         FROM core.itineraries i
         JOIN core.users u ON (
            u.uid = i.owner_id
            OR u.uid IN (SELECT guest_id FROM core.shared WHERE itinerary_id = i.itinerary_id)
            OR u.uid IN (SELECT user_id FROM core.roles WHERE itinerary_id = i.itinerary_id)
         )
         WHERE i.itinerary_id = $1`,
        [itineraryId]
    );
    return rows;
}

async function loadBalances(itineraryId, participants) {
    const expensesResult = await pool.query(
        `SELECT expense_id, amount, paid_by, created_by FROM core.expenses WHERE itinerary_id = $1`,
        [itineraryId]
    );
    const sharesResult = await pool.query(
        `SELECT s.user_uid, s.amount
         FROM core.expense_shares s
         JOIN core.expenses e ON e.expense_id = s.expense_id
         WHERE e.itinerary_id = $1`,
        [itineraryId]
    );
    const paymentsResult = await pool.query(
        `SELECT from_uid, to_uid, amount FROM core.expense_payments WHERE itinerary_id = $1`,
        [itineraryId]
    ).catch(() => ({ rows: [] }));

    const expenses = expensesResult.rows;
    const shares = sharesResult.rows;
    const payments = paymentsResult.rows || [];
    const tripTotal = roundMoney(expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0));

    return {
        tripTotal,
        people: participants.map((person) => {
            const share = shares.reduce((sum, row) => (
                row.user_uid === person.uid ? sum + Number(row.amount) : sum
            ), 0);
            const paid = expenses.reduce((sum, expense) => (
                (expense.paid_by || expense.created_by) === person.uid ? sum + Number(expense.amount || 0) : sum
            ), 0);
            const sent = payments.reduce((sum, payment) => (
                payment.from_uid === person.uid ? sum + Number(payment.amount) : sum
            ), 0);
            const received = payments.reduce((sum, payment) => (
                payment.to_uid === person.uid ? sum + Number(payment.amount) : sum
            ), 0);
            return {
                ...person,
                spent: roundMoney(share),
                paid: roundMoney(paid),
                net: roundMoney(paid - share + sent - received),
            };
        }),
    };
}

function balanceNote(person, people) {
    const debtors = people
        .filter((other) => other.net < -0.009)
        .map((other) => ({ ...other, remaining: roundMoney(-other.net) }));
    const creditors = people
        .filter((other) => other.net > 0.009)
        .map((other) => ({ ...other, remaining: other.net }));
    const lines = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
        const pay = roundMoney(Math.min(debtors[debtorIndex].remaining, creditors[creditorIndex].remaining));
        if (pay > 0 && (debtors[debtorIndex].uid === person.uid || creditors[creditorIndex].uid === person.uid)) {
            lines.push(debtors[debtorIndex].uid === person.uid
                ? `You still owe ${displayName(creditors[creditorIndex])} ${money(pay)}.`
                : `${displayName(debtors[debtorIndex])} owes you ${money(pay)}.`);
        }
        debtors[debtorIndex].remaining = roundMoney(debtors[debtorIndex].remaining - pay);
        creditors[creditorIndex].remaining = roundMoney(creditors[creditorIndex].remaining - pay);
        if (debtors[debtorIndex].remaining <= 0.009) debtorIndex += 1;
        if (creditors[creditorIndex].remaining <= 0.009) creditorIndex += 1;
    }
    if (lines.length) return lines.join(' ');
    if (person.net > 0.009) return `You are owed ${money(person.net)}.`;
    if (person.net < -0.009) return `You still owe ${money(-person.net)}.`;
    return 'You are settled up on this trip.';
}

async function claimAndSend({ uid, email, kind, refKey, prefKey, subject, html, text }) {
    if (!uid || !email) return;
    const prefs = await preferencesFor(uid);
    if (prefs[prefKey] === false) return;

    const claimed = await pool.query(
        `INSERT INTO core.email_log (user_uid, kind, ref_key)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_uid, kind, ref_key) DO NOTHING
         RETURNING email_log_id`,
        [uid, kind, refKey]
    );
    if (!claimed.rowCount) return;

    try {
        const result = await sendAppEmail({ to: email, subject, html, text });
        if (!result.sent) {
            await pool.query(
                'DELETE FROM core.email_log WHERE user_uid = $1 AND kind = $2 AND ref_key = $3',
                [uid, kind, refKey]
            );
        }
    } catch (error) {
        await pool.query(
            'DELETE FROM core.email_log WHERE user_uid = $1 AND kind = $2 AND ref_key = $3',
            [uid, kind, refKey]
        );
        const status = error?.response?.status || error?.code || '';
        console.error(`Email not sent (${status}): ${error.message}`);
    }
}

async function notifyBookingAdded({ itineraryId, actorUid, bookingType, summary, refKey }) {
    try {
        const trip = await loadTrip(itineraryId);
        if (!trip) return;
        const participants = await loadParticipants(itineraryId);
        const actor = participants.find((person) => person.uid === actorUid);
        const who = actor ? displayName(actor) : 'Someone';
        const place = trip.destinations ? ` in ${trip.destinations}` : '';
        const headline = `${bookingType} added to ${trip.title}`;
        const intro = `${who} added ${summary}${place}.`;

        await Promise.all(participants
            .filter((person) => person.uid !== actorUid)
            .map((person) => claimAndSend({
                uid: person.uid,
                email: person.email,
                kind: 'booking_added',
                refKey,
                prefKey: 'booking_added',
                subject: headline,
                text: `${intro} Open Travel Planner to see it.`,
                html: emailHtml({
                    kicker: 'New booking',
                    headline,
                    intro,
                    rows: [
                        { label: 'Trip', value: trip.title },
                        { label: 'When', value: `${formatDay(trip.start_date)} – ${formatDay(trip.end_date)}` },
                    ],
                }),
            })));
    } catch (error) {
        console.error('Booking email failed:', error.message);
    }
}

async function notifyExpenseAdded({ itineraryId, actorUid, title, amount, shareUids, paidByUid, expenseId }) {
    try {
        const trip = await loadTrip(itineraryId);
        if (!trip) return;
        const participants = await loadParticipants(itineraryId);
        const actor = participants.find((person) => person.uid === actorUid);
        const who = actor ? displayName(actor) : 'Someone';
        const involved = new Set([...(shareUids || []), paidByUid].filter(Boolean));
        const headline = `New expense on ${trip.title}`;
        const intro = `${who} added ${title} for ${money(amount)}. It includes you.`;

        await Promise.all(participants
            .filter((person) => person.uid !== actorUid && involved.has(person.uid))
            .map((person) => claimAndSend({
                uid: person.uid,
                email: person.email,
                kind: 'expense_added',
                refKey: `expense:${expenseId}`,
                prefKey: 'expense_added',
                subject: headline,
                text: intro,
                html: emailHtml({
                    kicker: 'Expense',
                    headline,
                    intro,
                    rows: [
                        { label: 'Trip', value: trip.title },
                        { label: 'Amount', value: money(amount) },
                    ],
                }),
            })));
    } catch (error) {
        console.error('Expense email failed:', error.message);
    }
}

async function notifyPaymentLogged({ itineraryId, actorUid, fromUid, toUid, amount, paymentId }) {
    try {
        const trip = await loadTrip(itineraryId);
        if (!trip) return;
        const participants = await loadParticipants(itineraryId);
        const from = participants.find((person) => person.uid === fromUid);
        const to = participants.find((person) => person.uid === toUid);
        const headline = `Payment recorded on ${trip.title}`;
        const intro = `${from ? displayName(from) : 'Someone'} paid ${to ? displayName(to) : 'someone'} ${money(amount)}.`;

        await Promise.all(participants
            .filter((person) => person.uid !== actorUid && (person.uid === fromUid || person.uid === toUid))
            .map((person) => claimAndSend({
                uid: person.uid,
                email: person.email,
                kind: 'expense_added',
                refKey: `payment:${paymentId}`,
                prefKey: 'expense_added',
                subject: headline,
                text: intro,
                html: emailHtml({
                    kicker: 'Payment',
                    headline,
                    intro,
                    rows: [
                        { label: 'Trip', value: trip.title },
                        { label: 'Amount', value: money(amount) },
                    ],
                }),
            })));
    } catch (error) {
        console.error('Payment email failed:', error.message);
    }
}

async function sendReminders(trip, daysAway) {
    const participants = await loadParticipants(trip.itinerary_id);
    const when = daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`;
    const headline = `${trip.title} starts ${when}`;
    const intro = trip.destinations
        ? `${trip.title} starts ${when}, ${formatDay(trip.start_date)}, in ${trip.destinations}.`
        : `${trip.title} starts ${when}, ${formatDay(trip.start_date)}.`;

    await Promise.all(participants.map((person) => claimAndSend({
        uid: person.uid,
        email: person.email,
        kind: 'trip_reminder',
        refKey: `trip:${trip.itinerary_id}:d${daysAway}`,
        prefKey: 'trip_reminder',
        subject: headline,
        text: intro,
        html: emailHtml({
            kicker: 'Trip coming up',
            headline,
            intro: `${trip.title} starts ${when}.`,
            rows: [
                { label: 'Destination', value: trip.destinations || 'Your trip' },
                { label: 'Starts', value: formatDay(trip.start_date) },
                { label: 'Ends', value: formatDay(trip.end_date) },
            ],
        }),
    })));
}

function dateKey(value) {
    if (!value) return '';
    if (value instanceof Date) {
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${value.getFullYear()}-${month}-${day}`;
    }
    return String(value).slice(0, 10);
}

function memoryHtml(days) {
    if (!days.length) return '';
    const blocks = days.map((day) => `
        <p style="margin:16px 0 4px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#222946;">${escapeHtml(day.label)}</p>
        <p style="margin:0 0 4px;color:#3c445c;font-size:15px;line-height:1.6;">${day.titles.map((title) => escapeHtml(title)).join('<br>')}</p>
    `).join('');
    return `<p style="margin:4px 0 0;font-size:13px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#8a6a12;">Your Trip</p>${blocks}`;
}

async function loadTripDays(trip) {
    const start = dateKey(trip.start_date);
    const end = dateKey(trip.end_date) || start;
    if (!start) return [];

    const queries = [
        [`SELECT title, activity_date AS day, COALESCE(start_time::text, '') AS sort FROM core.activities WHERE itinerary_id = $1 AND title IS NOT NULL AND title <> ''`, (row) => row.title],
        [`SELECT trim(concat_ws(' ', airline, flight_number)) AS title, departure_time AS day, COALESCE(departure_time::text, '') AS sort FROM core.flights WHERE itinerary_id = $1`, (row) => row.title],
        [`SELECT hotel_name AS title, check_in_date AS day, '' AS sort FROM core.hotels WHERE itinerary_id = $1 AND hotel_name IS NOT NULL AND hotel_name <> ''`, (row) => row.title],
        [`SELECT restaurant_name AS title, reservation_date AS day, COALESCE(reservation_time::text, '') AS sort FROM core.restaurant WHERE itinerary_id = $1 AND restaurant_name IS NOT NULL AND restaurant_name <> ''`, (row) => row.title],
        [`SELECT type AS title, pickup_time AS day, COALESCE(pickup_time::text, '') AS sort FROM core.transport WHERE itinerary_id = $1 AND type IS NOT NULL AND type <> ''`, (row) => row.title],
    ];

    const items = [];
    for (const [sql, titleOf] of queries) {
        try {
            const result = await pool.query(sql, [trip.itinerary_id]);
            result.rows.forEach((row) => {
                const title = String(titleOf(row) || '').trim();
                const day = dateKey(row.day);
                if (!title || !day) return;
                items.push({ day, title, sort: row.sort || title });
            });
        } catch (error) {
            console.error('Trip memory lookup skipped:', error.message);
        }
    }

    const grouped = [];
    const cursor = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    let number = 1;
    while (cursor <= last && number < 90) {
        const key = dateKey(cursor);
        const titles = items
            .filter((item) => item.day === key)
            .sort((a, b) => String(a.sort).localeCompare(String(b.sort)))
            .map((item) => item.title);
        grouped.push({ label: `Day ${number} · ${formatDay(key)}`, titles });
        cursor.setDate(cursor.getDate() + 1);
        number += 1;
    }
    return grouped;
}

async function sendWrapUps(trip) {
    const participants = await loadParticipants(trip.itinerary_id);
    const { tripTotal, people } = await loadBalances(trip.itinerary_id, participants);
    const days = await loadTripDays(trip);
    const headline = `${trip.title} is wrapped up`;
    const memory = memoryHtml(days);
    const dayText = days.map((day) => `${day.label}\n${day.titles.join('\n')}`).join('\n\n');

    await Promise.all(people.map((person) => {
        const rows = [
            { label: 'Total spent', value: money(tripTotal) },
            ...people.map((other) => ({
                label: displayName(other),
                value: `Spent ${money(other.spent)} · Paid ${money(other.paid)}`,
            })),
        ];
        const note = balanceNote(person, people);
        const intro = trip.destinations
            ? `Here is ${trip.destinations}, day by day, and how the costs came out.`
            : 'Here is the trip, day by day, and how the costs came out.';
        return claimAndSend({
            uid: person.uid,
            email: person.email,
            kind: 'trip_wrap',
            refKey: `wrap:${trip.itinerary_id}`,
            prefKey: 'trip_wrap',
            subject: headline,
            text: [intro, dayText, `Total spent ${money(tripTotal)}. ${note}`].filter(Boolean).join('\n\n'),
            html: emailHtml({
                kicker: 'Trip wrap-up',
                headline,
                intro,
                memory,
                rows,
                note,
            }),
        });
    }));
}

async function runScheduledTripMail() {
    try {
        const upcoming = await pool.query(
            `SELECT itinerary_id, title, destinations, start_date, end_date,
                    (start_date::date - CURRENT_DATE) AS days_away
             FROM core.itineraries
             WHERE start_date::date = CURRENT_DATE + INTERVAL '3 days'
                OR start_date::date = CURRENT_DATE + INTERVAL '1 day'`
        );
        for (const trip of upcoming.rows) {
            const daysAway = Number(trip.days_away);
            if (daysAway === 1 || daysAway === 3) {
                await sendReminders(trip, daysAway);
            }
        }

        const finished = await pool.query(
            `SELECT itinerary_id, title, destinations, start_date, end_date
             FROM core.itineraries
             WHERE end_date::date = CURRENT_DATE - INTERVAL '1 day'`
        );
        for (const trip of finished.rows) {
            await sendWrapUps(trip);
        }
    } catch (error) {
        console.error('Scheduled trip email failed:', error.message);
    }
}

async function loadUsers(uids) {
    const { rows } = await pool.query(
        `SELECT uid, email, first_name, last_name FROM core.users WHERE uid = ANY($1::text[])`,
        [uids]
    );
    return rows;
}

async function notifyChatMessage({ itineraryId, actorUid, messageId, text, userName }) {
    try {
        const trip = await loadTrip(itineraryId);
        if (!trip) return;
        const participants = await loadParticipants(itineraryId);
        const who = userName || 'Someone';
        const snippet = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 140) || 'Sent a message';
        const headline = `New message on ${trip.title}`;
        const intro = `${who}: ${snippet}`;
        await Promise.all(participants
            .filter((person) => person.uid !== actorUid && person.email)
            .map((person) => claimAndSend({
                uid: person.uid,
                email: person.email,
                kind: 'chat_message',
                refKey: `chat:${itineraryId}:${messageId}`,
                prefKey: 'chat_message',
                subject: headline,
                text: `${intro} Open the trip chat to reply.`,
                html: emailHtml({
                    kicker: 'Trip Chat',
                    headline,
                    intro,
                    rows: [{ label: 'Trip', value: trip.title }],
                    note: 'Open the trip chat to reply.',
                }),
            })));
    } catch (error) {
        console.error('Chat email failed:', error.message);
    }
}

async function notifyFriendRequest({ requesterUid, requesteeUid, requestId }) {
    try {
        const people = await loadUsers([requesterUid, requesteeUid]);
        const requester = people.find((person) => person.uid === requesterUid);
        const requestee = people.find((person) => person.uid === requesteeUid);
        if (!requestee?.email) return;
        const who = requester ? displayName(requester) : 'Someone';
        const headline = `${who} sent you a friend request`;
        await claimAndSend({
            uid: requestee.uid,
            email: requestee.email,
            kind: 'friend_request',
            refKey: `friend:${requestId || requesterUid}`,
            prefKey: 'friend_request',
            subject: headline,
            text: `${headline}. Open Friends to accept or decline it.`,
            html: emailHtml({
                kicker: 'Friend Request',
                headline,
                intro: 'Open Friends to accept or decline it.',
            }),
        });
    } catch (error) {
        console.error('Friend request email failed:', error.message);
    }
}

async function notifyTripInvite({ actorUid, friendId, itineraryId, title }) {
    try {
        const people = await loadUsers([actorUid, friendId]);
        const actor = people.find((person) => person.uid === actorUid);
        const friend = people.find((person) => person.uid === friendId);
        if (!friend?.email) return;
        const who = actor ? displayName(actor) : 'Someone';
        const tripName = title || 'a trip';
        const headline = `${who} invited you to ${tripName}`;
        await claimAndSend({
            uid: friend.uid,
            email: friend.email,
            kind: 'trip_invite',
            refKey: `invite:${itineraryId}:${friendId}`,
            prefKey: 'trip_invite',
            subject: headline,
            text: `${headline}. Open your invitations to respond.`,
            html: emailHtml({
                kicker: 'Trip Invite',
                headline,
                intro: 'Open your invitations to respond.',
                rows: title ? [{ label: 'Trip', value: title }] : [],
            }),
        });
    } catch (error) {
        console.error('Trip invite email failed:', error.message);
    }
}

module.exports = {
    notifyBookingAdded,
    notifyExpenseAdded,
    notifyPaymentLogged,
    notifyChatMessage,
    notifyFriendRequest,
    notifyTripInvite,
    runScheduledTripMail,
    DEFAULT_PREFS,
};
