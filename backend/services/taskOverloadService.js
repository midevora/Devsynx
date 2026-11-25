const WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3,
};

const DEFAULT_CAPACITY = 10;

function analyzeWorkload(payload = {}) {
  const activeTasks = payload.active_tasks || [];
  const newComplexity = String(payload.new_complexity || 'medium').toLowerCase();
  const capacity = Number.parseInt(payload.capacity, 10) || DEFAULT_CAPACITY;

  let currentPoints = 0;
  const breakdown = { low: 0, medium: 0, high: 0 };

  for (const task of activeTasks) {
    const complexity = String(task.complexity || 'medium').toLowerCase();
    const points = WEIGHTS[complexity] ?? WEIGHTS.medium;
    currentPoints += points;
    if (Object.prototype.hasOwnProperty.call(breakdown, complexity)) {
      breakdown[complexity] += 1;
    }
  }

  const newTaskPoints = WEIGHTS[newComplexity] ?? WEIGHTS.medium;
  const projectedPoints = currentPoints + newTaskPoints;
  const remainingCapacity = capacity - currentPoints;

  return {
    capacity,
    current_points: currentPoints,
    new_task_points: newTaskPoints,
    projected_points: projectedPoints,
    remaining_capacity: remainingCapacity,
    active_task_count: activeTasks.length,
    breakdown,
    new_complexity: newComplexity,
    overloaded: projectedPoints > capacity,
  };
}

async function getDeveloperLoadSummary(connection, developerId) {
  const [activeTasks] = await connection.query(
    `SELECT complexity
     FROM ds_tasks
     WHERE developer_id = ? AND status IN ('pending', 'in_progress')`,
    [developerId]
  );

  const assessment = analyzeWorkload({
    active_tasks: activeTasks,
    new_complexity: 'low',
    capacity: DEFAULT_CAPACITY,
  });

  return {
    ...assessment,
    overloaded: assessment.current_points >= assessment.capacity,
  };
}

async function assessDeveloperLoad(connection, developerId, newComplexity) {
  const [activeTasks] = await connection.query(
    `SELECT complexity
     FROM ds_tasks
     WHERE developer_id = ? AND status IN ('pending', 'in_progress')`,
    [developerId]
  );

  return analyzeWorkload({
    active_tasks: activeTasks,
    new_complexity: newComplexity,
    capacity: DEFAULT_CAPACITY,
  });
}

module.exports = {
  assessDeveloperLoad,
  getDeveloperLoadSummary,
  analyzeWorkload,
};
