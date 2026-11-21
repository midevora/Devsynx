// Tasks List Component
// Display tasks assigned to team and manage their status

window.TasksList = function({ teamId }) {
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [expandedTask, setExpandedTask] = React.useState(null);

  React.useEffect(() => {
    if (teamId) {
      fetchTasks();
    }
  }, [teamId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await window.TEAMHEAD_API.getTeamTasks(teamId);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await window.TEAMHEAD_API.updateTaskStatus(taskId, newStatus);
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await window.TEAMHEAD_API.deleteTask(taskId);
        setTasks(tasks.filter(t => t.id !== taskId));
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'low': return '#27ae60';
      case 'medium': return '#f39c12';
      case 'high': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#95a5a6';
      case 'in_progress': return '#3498db';
      case 'completed': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'in_progress': return '🔄';
      case 'completed': return '✅';
      default: return '❓';
    }
  };

  const taskStyles = {
    container: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginTop: '20px'
    },
    taskCard: {
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      padding: '15px',
      borderRadius: '6px',
      marginBottom: '10px',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    taskHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    taskTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '8px',
      flex: 1
    },
    taskMeta: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    badge: {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#ffffff'
    },
    select: {
      padding: '5px 8px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '12px',
      cursor: 'pointer'
    },
    button: {
      padding: '5px 10px',
      fontSize: '12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    deleteBtn: {
      backgroundColor: '#e74c3c',
      color: '#ffffff'
    }
  };

  return React.createElement(
    'div',
    { style: taskStyles.container },
    React.createElement('h3', { style: { marginBottom: '15px', color: '#2c3e50' } }, '📋 Team Tasks'),
    loading && React.createElement('p', null, 'Loading tasks...'),
    !loading && tasks.length === 0 && React.createElement('p', { style: { color: '#95a5a6' } }, 'No tasks assigned yet'),
    !loading && tasks.map(task =>
      React.createElement(
        'div',
        { key: task.id, style: taskStyles.taskCard },
        React.createElement(
          'div',
          { style: taskStyles.taskHeader },
          React.createElement(
            'div',
            { style: { flex: 1 } },
            React.createElement('div', { style: taskStyles.taskTitle }, task.task_name),
            React.createElement(
              'div',
              { style: { fontSize: '13px', color: '#7f8c8d', marginBottom: '10px' } },
              `Assigned to: ${task.assigned_to}`
            ),
            task.description && React.createElement(
              'div',
              { style: { fontSize: '13px', color: '#555', marginBottom: '10px' } },
              task.description
            ),
            React.createElement(
              'div',
              { style: taskStyles.taskMeta },
              React.createElement(
                'div',
                {
                  style: {
                    ...taskStyles.badge,
                    backgroundColor: getComplexityColor(task.complexity)
                  }
                },
                task.complexity === 'low' ? '🟢 Low' :
                  task.complexity === 'medium' ? '🟡 Medium' : '🔴 High'
              ),
              React.createElement(
                'select',
                {
                  style: taskStyles.select,
                  value: task.status,
                  onChange: (e) => handleStatusChange(task.id, e.target.value),
                  onClick: (e) => e.stopPropagation()
                },
                React.createElement('option', { value: 'pending' }, '⏳ Pending'),
                React.createElement('option', { value: 'in_progress' }, '🔄 In Progress'),
                React.createElement('option', { value: 'completed' }, '✅ Completed')
              ),
              React.createElement(
                'button',
                {
                  style: { ...taskStyles.button, ...taskStyles.deleteBtn },
                  onClick: (e) => {
                    e.stopPropagation();
                    handleDeleteTask(task.id);
                  }
                },
                '🗑️ Delete'
              )
            )
          )
        )
      )
    )
  );
};
