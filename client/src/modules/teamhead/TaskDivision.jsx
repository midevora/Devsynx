// Task Division Component
// Team Head can divide a project into tasks for their team

window.TaskDivision = function() {
  const [teamData, setTeamData] = React.useState(null);
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [tasks, setTasks] = React.useState([]);
  const [currentTaskId, setCurrentTaskId] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [creatingTasks, setCreatingTasks] = React.useState(false);

  React.useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const storedTeam = localStorage.getItem('currentTeam');
      if (!storedTeam) {
        setError('No team selected. Please select a team from the dashboard.');
        setLoading(false);
        return;
      }

      const team = JSON.parse(storedTeam);
      setTeamData(team);

      // Fetch team members
      const members = await window.TEAMHEAD_API.getTeamMembers(team.id);
      setTeamMembers(members || []);
    } catch (err) {
      console.error('Error loading team data:', err);
      setError('Failed to load team data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addTask = () => {
    const newTask = {
      id: currentTaskId,
      taskName: '',
      description: '',
      complexity: 'medium',
      developer: ''
    };
    setTasks([...tasks, newTask]);
    setCurrentTaskId(currentTaskId + 1);
  };

  const updateTask = (id, field, value) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  const removeTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const validateAndSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (tasks.length === 0) {
      setError('Please add at least one task');
      return;
    }

    const invalidTasks = tasks.filter(t => !t.taskName.trim() || !t.developer);
    if (invalidTasks.length > 0) {
      setError('All tasks must have a name and assigned developer');
      return;
    }

    // Create tasks
    setCreatingTasks(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      for (const task of tasks) {
        await window.TEAMHEAD_API.createTask(
          teamData.id,
          parseInt(task.developer),
          task.taskName,
          task.description,
          task.complexity,
          user.developerId || 1
        );
      }

      setMessage(`✅ Successfully created ${tasks.length} task(s)!`);
      setTasks([]);
      setCurrentTaskId(1);
      
      setTimeout(() => {
        window.location.href = 'teamhead.html';
      }, 2000);
    } catch (err) {
      console.error('Error creating tasks:', err);
      setError('Failed to create tasks: ' + err.message);
    } finally {
      setCreatingTasks(false);
    }
  };

  const goBack = () => {
    localStorage.removeItem('currentTeam');
    window.location.href = 'teamhead.html';
  };

  const styles = {
    wrapper: {
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f7fa'
    },
    navbar: {
      background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
      color: '#ffffff',
      padding: '15px 30px',
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
    },
    mainContainer: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      '@media (maxWidth: 768px)': {
        gridTemplateColumns: '1fr'
      }
    },
    sidebar: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      height: 'fit-content',
      maxHeight: '80vh',
      overflowY: 'auto'
    },
    formContainer: {
      backgroundColor: '#ffffff',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
    },
    sidebarTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '15px',
      borderBottom: '2px solid #3498db',
      paddingBottom: '10px'
    },
    projectSection: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '30px',
      borderLeft: '4px solid #3498db'
    },
    projectTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '10px'
    },
    projectDesc: {
      color: '#7f8c8d',
      fontSize: '14px',
      marginBottom: '10px'
    },
    existingTaskCard: {
      backgroundColor: '#f0f8ff',
      border: '2px solid #3498db',
      borderRadius: '6px',
      padding: '12px',
      marginBottom: '10px',
      transition: 'all 0.3s'
    },
    taskCardTitle: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '5px'
    },
    taskMeta: {
      fontSize: '11px',
      color: '#7f8c8d',
      marginBottom: '3px'
    },
    taskStatusBadge: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: '600',
      marginTop: '5px'
    },
    newTaskCard: {
      backgroundColor: '#ffffff',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '15px',
      transition: 'all 0.3s'
    },
    taskCard: {
      backgroundColor: '#ffffff',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '15px',
      transition: 'all 0.3s'
    },
    taskHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px'
    },
    taskTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#2c3e50'
    },
    removeBtn: {
      backgroundColor: '#e74c3c',
      color: '#ffffff',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
      marginBottom: '15px'
    },
    fullWidth: {
      gridColumn: '1 / -1'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '5px',
      color: '#2c3e50'
    },
    input: {
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'inherit'
    },
    textarea: {
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'inherit',
      minHeight: '60px',
      resize: 'vertical'
    },
    select: {
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'inherit',
      cursor: 'pointer'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '30px',
      justifyContent: 'center'
    },
    primaryBtn: {
      backgroundColor: '#27ae60',
      color: '#ffffff',
      border: 'none',
      padding: '12px 30px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    },
    secondaryBtn: {
      backgroundColor: '#95a5a6',
      color: '#ffffff',
      border: 'none',
      padding: '12px 30px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    addTaskBtn: {
      backgroundColor: '#3498db',
      color: '#ffffff',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      marginBottom: '20px'
    },
    message: {
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '15px',
      fontSize: '14px'
    },
    successMessage: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb'
    },
    errorMessage: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb'
    }
  };

  if (loading) {
    return React.createElement(
      'div',
      { style: styles.wrapper },
      React.createElement('div', { style: { textAlign: 'center', padding: '40px', fontSize: '16px' } }, '⏳ Loading...')
    );
  }

  if (!teamData) {
    return React.createElement(
      'div',
      { style: styles.wrapper },
      React.createElement(
        'div',
        { style: { ...styles.content, maxWidth: '600px', margin: '0 auto' } },
        React.createElement('div', { style: { ...styles.message, ...styles.errorMessage } }, error),
        React.createElement('button', { onClick: goBack, style: styles.secondaryBtn }, '← Back to Dashboard')
      )
    );
  }

  return React.createElement(
    'div',
    { style: styles.wrapper },
    React.createElement(
      'div',
      { style: styles.navbar },
      React.createElement('h1', { style: { fontSize: '24px' } }, '✂️ Divide Project into Tasks'),
      React.createElement('button', {
        onClick: goBack,
        style: {
          backgroundColor: 'rgba(255,255,255,0.2)',
          color: '#ffffff',
          border: '1px solid rgba(255,255,255,0.5)',
          padding: '8px 16px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: '600'
        }
      }, '← Back')
    ),
    React.createElement(
      'div',
      { style: styles.mainContainer },
      React.createElement(
        'div',
        { style: styles.sidebar },
        React.createElement('div', { style: styles.sidebarTitle }, `✅ Created Tasks (0)`),
        React.createElement('p', { style: { color: '#95a5a6', textAlign: 'center', padding: '20px 0' } }, 'No tasks created yet')
      ),
      React.createElement(
        'div',
        { style: styles.formContainer },
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            { style: styles.projectSection },
            React.createElement('div', { style: styles.projectTitle }, `📁 ${teamData.team_name}`),
            React.createElement('div', { style: { fontSize: '14px', fontWeight: '500', color: '#2c3e50', marginBottom: '8px' } }, `Project: ${teamData.project_name}`),
            teamData.project_description && React.createElement('div', { style: styles.projectDesc }, `📝 ${teamData.project_description}`)
          ),
          message && React.createElement('div', { style: { ...styles.message, ...styles.successMessage } }, message),
          error && React.createElement('div', { style: { ...styles.message, ...styles.errorMessage } }, error),
          React.createElement(
            'form',
            { onSubmit: validateAndSubmit },
            React.createElement('h3', { style: { fontSize: '16px', fontWeight: '600', color: '#2c3e50', marginBottom: '15px' } }, '➕ Create New Tasks'),
            tasks.length === 0 && React.createElement('p', { style: { color: '#95a5a6', marginBottom: '15px' } }, 'No tasks added yet'),
            tasks.map((task, idx) =>
              React.createElement(
                'div',
                { key: task.id, style: styles.newTaskCard },
                React.createElement(
                  'div',
                  { style: styles.taskHeader },
                  React.createElement('span', { style: styles.taskTitle }, `Task ${idx + 1}`),
                  React.createElement('button', {
                    type: 'button',
                    onClick: () => removeTask(task.id),
                    style: styles.removeBtn
                  }, '✕ Remove')
                ),
                React.createElement(
                  'div',
                  { style: styles.formRow },
                  React.createElement(
                    'div',
                    { style: styles.formGroup },
                    React.createElement('label', { style: styles.label }, 'Task Name *'),
                    React.createElement('input', {
                      type: 'text',
                      value: task.taskName,
                      onChange: (e) => updateTask(task.id, 'taskName', e.target.value),
                      placeholder: 'Enter task name',
                      style: styles.input,
                      required: true
                    })
                  ),
                  React.createElement(
                    'div',
                    { style: styles.formGroup },
                    React.createElement('label', { style: styles.label }, 'Complexity *'),
                    React.createElement(
                      'select',
                      {
                        value: task.complexity,
                        onChange: (e) => updateTask(task.id, 'complexity', e.target.value),
                        style: styles.select
                      },
                      React.createElement('option', { value: 'low' }, '🟢 Low'),
                      React.createElement('option', { value: 'medium' }, '🟡 Medium'),
                      React.createElement('option', { value: 'high' }, '🔴 High')
                    )
                  )
                ),
                React.createElement(
                  'div',
                  { style: { ...styles.formRow, marginBottom: '15px' } },
                  React.createElement(
                    'div',
                    { style: styles.formGroup },
                    React.createElement('label', { style: styles.label }, 'Description'),
                    React.createElement('textarea', {
                      value: task.description,
                      onChange: (e) => updateTask(task.id, 'description', e.target.value),
                      placeholder: 'Enter task description',
                      style: styles.textarea
                    })
                  ),
                  React.createElement(
                    'div',
                    { style: styles.formGroup },
                    React.createElement('label', { style: styles.label }, 'Assign To *'),
                    React.createElement(
                      'select',
                      {
                        value: task.developer,
                        onChange: (e) => updateTask(task.id, 'developer', e.target.value),
                        style: styles.select,
                        required: true
                      },
                      React.createElement('option', { value: '' }, '-- Select Developer --'),
                      teamMembers.map(member =>
                        React.createElement('option', { key: member.id, value: member.id }, member.name || member.developer_name)
                      )
                    )
                  )
                )
              )
            ),
            React.createElement('button', {
              type: 'button',
              onClick: addTask,
              style: styles.addTaskBtn
            }, '+ Add Another Task'),
            React.createElement(
              'div',
              { style: styles.buttonGroup },
              React.createElement('button', {
                type: 'submit',
                style: styles.primaryBtn,
                disabled: creatingTasks || tasks.length === 0
              }, creatingTasks ? '⏳ Creating Tasks...' : `✅ Create ${tasks.length} Task${tasks.length !== 1 ? 's' : ''}`),
              React.createElement('button', {
                type: 'button',
                onClick: goBack,
                style: styles.secondaryBtn
              }, '← Cancel')
            )
          )
        )
      )
    )
  );
};
