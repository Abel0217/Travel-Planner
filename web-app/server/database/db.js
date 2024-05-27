const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'TravelPlanner', 
  password: 'Feb17@mbd',
  port: 5432,
});

// Search path (every client connection)
pool.on('connect', (client) => {
  client.query('SET search_path TO core, public');
});

module.exports = pool;
