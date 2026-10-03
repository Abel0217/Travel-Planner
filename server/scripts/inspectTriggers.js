const pool = require('../database/db');

(async () => {
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='core' AND table_name IN ('share','shared')"
  );
  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='core' AND table_name='shared' ORDER BY ordinal_position"
  );
  const triggers = await pool.query(
    "SELECT tgname, pg_get_triggerdef(oid) AS def FROM pg_trigger WHERE tgrelid='core.itineraries'::regclass AND NOT tgisinternal"
  );
  console.log(JSON.stringify({ tables: tables.rows, sharedCols: cols.rows, triggers: triggers.rows }, null, 2));
  await pool.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
