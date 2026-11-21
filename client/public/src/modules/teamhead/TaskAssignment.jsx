// Task Assignment Component
// Create and assign tasks to team members

window.TaskAssignment = function({ teamId, teamMembers = [] }) {
  console.log('📝 TaskAssignment mounted with:', { teamId, teamMembersCount: teamMembers?.length, teamMembers });
  const [formData, setFormData] = React.useState({
    taskName: '',
    description: '',
    githubFilePath: '',
    complexity: 'medium',
    developerId: ''
  });
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const getLoadBadge = (member) => {
    if (member.overloaded) {
      return {
        text: `Overloaded (${member.load ?? 0}/${member.capacity ?? 10})`,
        backgroundColor: '#fde2e2',
        color: '#c0392b',
        border: '1px solid #f5b7b1'
      };
    }

    const remaining = typeof member.remaining_capacity === 'number' ? member.remaining_capacity : 0;
    return {
      text: `Available (${remaining} left)`,
      backgroundColor: '#e8f8f5',
      color: '#117a65',
      border: '1px solid #a9dfbf'
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!formData.taskName || !formData.developerId) {
        setError('Task name and developer are required');
        return;
      }

      const user = JSON.parse(localStorage.getItem('user'));
      await window.TEAMHEAD_API.createTask(
        teamId,
        parseInt(formData.developerId),
        formData.taskName,
        formData.description,
        formData.complexity,
        user.developerId || 1,
        formData.githubFilePath
      );

      setMessage('✅ Task assigned successfully!');
      setFormData({ taskName: '', description: '', githubFilePath: '', complexity: 'medium', developerId: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Error assigning task: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formStyles = {
    container: {
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    form: {
      display: 'grid',
      gap: '15px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '5px',
      color: '#2c3e50'
    },
    input: {
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      fontFamily: 'inherit'
    },
    textarea: {
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      fontFamily: 'inherit',
      minHeight: '80px',
      resize: 'vertical'
    },
    select: {
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      fontFamily: 'inherit',
      cursor: 'pointer'
    },
    button: {
      padding: '10px 20px',
      backgroundColor: '#27ae60',
      color: '#ffffff',
      border: 'none',
      borderRadius: '5px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    },
    message: {
      padding: '10px',
      borderRadius: '5px',
      marginBottom: '10px',
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

  return React.createElement(
    'div',
    { style: formStyles.container },
    React.createElement('h3', { style: { marginBottom: '15px', color: '#2c3e50' } }, '➕ Assign Task to Developer'),
    message && React.createElement(
      'div',
      { style: { ...formStyles.message, ...formStyles.successMessage } },
      message
    ),
    error && React.createElement(
      'div',
      { style: { ...formStyles.message, ...formStyles.errorMessage } },
      error
    ),
    React.createElement(
      'form',
      { style: formStyles.form, onSubmit: handleSubmit },
      React.createElement(
        'div',
        { style: formStyles.formGroup },
        React.createElement('label', { style: formStyles.label }, 'Task Name *'),
        React.createElement('input', {
          type: 'text',
          name: 'taskName',
          value: formData.taskName,
          onChange: handleInputChange,
          placeholder: 'Enter task name',
          style: formStyles.input,
          required: true
        })
      ),
      React.createElement(
        'div',
        { style: formStyles.formGroup },
        React.createElement('label', { style: formStyles.label }, 'GitHub file path *'),
        React.createElement('input', {
          type: 'text',
          name: 'githubFilePath',
          value: formData.githubFilePath,
          onChange: handleInputChange,
          placeholder: 'src/components/Feature.jsx',
          style: formStyles.input,
          required: true
        })
      ),
      React.createElement(
        'div',
        { style: formStyles.formGroup },
        React.createElement('label', { style: formStyles.label }, 'Description'),
        React.createElement('textarea', {
          name: 'description',
          value: formData.description,
          onChange: handleInputChange,
          placeholder: 'Enter task description',
          style: formStyles.textarea
        })
      ),
      React.createElement(
        'div',
        { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' } },
        React.createElement(
          'div',
          { style: formStyles.formGroup },
          React.createElement('label', { style: formStyles.label }, 'Complexity *'),
          React.createElement(
            'select',
            {
              name: 'complexity',
              value: formData.complexity,
              onChange: handleInputChange,
              style: formStyles.select
            },
            React.createElement('option', { value: 'low' }, '🟢 Low'),
            React.createElement('option', { value: 'medium' }, '🟡 Medium'),
            React.createElement('option', { value: 'high' }, '🔴 High')
          )
        ),
        React.createElement(
          'div',
          { style: formStyles.formGroup },
          React.createElement('label', { style: formStyles.label }, 'Assign To *'),
          React.createElement(
            'select',
            {
              name: 'developerId',
              value: formData.developerId,
              onChange: handleInputChange,
              style: formStyles.select,
              required: true
            },
            React.createElement('option', { value: '' }, 'Select a team member...'),
            teamMembers.map(member =>
              React.createElement(
                'option',
                { key: member.id, value: member.id },
                member.name
              )
            )
          ),
          teamMembers.length > 0 && React.createElement(
            'div',
            { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' } },
            teamMembers.map(member => {
              const badge = getLoadBadge(member);
              return React.createElement(
                'span',
                {
                  key: `badge-${member.id}`,
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: '999px',
                    backgroundColor: badge.backgroundColor,
                    color: badge.color,
                    border: badge.border,
                    fontSize: '12px',
                    fontWeight: 600
                  }
                },
                `${member.name}: ${badge.text}`
              );
            })
          )
        )
      ),
      React.createElement('button', {
        type: 'submit',
        style: { ...formStyles.button, opacity: loading ? 0.6 : 1 },
        disabled: loading
      }, loading ? 'Assigning...' : 'Assign Task')
    )
  );
};
