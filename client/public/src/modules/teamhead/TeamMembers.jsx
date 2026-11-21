// Team Members Component
// Display team members assigned to team head

window.TeamMembers = function({ teamId, members = [] }) {
  const [teamMembers, setTeamMembers] = React.useState(members);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (teamId && members.length === 0) {
      fetchMembers();
    }
  }, [teamId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await window.TEAMHEAD_API.getTeamMembers(teamId);
      setTeamMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const memberStyles = {
    membersContainer: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    memberCard: {
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      padding: '15px',
      borderRadius: '6px',
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    memberInfo: {
      flex: 1
    },
    memberName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '5px'
    },
    memberEmail: {
      fontSize: '14px',
      color: '#7f8c8d'
    },
    badge: {
      backgroundColor: '#3498db',
      color: '#ffffff',
      padding: '5px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600'
    }
  };

  return React.createElement(
    'div',
    { style: memberStyles.membersContainer },
    React.createElement('h3', { style: { marginBottom: '15px', color: '#2c3e50' } }, '👥 Team Members'),
    loading && React.createElement('p', null, 'Loading members...'),
    !loading && teamMembers.length === 0 && React.createElement('p', { style: { color: '#95a5a6' } }, 'No team members found'),
    !loading && teamMembers.map(member =>
      React.createElement(
        'div',
        { key: member.id, style: memberStyles.memberCard },
        React.createElement(
          'div',
          { style: memberStyles.memberInfo },
          React.createElement('div', { style: memberStyles.memberName }, member.name),
          React.createElement('div', { style: memberStyles.memberEmail }, member.email)
        ),
        React.createElement(
          'div',
          { style: memberStyles.badge },
          member.role || 'Developer'
        )
      )
    )
  );
};
