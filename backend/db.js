const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'devsynx_db_main',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000
});

// Add error event handler
pool.on('error', (err) => {
  console.error('❌ Unexpected connection pool error:', err);
});

// Test connection with retry logic
function testConnectionWithRetry(maxRetries = 5, retryDelay = 1000) {
  console.log('🔄 Testing database connection...');
  
  function attempt(retryCount = 0) {
    pool.getConnection((err, connection) => {
      if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          console.error('❌ Database connection was closed.');
        } else if (err.code === 'ER_CON_COUNT_ERROR') {
          console.error('❌ Database has too many connections.');
        } else if (err.code === 'ER_AUTHENTICATION_PLUGIN_ERROR') {
          console.error('❌ Database authentication failed.');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
          console.error('❌ Database does not exist.');
        } else if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
          console.error('❌ Fatal error. The connection is not usable.');
        } else if (err.code === 'ECONNREFUSED') {
          console.error(`❌ Cannot connect to MySQL (attempt ${retryCount + 1}/${maxRetries}). Is XAMPP/MySQL running on localhost:3306?`);
        } else {
          console.error('❌ Database connection error [' + err.code + ']:', err.message);
        }

        // Retry logic with exponential backoff
        if (retryCount < maxRetries) {
          const nextDelay = retryDelay * Math.pow(2, retryCount);
          console.log(`⏳ Retrying in ${nextDelay / 1000} seconds... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => attempt(retryCount + 1), nextDelay);
        } else {
          console.log('⚠️ Max retries reached. Server will continue and auto-reconnect when requests come in.');
        }
      } else if (connection) {
        connection.release();
        console.log('✅ Database connected successfully!');
      }
    });
  }

  attempt();
}

// Initialize connection test
testConnectionWithRetry();

async function ensureClientProjectAccess() {
  const connection = await pool.promise().getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ds_client_projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_email VARCHAR(255) NOT NULL,
        project_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_client_project (client_email, project_id),
        FOREIGN KEY (project_id) REFERENCES ds_projects(id) ON DELETE CASCADE
      )
    `);

    const [clients] = await connection.query(
      'SELECT id FROM ds_users WHERE email = ? LIMIT 1',
      ['client@devsynx.com']
    );

    if (clients.length === 0) {
      await connection.query(
        'INSERT INTO ds_users (email, password, name, role) VALUES (?, ?, ?, ?)',
        ['client@devsynx.com', 'client123', 'Acme Client', 'client']
      );
    }

    const [projectRows] = await connection.query(
      'SELECT id, name FROM ds_projects WHERE name IN (?, ?)',
      ['E-Commerce Platform', 'AI Dashboard']
    );

    for (const project of projectRows) {
      await connection.query(
        'INSERT IGNORE INTO ds_client_projects (client_email, project_id) VALUES (?, ?)',
        ['client@devsynx.com', project.id]
      );
    }
  } catch (error) {
    console.warn('⚠️ Client project access bootstrap skipped:', error.message);
  } finally {
    connection.release();
  }
}

ensureClientProjectAccess();

async function ensureGithubUploadColumns() {
  const connection = await pool.promise().getConnection();
  try {
    const githubUploadService = require('./services/githubUploadService');
    await githubUploadService.ensureGithubSchema(connection);
  } catch (error) {
    console.warn('⚠️ GitHub upload schema bootstrap skipped:', error.message);
  } finally {
    connection.release();
  }
}

ensureGithubUploadColumns();

module.exports = pool; // MUST export the pool directly