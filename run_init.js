const fs = require('fs');
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://neondb_owner:npg_9kzDiOIVj7YE@ep-rough-haze-an2kuvy5-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runInit() {
  try {
    const sql = fs.readFileSync('init.sql', 'utf8');
    console.log('Connecting to Neon database... progressing init.sql');
    await pool.query(sql);
    console.log('Successfully executed init.sql! Tables and PostGIS configured.');
  } catch (err) {
    console.error('Error executing init.sql:', err.message);
  } finally {
    await pool.end();
  }
}

runInit();
