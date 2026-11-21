const path = require('path');
const { spawnSync } = require('child_process');

const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'C:/Python314/python.exe';
const AI_SCRIPT_PATH = path.join(__dirname, '..', 'ai', 'task_overload_ai.py');

function runLoadAssessment(payload) {
  const result = spawnSync(PYTHON_EXECUTABLE, [AI_SCRIPT_PATH], {
    input: JSON.stringify(payload),
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stdout || result.stderr || 'Failed to evaluate developer workload');
  }

  try {
    return JSON.parse(result.stdout.trim());
  } catch (error) {
    throw new Error('AI workload module returned invalid JSON');
  }
}

async function getDeveloperLoadSummary(connection, developerId) {
  const [activeTasks] = await connection.query(
    `SELECT complexity
     FROM ds_tasks
     WHERE developer_id = ? AND status IN ('pending', 'in_progress')`,
    [developerId]
  );

  const assessment = runLoadAssessment({
    active_tasks: activeTasks,
    new_complexity: 'low',
    capacity: 10
  });

  return {
    ...assessment,
    overloaded: assessment.current_points >= assessment.capacity
  };
}

async function assessDeveloperLoad(connection, developerId, newComplexity) {
  const [activeTasks] = await connection.query(
    `SELECT complexity
     FROM ds_tasks
     WHERE developer_id = ? AND status IN ('pending', 'in_progress')`,
    [developerId]
  );

  const payload = {
    active_tasks: activeTasks,
    new_complexity: newComplexity,
    capacity: 10
  };

  return runLoadAssessment(payload);
}

module.exports = {
  assessDeveloperLoad,
  getDeveloperLoadSummary
};