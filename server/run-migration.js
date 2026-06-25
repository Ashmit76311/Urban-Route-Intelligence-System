require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy server/.env.example to server/.env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected. Enabling PostGIS...');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    const migrationPath = path.join(__dirname, 'db', 'migrations', '001_initial.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.query(sql);
    console.log('Migration applied.');

    const version = await client.query('SELECT PostGIS_Version();');
    console.log('PostGIS version:', version.rows[0].postgis_version);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
