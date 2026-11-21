const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const AI_SCRIPT_PATH = path.join(__dirname, '..', 'ai', 'github_upload_ai.py');

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

const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'C:/Python314/python.exe';

async function addColumnIfMissing(connection, table, column, definition) {
  try {
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }
}

async function ensureGithubSchema(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ds_github_settings (
      id TINYINT PRIMARY KEY,
      github_org VARCHAR(255) NULL,
      github_repo VARCHAR(255) NULL,
      github_token TEXT NULL,
      updated_by VARCHAR(255) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await addColumnIfMissing(connection, 'ds_projects', 'github_org', 'VARCHAR(255) NULL');
  await addColumnIfMissing(connection, 'ds_projects', 'github_repo', 'VARCHAR(255) NULL');
  await addColumnIfMissing(connection, 'ds_tasks', 'github_file_path', 'VARCHAR(500) NULL');
  await addColumnIfMissing(connection, 'ds_tasks', 'github_verified', 'TINYINT(1) NOT NULL DEFAULT 0');
  await addColumnIfMissing(
    connection,
    'ds_tasks',
    'github_check_summary',
    'TEXT NULL'
  );
  await addColumnIfMissing(
    connection,
    'ds_tasks',
    'github_evidence_url',
    'VARCHAR(500) NULL'
  );
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
     ON DUPLICATE KEY UPDATE
       github_org = VALUES(github_org),
       github_repo = VALUES(github_repo),
       github_token = COALESCE(NULLIF(VALUES(github_token), ''), github_token),
       updated_by = VALUES(updated_by)`,
    [githubOrg || null, githubRepo || null, githubToken || '', updatedBy || null]
  );
  return getGithubSettings(connection);
}

function runGithubUploadAgent(payload) {
  const result = spawnSync(PYTHON_EXECUTABLE, [AI_SCRIPT_PATH], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 120000,
    env: {
      ...process.env
    }
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stdout || result.stderr || 'GitHub upload agent failed');
  }

  try {
    return JSON.parse(result.stdout.trim());
  } catch (error) {
    throw new Error('GitHub upload agent returned invalid JSON');
  }
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

  const assessment = runGithubUploadAgent({
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
