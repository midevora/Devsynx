const fs = require('fs');
const path = require('path');
const { analyzeUpload } = require('../ai/githubUploadAgent');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

async function addColumnIfMissing(connection, table, column, definition) {
  try {
    await connection.query(
      `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`
    );
  } catch (error) {
    // Column may already exist on older Postgres / race during cold start
    if (!/already exists/i.test(error.message || '')) {
      throw error;
    }
  }
}

async function ensureGithubSchema(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ds_github_settings (
      id INT PRIMARY KEY DEFAULT 1,
      github_org VARCHAR(255) NULL,
      github_repo VARCHAR(255) NULL,
      github_token TEXT NULL,
      updated_by VARCHAR(255) NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await addColumnIfMissing(connection, 'ds_projects', 'github_org', 'VARCHAR(255)');
  await addColumnIfMissing(connection, 'ds_projects', 'github_repo', 'VARCHAR(255)');
  await addColumnIfMissing(connection, 'ds_tasks', 'github_file_path', 'VARCHAR(500)');
  await addColumnIfMissing(connection, 'ds_tasks', 'github_verified', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await addColumnIfMissing(connection, 'ds_tasks', 'github_check_summary', 'TEXT');
  await addColumnIfMissing(connection, 'ds_tasks', 'github_evidence_url', 'VARCHAR(500)');
}

async function getGithubSettings(connection) {
  await ensureGithubSchema(connection);
  const [rows] = await connection.query(
    'SELECT github_org, github_repo, github_token, updated_by, updated_at FROM ds_github_settings WHERE id = 1 LIMIT 1'
  );
  return rows[0] || null;
}

async function saveGithubSettings(connection, { githubOrg, githubRepo, githubToken, updatedBy }) {
  await ensureGithubSchema(connection);
  await connection.query(
    `INSERT INTO ds_github_settings (id, github_org, github_repo, github_token, updated_by)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       github_org = EXCLUDED.github_org,
       github_repo = EXCLUDED.github_repo,
       github_token = COALESCE(NULLIF(EXCLUDED.github_token, ''), ds_github_settings.github_token),
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [githubOrg || null, githubRepo || null, githubToken || '', updatedBy || null]
  );
  return getGithubSettings(connection);
}

async function runGithubUploadAgent(payload) {
  return analyzeUpload(payload);
}

async function getTaskGithubContext(connection, taskId) {
  const [rows] = await connection.query(
    `SELECT t.id, t.task_name, t.description, t.status,
            d.name AS developer_name, d.email AS developer_email,
            t.github_file_path,
            p.name AS project_name, p.github_org, p.github_repo
     FROM ds_tasks t
     INNER JOIN ds_developers d ON t.developer_id = d.id
     INNER JOIN ds_teams tm ON t.team_id = tm.id
     LEFT JOIN ds_projects p ON tm.project_id = p.id
     WHERE t.id = ?
     LIMIT 1`,
    [taskId]
  );

  return rows[0] || null;
}

async function verifyTaskUploadedToGithub(connection, taskId) {
  await ensureGithubSchema(connection);

  const task = await getTaskGithubContext(connection, taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const settings = await getGithubSettings(connection);
  if ((settings?.github_org || settings?.github_repo) && !task.github_file_path) {
    const assessment = {
      uploaded: false,
      confidence: 0,
      reason: 'This task must include the exact GitHub file path before it can be verified.',
      error_type: 'file_path_required',
      github_org: settings.github_org,
      github_repo: settings.github_repo,
      matches: [],
      evidence_url: null,
      api_errors: []
    };
    await connection.query(
      `UPDATE ds_tasks
       SET github_verified = 0, github_check_summary = ?, github_evidence_url = NULL
       WHERE id = ?`,
      [assessment.reason, taskId]
    );
    return assessment;
  }

  const assessment = await runGithubUploadAgent({
    task_id: task.id,
    task_name: task.task_name,
    description: task.description || '',
    developer_name: task.developer_name,
    developer_email: task.developer_email,
    project_name: task.project_name,
    github_org: task.github_org || settings?.github_org || process.env.GITHUB_ORG || '',
    github_repo: task.github_repo || settings?.github_repo || process.env.GITHUB_REPO || '',
    github_file_path: task.github_file_path || '',
    github_token: settings?.github_token || process.env.GITHUB_TOKEN || ''
  });

  await connection.query(
    `UPDATE ds_tasks
     SET github_verified = ?, github_check_summary = ?, github_evidence_url = ?
     WHERE id = ?`,
    [
      assessment.uploaded ? 1 : 0,
      assessment.reason,
      assessment.evidence_url || null,
      taskId
    ]
  );

  return assessment;
}

module.exports = {
  ensureGithubSchema,
  getGithubSettings,
  saveGithubSettings,
  verifyTaskUploadedToGithub
};
