const pool = require('./db');

async function ensureExpenseTables() {
  await pool.query(`
    ALTER TABLE core.expenses
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS created_by TEXT,
      ADD COLUMN IF NOT EXISTS split_mode TEXT DEFAULT 'even',
      ADD COLUMN IF NOT EXISTS receipt_name TEXT,
      ADD COLUMN IF NOT EXISTS paid_by TEXT
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS core.expense_shares (
      share_id SERIAL PRIMARY KEY,
      expense_id INTEGER NOT NULL REFERENCES core.expenses(expense_id) ON DELETE CASCADE,
      user_uid TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      UNIQUE (expense_id, user_uid)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS core.expense_payments (
      payment_id SERIAL PRIMARY KEY,
      itinerary_id INTEGER NOT NULL REFERENCES core.itineraries(itinerary_id) ON DELETE CASCADE,
      from_uid TEXT NOT NULL,
      to_uid TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query('DROP TRIGGER IF EXISTS itinerary_update_trigger ON core.itineraries');
  await pool.query('DROP FUNCTION IF EXISTS sync_share_on_itinerary_update()');
}

module.exports = { ensureExpenseTables };
