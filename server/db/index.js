const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: false }, // SSL also needed for Render external DB locally
});

// Supabase installs PostGIS in the 'tiger' schema — include it in search_path
// so geography/geometry types and functions (ST_DWithin, etc.) resolve correctly.
pool.on('connect', (client) => {
  client.query("SET search_path TO public, tiger, extensions;").catch(() => {});
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
