/**
 * Upsert the classic DevSynx manager account.
 * Usage (with Vercel prod env): npx vercel env run -e production -- node backend/seed-manager.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { Pool } = require('pg');

const email = process.env.SEED_MANAGER_EMAIL || 'manager@devsynx.com';
const password = process.env.SEED_MANAGER_PASSWORD || 'manager123';
const name = process.env.SEED_MANAGER_NAME || 'DevSynx Manager';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ds_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        developer_id INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const existing = await pool.query('SELECT id, email, role FROM ds_users WHERE email = $1', [
      email,
    ]);

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE ds_users SET password = $1, name = $2, role = 'manager' WHERE email = $3`,
        [password, name, email]
      );
      console.log(`Updated manager: ${email}`);
    } else {
      await pool.query(
        `INSERT INTO ds_users (email, password, name, role) VALUES ($1, $2, $3, 'manager')`,
        [email, password, name]
      );
      console.log(`Created manager: ${email}`);
    }

    const check = await pool.query(
      `SELECT id, email, name, role FROM ds_users WHERE email = $1`,
      [email]
    );
    console.log(check.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
