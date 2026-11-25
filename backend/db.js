const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
// Vercel / Neon inject DATABASE_URL; keep local .env as fallback
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString && !process.env.DB_HOST) {
  console.warn(
    '⚠️ No DATABASE_URL / DB_HOST set. Set Vercel Postgres DATABASE_URL for production.'
  );
}

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 10,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'devsynx_db_main',
      port: Number(process.env.DB_PORT || 5432),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });

pool.on('error', (err) => {
  console.error('❌ Unexpected Postgres pool error:', err.message);
});

function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function normalizeSql(sql) {
  let text = sql.trim();

  // MySQL no-ops on Postgres
  if (/^\s*SET\s+FOREIGN_KEY_CHECKS\s*=/i.test(text)) {
    return { skip: true };
  }

  // MySQL INSERT IGNORE → Postgres ON CONFLICT DO NOTHING
  if (/^\s*INSERT\s+IGNORE\s+/i.test(text)) {
    text = text.replace(/^\s*INSERT\s+IGNORE\s+/i, 'INSERT ');
    if (!/\bON CONFLICT\b/i.test(text)) {
      text = text.replace(/;?\s*$/, '') + ' ON CONFLICT DO NOTHING';
    }
  }

  // MySQL ON DUPLICATE KEY → Postgres ON CONFLICT (best-effort for simple cases)
  text = text.replace(
    /ON DUPLICATE KEY UPDATE\s+id\s*=\s*id/gi,
    'ON CONFLICT DO NOTHING'
  );

  // Auto-append RETURNING id for plain INSERTs so mysql2-style insertId works
  if (
    /^\s*INSERT\s+/i.test(text) &&
    !/\bRETURNING\b/i.test(text) &&
    !/\bON CONFLICT\s+DO\s+NOTHING\b/i.test(text)
  ) {
    text = text.replace(/;?\s*$/, '') + ' RETURNING id';
  }

  return { text: convertPlaceholders(text) };
}

function expandBulkValues(sql, params) {
  // mysql2: INSERT ... VALUES ? with params = [[[a,b],[c,d]]]
  if (
    Array.isArray(params) &&
    params.length === 1 &&
    Array.isArray(params[0]) &&
    Array.isArray(params[0][0]) &&
    /\bVALUES\s+\?/i.test(sql)
  ) {
    const rows = params[0];
    const colCount = rows[0].length;
    const flat = [];
    const placeholders = rows
      .map((row) => {
        const ph = row
          .map((val) => {
            flat.push(val);
            return '?';
          })
          .join(', ');
        return `(${ph})`;
      })
      .join(', ');
    return {
      sql: sql.replace(/\bVALUES\s+\?/i, `VALUES ${placeholders}`),
      params: flat,
      colCount,
    };
  }
  return { sql, params };
}

async function runQuery(client, sql, params = []) {
  const expanded = expandBulkValues(sql, params || []);
  const normalized = normalizeSql(expanded.sql);
  if (normalized.skip) {
    return [{ affectedRows: 0, insertId: 0 }, null];
  }

  const result = await client.query(normalized.text, expanded.params);

  if (['INSERT', 'UPDATE', 'DELETE'].includes(result.command)) {
    const header = {
      insertId: result.rows[0]?.id ?? 0,
      affectedRows: result.rowCount || 0,
      rowCount: result.rowCount || 0,
    };
    return [header, null];
  }

  return [result.rows, null];
}

function wrapClient(client) {
  return {
    query: (sql, params) => runQuery(client, sql, params),
    release: () => client.release(),
    beginTransaction: async () => {
      await client.query('BEGIN');
    },
    commit: async () => {
      await client.query('COMMIT');
    },
    rollback: async () => {
      await client.query('ROLLBACK');
    },
  };
}

const db = {
  promise() {
    return {
      getConnection: async () => wrapClient(await pool.connect()),
      query: async (sql, params) => runQuery(pool, sql, params),
    };
  },
  query: (sql, params, cb) => {
    // Rare callback-style usage
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    runQuery(pool, sql, params)
      .then((result) => cb(null, ...result))
      .catch((err) => cb(err));
  },
  end: () => pool.end(),
};

async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ds_developers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS ds_projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE,
        expected_delivery_date DATE,
        github_org VARCHAR(255),
        github_repo VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS ds_teams (
        id SERIAL PRIMARY KEY,
        team_name VARCHAR(255) NOT NULL,
        project_id INT NOT NULL REFERENCES ds_projects(id),
        team_head_id INT NOT NULL REFERENCES ds_developers(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ds_team_assignments (
        id SERIAL PRIMARY KEY,
        team_id INT NOT NULL REFERENCES ds_teams(id),
        developer_id INT NOT NULL REFERENCES ds_developers(id),
        assigned_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ds_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        developer_id INT REFERENCES ds_developers(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ds_roles (
        id SERIAL PRIMARY KEY,
        developer_id INT NOT NULL UNIQUE REFERENCES ds_developers(id),
        role_type VARCHAR(50) NOT NULL,
        assigned_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ds_tasks (
        id SERIAL PRIMARY KEY,
        team_id INT NOT NULL REFERENCES ds_teams(id),
        developer_id INT NOT NULL REFERENCES ds_developers(id),
        task_name VARCHAR(255) NOT NULL,
        description TEXT,
        complexity VARCHAR(20) NOT NULL,
        status VARCHAR(30) DEFAULT 'pending',
        assigned_by INT NOT NULL REFERENCES ds_developers(id),
        github_file_path TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ds_client_projects (
        id SERIAL PRIMARY KEY,
        client_email VARCHAR(255) NOT NULL,
        project_id INT NOT NULL REFERENCES ds_projects(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (client_email, project_id)
      );

      CREATE TABLE IF NOT EXISTS ds_github_settings (
        id INT PRIMARY KEY DEFAULT 1,
        github_org VARCHAR(255),
        github_repo VARCHAR(255),
        github_token TEXT,
        updated_by VARCHAR(255),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Optional columns used by GitHub verification (ignore if already present)
    const optionalCols = [
      ['ds_tasks', 'github_file_path', 'TEXT'],
      ['ds_tasks', 'github_verified_at', 'TIMESTAMPTZ'],
      ['ds_tasks', 'github_verify_score', 'NUMERIC'],
      ['ds_projects', 'github_org', 'VARCHAR(255)'],
      ['ds_projects', 'github_repo', 'VARCHAR(255)'],
      ['ds_projects', 'expected_delivery_date', 'DATE'],
    ];

    for (const [table, column, type] of optionalCols) {
      await client.query(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`
      );
    }

    console.log('✅ Postgres schema ready');
  } catch (err) {
    console.error('❌ Schema bootstrap failed:', err.message);
  } finally {
    client.release();
  }
}

async function ensureBootstrapManager() {
  const email = process.env.BOOTSTRAP_MANAGER_EMAIL;
  const password = process.env.BOOTSTRAP_MANAGER_PASSWORD;
  const name = process.env.BOOTSTRAP_MANAGER_NAME || 'Manager';
  if (!email || !password) return;

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM ds_users WHERE email = $1', [email]);
    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO ds_users (email, password, name, role) VALUES ($1, $2, $3, 'manager')`,
        [email, password, name]
      );
      console.log('✅ Bootstrap manager user created');
    }
  } catch (err) {
    console.warn('⚠️ Manager bootstrap skipped:', err.message);
  } finally {
    client.release();
  }
}

pool
  .query('SELECT 1')
  .then(async () => {
    console.log('✅ Database connected successfully!');
    await ensureSchema();
    await ensureBootstrapManager();
  })
  .catch((err) => {
    console.error('❌ Cannot connect to database:', err.message);
    console.error('   Expect DATABASE_URL (Vercel Postgres / Neon) in production.');
  });

module.exports = db;
