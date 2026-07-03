require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const navigateRouter = require('./routes/navigate');
const geocodeRouter = require('./routes/geocode');
const riskRouter = require('./routes/risk');
const incidentRouter = require('./routes/incidents');
const helmet = require('helmet');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }
    // Vite picks the next free port when 5173 is taken
    if (/^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());

app.use('/api', navigateRouter);
app.use('/api', geocodeRouter);
app.use('/api', riskRouter);
app.use('/api', incidentRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// Automatic database migration on startup
async function runStartupMigration() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️ No DATABASE_URL environment variable found. Skipping database migration.");
    return;
  }
  
  console.log("🚀 Starting automatic startup migration...");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for external connections to Render DBs
  });

  try {
    await client.connect();
    
    // 1. Enable PostGIS
    await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    console.log("✅ PostGIS extension checked/enabled.");
    
    // 2. Read and run migration file
    const migrationPath1 = path.join(__dirname, 'db', 'migrations', '001_initial.sql');
    if (fs.existsSync(migrationPath1)) {
      const sql = fs.readFileSync(migrationPath1, 'utf8');
      await client.query(sql);
    }
    const migrationPath2 = path.join(__dirname, 'db', 'migrations', '002_add_baseline.sql');
    if (fs.existsSync(migrationPath2)) {
      const sql = fs.readFileSync(migrationPath2, 'utf8');
      await client.query(sql);
    }
    console.log("✅ Database schema migrations successfully applied!");
  } catch (err) {
    console.error("❌ Startup migration failed:", err.message);
  } finally {
    await client.end();
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Server on port ${PORT}`);
  // Run the migration as soon as the port opens
  await runStartupMigration();
});