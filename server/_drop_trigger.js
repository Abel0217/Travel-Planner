const pool = require('./database/db');

(async () => {
  await pool.query('DROP TRIGGER IF EXISTS itinerary_update_trigger ON core.itineraries');
  await pool.query('DROP FUNCTION IF EXISTS sync_share_on_itinerary_update()');
  console.log('Dropped broken itinerary share sync trigger');
  await pool.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
