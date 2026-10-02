const pool = require('./db');
const { ensureNotificationTables } = require('./ensureNotificationTables');
const { buildReminder, buildTripCountdown, eventMoment } = require('./reminderWindows');

function titleCase(value) {
    return String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function personName(row) {
    return titleCase([row?.first_name, row?.last_name].filter(Boolean).join(' ')) || 'A collaborator';
}

function money(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '';
    return `$${amount.toFixed(2)}`;
}

function stamp(value) {
    if (!value) return new Date();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function safeRows(label, sql, params) {
    try {
        const { rows } = await pool.query(sql, params);
        return rows;
    } catch (error) {
        console.error(`Notification source ${label} skipped:`, error.message);
        return [];
    }
}

function titleCaseWords(value) {
    return String(value || '').replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function buildAction(row) {
    if (row.event_type === 'invite') return { label: 'Accept Invite', kind: 'accept-invite' };
    if (row.event_type === 'friend') return { label: 'Accept Request', kind: 'accept-friend' };
    if (row.event_type === 'chat' && row.itinerary_id) {
        return { label: 'View Chat', href: `/itineraries/${row.itinerary_id}?tab=chat` };
    }
    if (row.event_type === 'expense') {
        return { label: 'Review Expense', href: row.itinerary_id ? `/expenses/${row.itinerary_id}` : '/expenses' };
    }
    if (row.itinerary_id) return { label: 'View Itinerary', href: `/itineraries/${row.itinerary_id}` };
    return null;
}

function present(row) {
    const action = buildAction(row);
    return {
        id: row.notification_id,
        category: row.category,
        event_type: row.event_type,
        title: titleCaseWords(row.title),
        body: titleCaseWords(row.body),
        created_at: row.created_at,
        read: Boolean(row.read_at),
        hiddenFromAll: Boolean(row.hidden_from_all),
        itinerary_id: row.itinerary_id,
        tripTitle: titleCaseWords(row.trip_title || ''),
        expense_id: row.expense_id,
        invitation_id: row.invitation_id,
        friend_request_id: row.friend_request_id,
        action: action ? { ...action, label: titleCaseWords(action.label) } : null,
    };
}

async function collectReminders(userUid) {
    const access = `
        AND (
            i.owner_id = $1
            OR EXISTS (
                SELECT 1 FROM core.shared sh
                WHERE sh.itinerary_id = i.itinerary_id AND sh.guest_id = $1
            )
        )
    `;
    const now = new Date();
    const reminders = [];

    const flights = await safeRows(
        'flight-reminders',
        `SELECT f.flight_id, f.itinerary_id, f.departure_time, f.airline, f.flight_number
         FROM core.flights f
         JOIN core.itineraries i ON i.itinerary_id = f.itinerary_id
         WHERE f.departure_time > NOW()
           AND f.departure_time <= NOW() + INTERVAL '24 hours'
           ${access}`,
        [userUid]
    );
    flights.forEach((row) => {
        const when = eventMoment(row.departure_time);
        const name = [row.airline, row.flight_number].filter(Boolean).join(' ');
        const reminder = buildReminder({
            kind: 'flight',
            name,
            when,
            recordId: row.flight_id,
            itineraryId: row.itinerary_id,
            now,
        });
        if (reminder) reminders.push(reminder);
    });

    const arrivals = await safeRows(
        'arrival-reminders',
        `SELECT f.flight_id, f.itinerary_id, f.arrival_time, f.airline, f.flight_number
         FROM core.flights f
         JOIN core.itineraries i ON i.itinerary_id = f.itinerary_id
         WHERE f.arrival_time > NOW()
           AND f.arrival_time <= NOW() + INTERVAL '3 hours'
           ${access}`,
        [userUid]
    );
    arrivals.forEach((row) => {
        const name = [row.airline, row.flight_number].filter(Boolean).join(' ');
        const reminder = buildReminder({
            kind: 'arrival',
            name,
            when: eventMoment(row.arrival_time),
            recordId: row.flight_id,
            itineraryId: row.itinerary_id,
            now,
            maxHours: 3,
        });
        if (reminder) reminders.push(reminder);
    });

    const hotels = await safeRows(
        'hotel-reminders',
        `SELECT h.hotel_id, h.itinerary_id, h.check_in_date, h.hotel_name
         FROM core.hotels h
         JOIN core.itineraries i ON i.itinerary_id = h.itinerary_id
         WHERE (h.check_in_date + TIME '15:00') > NOW()
           AND (h.check_in_date + TIME '15:00') <= NOW() + INTERVAL '24 hours'
           ${access}`,
        [userUid]
    );
    hotels.forEach((row) => {
        const reminder = buildReminder({
            kind: 'hotel',
            name: row.hotel_name,
            when: eventMoment(row.check_in_date, null, 15),
            recordId: row.hotel_id,
            itineraryId: row.itinerary_id,
            now,
        });
        if (reminder) reminders.push(reminder);
    });

    const checkouts = await safeRows(
        'checkout-reminders',
        `SELECT h.hotel_id, h.itinerary_id, h.check_out_date, h.hotel_name
         FROM core.hotels h
         JOIN core.itineraries i ON i.itinerary_id = h.itinerary_id
         WHERE (h.check_out_date + TIME '11:00') > NOW()
           AND (h.check_out_date + TIME '11:00') <= NOW() + INTERVAL '24 hours'
           ${access}`,
        [userUid]
    );
    checkouts.forEach((row) => {
        const reminder = buildReminder({
            kind: 'checkout',
            name: row.hotel_name,
            when: eventMoment(row.check_out_date, null, 11),
            recordId: row.hotel_id,
            itineraryId: row.itinerary_id,
            now,
        });
        if (reminder) reminders.push(reminder);
    });

    const activities = await safeRows(
        'activity-reminders',
        `SELECT a.activity_id, a.itinerary_id, a.activity_date, a.start_time, a.title
         FROM core.activities a
         JOIN core.itineraries i ON i.itinerary_id = a.itinerary_id
         WHERE a.start_time IS NOT NULL
           AND (a.activity_date + a.start_time) > NOW()
           AND (a.activity_date + a.start_time) <= NOW() + INTERVAL '24 hours'
           ${access}`,
        [userUid]
    );
    activities.forEach((row) => {
        const reminder = buildReminder({
            kind: 'activity',
            name: row.title,
            when: eventMoment(row.activity_date, row.start_time),
            recordId: row.activity_id,
            itineraryId: row.itinerary_id,
            now,
        });
        if (reminder) reminders.push(reminder);
    });

    const restaurants = await safeRows(
        'restaurant-reminders',
        `SELECT r.reservation_id, r.itinerary_id, r.reservation_date, r.reservation_time, r.restaurant_name
         FROM core.restaurant r
         JOIN core.itineraries i ON i.itinerary_id = r.itinerary_id
         WHERE r.reservation_time IS NOT NULL
           AND (r.reservation_date + r.reservation_time) > NOW()
           AND (r.reservation_date + r.reservation_time) <= NOW() + INTERVAL '24 hours'
           ${access}`,
        [userUid]
    );
    restaurants.forEach((row) => {
        const reminder = buildReminder({
            kind: 'restaurant',
            name: row.restaurant_name,
            when: eventMoment(row.reservation_date, row.reservation_time),
            recordId: row.reservation_id,
            itineraryId: row.itinerary_id,
            now,
        });
        if (reminder) reminders.push(reminder);
    });

    return reminders;
}

async function collectPracticalAlerts(userUid) {
    const now = new Date();
    const alerts = [];
    const access = `
        AND (
            i.owner_id = $1
            OR EXISTS (
                SELECT 1 FROM core.shared sh
                WHERE sh.itinerary_id = i.itinerary_id AND sh.guest_id = $1
            )
        )
    `;

    const trips = await safeRows(
        'trip-countdown',
        `SELECT i.itinerary_id, i.title, i.start_date
         FROM core.itineraries i
         WHERE i.start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
           ${access}`,
        [userUid]
    );
    trips.forEach((row) => {
        const countdown = buildTripCountdown({
            title: row.title,
            startDate: row.start_date,
            itineraryId: row.itinerary_id,
            now,
        });
        if (countdown) alerts.push(countdown);
    });

    const payments = await safeRows(
        'payments',
        `SELECT p.payment_id, p.itinerary_id, p.amount, p.created_at, i.title AS trip_title,
                u.first_name, u.last_name
         FROM core.expense_payments p
         JOIN core.itineraries i ON i.itinerary_id = p.itinerary_id
         LEFT JOIN core.users u ON u.uid = p.from_uid
         WHERE p.to_uid = $1
           AND p.from_uid <> $1
           AND p.created_at > NOW() - INTERVAL '30 days'
         ORDER BY p.created_at DESC
         LIMIT 8`,
        [userUid]
    );
    payments.forEach((row) => {
        const trip = titleCase(row.trip_title) || 'a shared trip';
        alerts.push({
            category: 'expense',
            event_type: 'expense',
            title: 'Payment received',
            body: `${personName(row)} paid you ${money(row.amount)} on ${trip}.`,
            itinerary_id: row.itinerary_id,
            source_key: `payment:${row.payment_id}`,
            created_at: stamp(row.created_at),
        });
    });

    const friends = await safeRows(
        'balance-friends',
        `SELECT u.uid, u.first_name, u.last_name
         FROM core.friends f
         JOIN core.users u ON u.uid = f.uid_2
         WHERE f.uid_1 = $1
         UNION
         SELECT u.uid, u.first_name, u.last_name
         FROM core.friends f
         JOIN core.users u ON u.uid = f.uid_1
         WHERE f.uid_2 = $1`,
        [userUid]
    );
    if (!friends.length) return alerts;

    const friendIds = friends.map((friend) => friend.uid);
    const sharedTrips = await safeRows(
        'balance-trips',
        `WITH mine AS (
            SELECT itinerary_id FROM core.itineraries WHERE owner_id = $1
            UNION
            SELECT itinerary_id FROM core.shared WHERE guest_id = $1
         )
         SELECT DISTINCT member.uid AS friend_uid, i.itinerary_id
         FROM (
            SELECT itinerary_id, owner_id AS uid FROM core.itineraries
            UNION ALL
            SELECT itinerary_id, guest_id AS uid FROM core.shared
         ) member
         JOIN mine ON mine.itinerary_id = member.itinerary_id
         JOIN core.itineraries i ON i.itinerary_id = member.itinerary_id
         WHERE member.uid = ANY($2::text[])`,
        [userUid, friendIds]
    );
    const itineraryIds = [...new Set(sharedTrips.map((row) => row.itinerary_id))];
    if (!itineraryIds.length) return alerts;

    const expenses = await safeRows(
        'balance-expenses',
        `SELECT expense_id, itinerary_id, COALESCE(paid_by, created_by) AS payer
         FROM core.expenses
         WHERE itinerary_id = ANY($1::int[])`,
        [itineraryIds]
    );
    const shares = await safeRows(
        'balance-shares',
        `SELECT s.expense_id, s.user_uid, s.amount
         FROM core.expense_shares s
         JOIN core.expenses e ON e.expense_id = s.expense_id
         WHERE e.itinerary_id = ANY($1::int[])`,
        [itineraryIds]
    );
    const settlement = await safeRows(
        'balance-payments',
        `SELECT itinerary_id, from_uid, to_uid, amount
         FROM core.expense_payments
         WHERE itinerary_id = ANY($1::int[])
           AND (from_uid = $2 OR to_uid = $2)`,
        [itineraryIds, userUid]
    );

    const friendsOnTrip = {};
    sharedTrips.forEach((row) => {
        if (!friendsOnTrip[row.itinerary_id]) friendsOnTrip[row.itinerary_id] = [];
        if (!friendsOnTrip[row.itinerary_id].includes(row.friend_uid)) {
            friendsOnTrip[row.itinerary_id].push(row.friend_uid);
        }
    });
    const balanceByFriend = {};
    friendIds.forEach((id) => {
        balanceByFriend[id] = 0;
    });
    expenses.forEach((expense) => {
        (friendsOnTrip[expense.itinerary_id] || []).forEach((friendUid) => {
            const friendShare = shares.find((share) => share.expense_id === expense.expense_id && share.user_uid === friendUid);
            const myShare = shares.find((share) => share.expense_id === expense.expense_id && share.user_uid === userUid);
            if (expense.payer === userUid && friendShare) balanceByFriend[friendUid] += Number(friendShare.amount);
            if (expense.payer === friendUid && myShare) balanceByFriend[friendUid] -= Number(myShare.amount);
        });
    });
    settlement.forEach((payment) => {
        (friendsOnTrip[payment.itinerary_id] || []).forEach((friendUid) => {
            if (payment.from_uid === friendUid && payment.to_uid === userUid) {
                balanceByFriend[friendUid] -= Number(payment.amount);
            }
            if (payment.from_uid === userUid && payment.to_uid === friendUid) {
                balanceByFriend[friendUid] += Number(payment.amount);
            }
        });
    });

    friends.forEach((friend) => {
        const balance = Math.round((balanceByFriend[friend.uid] || 0) * 100) / 100;
        if (Math.abs(balance) < 0.5) return;
        const name = personName(friend);
        const amount = money(Math.abs(balance));
        alerts.push({
            category: 'expense',
            event_type: 'expense',
            title: balance > 0 ? 'You are owed money' : 'Balance due',
            body: balance > 0
                ? `${name} owes you ${amount} from shared expenses.`
                : `You owe ${name} ${amount} from shared expenses.`,
            source_key: `balance:${friend.uid}`,
            created_at: now,
            refresh: 'body',
        });
    });

    return alerts;
}

async function collectEvents(userUid) {
    const events = [];

    const invites = await safeRows(
        'invites',
        `SELECT inv.id AS invitation_id, inv.itinerary_id, inv.invited_at,
                it.title AS trip_title, u.first_name, u.last_name
         FROM core.invitations inv
         JOIN core.itineraries it ON it.itinerary_id = inv.itinerary_id
         JOIN core.users u ON u.uid = inv.inviter_id
         WHERE inv.invitee_id = $1 AND inv.status = 'pending'`,
        [userUid]
    );
    invites.forEach((row) => {
        const trip = titleCase(row.trip_title) || 'a trip';
        events.push({
            category: 'social',
            event_type: 'invite',
            title: 'Trip invite',
            body: `${personName(row)} invited you to collaborate on ${trip}.`,
            itinerary_id: row.itinerary_id,
            invitation_id: row.invitation_id,
            source_key: `invite:${row.invitation_id}`,
            created_at: stamp(row.invited_at),
        });
    });

    const friends = await safeRows(
        'friends',
        `SELECT r.request_id, r.created_at, u.first_name, u.last_name
         FROM core.friend_requests r
         JOIN core.users u ON u.uid = r.requester_id
         WHERE r.requestee_id = $1 AND r.status = 'pending'`,
        [userUid]
    );
    friends.forEach((row) => {
        events.push({
            category: 'social',
            event_type: 'friend',
            title: 'Friend request',
            body: `${personName(row)} wants to connect with you.`,
            friend_request_id: row.request_id,
            source_key: `friend:${row.request_id}`,
            created_at: stamp(row.created_at),
        });
    });

    const expenses = await safeRows(
        'expenses',
        `SELECT e.expense_id, e.itinerary_id, e.title, e.description, e.amount, e.expense_date,
                i.title AS trip_title, s.amount AS share_amount, u.first_name, u.last_name
         FROM core.expenses e
         JOIN core.itineraries i ON i.itinerary_id = e.itinerary_id
         JOIN core.expense_shares s ON s.expense_id = e.expense_id AND s.user_uid = $1
         LEFT JOIN core.users u ON u.uid = COALESCE(e.created_by, e.paid_by)
         WHERE (
            i.owner_id = $1
            OR EXISTS (SELECT 1 FROM core.shared sh WHERE sh.itinerary_id = i.itinerary_id AND sh.guest_id = $1)
         )
           AND COALESCE(e.created_by, e.paid_by) IS NOT NULL
           AND COALESCE(e.created_by, e.paid_by) <> $1
         ORDER BY e.expense_id DESC
         LIMIT 20`,
        [userUid]
    );
    expenses.forEach((row) => {
        const trip = titleCase(row.trip_title) || 'a trip';
        const expenseTitle = titleCase(row.title || row.description) || 'an expense';
        const share = money(row.share_amount);
        events.push({
            category: 'expense',
            event_type: 'expense',
            title: 'Expense split',
            body: `${personName(row)} added ${money(row.amount) || 'an expense'} for ${expenseTitle} on ${trip}.${share ? ` Your share is ${share}.` : ''}`,
            itinerary_id: row.itinerary_id,
            expense_id: row.expense_id,
            source_key: `expense:${row.expense_id}`,
            created_at: stamp(row.expense_date),
        });
    });

    const bookingSources = [
        {
            label: 'flights',
            event_type: 'flight',
            title: 'New flight',
            sql: `SELECT f.flight_id AS record_id, f.itinerary_id, f.departure_time AS happened_at,
                         i.title AS trip_title, u.first_name, u.last_name,
                         f.airline, f.flight_number, f.departure_airport, f.arrival_airport
                  FROM core.flights f
                  JOIN core.itineraries i ON i.itinerary_id = f.itinerary_id
                  LEFT JOIN core.users u ON u.uid = f.owner_id
                  WHERE f.owner_id IS NOT NULL AND f.owner_id <> $1
                    AND (
                        i.owner_id = $1
                        OR EXISTS (SELECT 1 FROM core.shared sh WHERE sh.itinerary_id = i.itinerary_id AND sh.guest_id = $1)
                    )
                  ORDER BY f.flight_id DESC
                  LIMIT 12`,
            detail: (row) => {
                const route = [row.departure_airport, row.arrival_airport].filter(Boolean).join(' to ');
                const flight = [row.airline, row.flight_number].filter(Boolean).join(' ');
                return [flight, route].filter(Boolean).join(', ');
            },
        },
        {
            label: 'hotels',
            event_type: 'hotel',
            title: 'New hotel',
            sql: `SELECT h.hotel_id AS record_id, h.itinerary_id, h.check_in_date AS happened_at,
                         i.title AS trip_title, u.first_name, u.last_name, h.hotel_name
                  FROM core.hotels h
                  JOIN core.itineraries i ON i.itinerary_id = h.itinerary_id
                  LEFT JOIN core.users u ON u.uid = i.owner_id
                  WHERE i.owner_id <> $1
                    AND EXISTS (SELECT 1 FROM core.shared sh WHERE sh.itinerary_id = i.itinerary_id AND sh.guest_id = $1)
                  ORDER BY h.hotel_id DESC
                  LIMIT 12`,
            detail: (row) => row.hotel_name || '',
        },
        {
            label: 'activities',
            event_type: 'activity',
            title: 'New activity',
            sql: `SELECT a.activity_id AS record_id, a.itinerary_id, a.activity_date AS happened_at,
                         i.title AS trip_title, u.first_name, u.last_name, a.title AS item_title
                  FROM core.activities a
                  JOIN core.itineraries i ON i.itinerary_id = a.itinerary_id
                  LEFT JOIN core.users u ON u.uid = a.owner_id
                  WHERE a.owner_id IS NOT NULL AND a.owner_id <> $1
                    AND (
                        i.owner_id = $1
                        OR EXISTS (SELECT 1 FROM core.shared sh WHERE sh.itinerary_id = i.itinerary_id AND sh.guest_id = $1)
                    )
                  ORDER BY a.activity_id DESC
                  LIMIT 12`,
            detail: (row) => row.item_title || '',
        },
        {
            label: 'restaurants',
            event_type: 'restaurant',
            title: 'New restaurant',
            sql: `SELECT r.reservation_id AS record_id, r.itinerary_id, r.reservation_date AS happened_at,
                         i.title AS trip_title, u.first_name, u.last_name, r.restaurant_name
                  FROM core.restaurant r
                  JOIN core.itineraries i ON i.itinerary_id = r.itinerary_id
                  LEFT JOIN core.users u ON u.uid = r.owner_id
                  WHERE r.owner_id IS NOT NULL AND r.owner_id <> $1
                    AND (
                        i.owner_id = $1
                        OR EXISTS (SELECT 1 FROM core.shared sh WHERE sh.itinerary_id = i.itinerary_id AND sh.guest_id = $1)
                    )
                  ORDER BY r.reservation_id DESC
                  LIMIT 12`,
            detail: (row) => row.restaurant_name || '',
        },
    ];

    for (const source of bookingSources) {
        const rows = await safeRows(source.label, source.sql, [userUid]);
        rows.forEach((row) => {
            const trip = titleCase(row.trip_title) || 'a trip';
            const detail = titleCase(source.detail(row));
            events.push({
                category: 'booking',
                event_type: source.event_type,
                title: source.title,
                body: `${personName(row)} added ${detail || source.title.replace('New ', 'a ')} to ${trip}.`,
                itinerary_id: row.itinerary_id,
                source_key: `${source.event_type}:${row.record_id}`,
                created_at: stamp(row.happened_at),
            });
        });
    }

    const reminders = await collectReminders(userUid);
    reminders.forEach((reminder) => events.push(reminder));
    const practical = await collectPracticalAlerts(userUid);
    practical.forEach((alert) => events.push(alert));

    return events.map((event) => ({
        user_uid: userUid,
        category: event.category,
        event_type: event.event_type,
        title: event.title,
        body: event.body,
        itinerary_id: event.itinerary_id || null,
        expense_id: event.expense_id || null,
        invitation_id: event.invitation_id || null,
        friend_request_id: event.friend_request_id || null,
        source_key: event.source_key,
        created_at: event.created_at,
        refresh: event.refresh || null,
    }));
}

async function rememberEvents(userUid, events) {
    const plain = events.filter((event) => !event.refresh);
    const titleRefresh = events.filter((event) => event.refresh === 'title');
    const bodyRefresh = events.filter((event) => event.refresh === 'body');
    await insertEvents(plain, 'NOTHING');
    await insertEvents(titleRefresh, 'TITLE');
    await insertEvents(bodyRefresh, 'BODY');

    const socialKeys = events.filter((event) => event.category === 'social').map((event) => event.source_key);
    await pool.query(
        `UPDATE core.notifications
         SET dismissed_at = COALESCE(dismissed_at, NOW())
         WHERE user_uid = $1
           AND category = 'social'
           AND deleted_at IS NULL
           AND NOT (source_key = ANY($2::text[]))`,
        [userUid, socialKeys]
    );
    await dismissStale(userUid, 'trip-countdown:%', titleRefresh.map((event) => event.source_key));
    await dismissStale(userUid, 'balance:%', bodyRefresh.map((event) => event.source_key));
}

async function insertEvents(events, mode) {
    if (!events.length) return;
    const values = [];
    const placeholders = events.map((event, index) => {
        const base = index * 11;
        values.push(
            event.user_uid,
            event.category,
            event.event_type,
            event.title,
            event.body,
            event.itinerary_id,
            event.expense_id,
            event.invitation_id,
            event.friend_request_id,
            event.source_key,
            event.created_at
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`;
    });
    const conflict = mode === 'TITLE'
        ? `ON CONFLICT (user_uid, source_key) DO UPDATE SET
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            itinerary_id = EXCLUDED.itinerary_id,
            created_at = CASE WHEN core.notifications.title IS DISTINCT FROM EXCLUDED.title THEN EXCLUDED.created_at ELSE core.notifications.created_at END,
            read_at = CASE WHEN core.notifications.title IS DISTINCT FROM EXCLUDED.title THEN NULL ELSE core.notifications.read_at END,
            dismissed_at = CASE WHEN core.notifications.title IS DISTINCT FROM EXCLUDED.title THEN NULL ELSE core.notifications.dismissed_at END,
            deleted_at = CASE WHEN core.notifications.title IS DISTINCT FROM EXCLUDED.title THEN NULL ELSE core.notifications.deleted_at END`
        : mode === 'BODY'
            ? `ON CONFLICT (user_uid, source_key) DO UPDATE SET
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            itinerary_id = EXCLUDED.itinerary_id,
            created_at = CASE WHEN core.notifications.body IS DISTINCT FROM EXCLUDED.body THEN EXCLUDED.created_at ELSE core.notifications.created_at END,
            read_at = CASE WHEN core.notifications.body IS DISTINCT FROM EXCLUDED.body THEN NULL ELSE core.notifications.read_at END,
            dismissed_at = CASE WHEN core.notifications.body IS DISTINCT FROM EXCLUDED.body THEN NULL ELSE core.notifications.dismissed_at END,
            deleted_at = CASE WHEN core.notifications.body IS DISTINCT FROM EXCLUDED.body THEN NULL ELSE core.notifications.deleted_at END`
            : 'ON CONFLICT (user_uid, source_key) DO NOTHING';
    await pool.query(
        `INSERT INTO core.notifications
            (user_uid, category, event_type, title, body, itinerary_id, expense_id, invitation_id, friend_request_id, source_key, created_at)
         VALUES ${placeholders.join(', ')}
         ${conflict}`,
        values
    );
}

async function dismissStale(userUid, likePattern, keys) {
    await pool.query(
        `UPDATE core.notifications
         SET dismissed_at = COALESCE(dismissed_at, NOW())
         WHERE user_uid = $1
           AND deleted_at IS NULL
           AND source_key LIKE $2
           AND NOT (source_key = ANY($3::text[]))`,
        [userUid, likePattern, keys]
    );
}

async function listNotifications(userUid) {
    await ensureNotificationTables();
    const events = await collectEvents(userUid);
    await rememberEvents(userUid, events);
    const { rows } = await pool.query(
        `SELECT n.*, i.title AS trip_title
         FROM core.notifications n
         LEFT JOIN core.itineraries i ON i.itinerary_id = n.itinerary_id
         WHERE n.user_uid = $1 AND n.dismissed_at IS NULL AND n.deleted_at IS NULL
         ORDER BY n.created_at DESC, n.notification_id DESC`,
        [userUid]
    );
    const notifications = rows.map(present);
    return {
        notifications,
        unread: notifications.filter((item) => !item.read).length,
        total: notifications.length,
    };
}

module.exports = { listNotifications };
