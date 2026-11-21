// Team Head Dashboard Main Component
// Displays teams, team members, and task management interface

window.TeamHeadDashboard = function() {
  const [dashboardData, setDashboardData] = React.useState(null);
  const [currentTeam, setCurrentTeam] = React.useState(null);
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    console.log('📍 fetchDashboard() called');
    setLoading(true);
    setError('');
    try {
      const userStr = localStorage.getItem('user');
      console.log('📍 localStorage.getItem("user") =', userStr);
      
      if (!userStr) {
        throw new Error('No user data in localStorage');
      }
      
      const user = JSON.parse(userStr);
      console.log('📍 Parsed user object =', user);
      
      if (!user || !user.email) {
        throw new Error('User email not found in user object');
      }

      console.log('📍 Calling getDashboard for:', user.email);
      const data = await window.TEAMHEAD_API.getDashboard(user.email);
      console.log('📍 getDashboard response =', data);
      
      setDashboardData(data);

      if (data && data.teams && data.teams.length > 0) {
        console.log('📍 Found', data.teams.length, 'teams, selecting first one');
        selectTeam(data.teams[0]);
      } else {
        console.log('⚠️ No teams found in dashboard data');
      }
    } catch (err) {
      console.error('❌ fetchDashboard error:', err.message, err);
      setError('Failed to load dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = async (team) => {
    console.log('📍 selectTeam() called with:', team);
    setCurrentTeam(team);
    try {
      console.log('📍 Calling getTeamMembers for team ID:', team.id);
      const members = await window.TEAMHEAD_API.getTeamMembers(team.id);
      console.log('📍 getTeamMembers response =', members);
      setTeamMembers(members || []);
    } catch (err) {
      console.error('❌ selectTeam error:', err.message, err);
      setTeamMembers([]);
    }
  };

  const dashboardStyles = {
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
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '20px'
    },
    sidebar: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      height: 'fit-content'
    },
    mainContent: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
    },
    teamButton: {
      width: '100%',
      padding: '12px',
      marginBottom: '10px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.3s',
      fontWeight: '500',
      fontSize: '14px'
    },
    activeTeam: {
      backgroundColor: '#3498db',
      color: '#ffffff'
    },
    inactiveTeam: {
      backgroundColor: '#ecf0f1',
      color: '#2c3e50'
    },
    projectInfo: {
      backgroundColor: '#f8f9fa',
      padding: '10px',
      borderRadius: '4px',
      fontSize: '12px',
      color: '#7f8c8d',
      marginTop: '5px'
    }
  };

  const handleDivideProject = () => {
    // Store current team in localStorage for TaskDivision component
    localStorage.setItem('currentTeam', JSON.stringify(currentTeam));
    window.location.href = 'task-division.html';
  };

  const renderTeamMembers = () => {
    if (!teamMembers || teamMembers.length === 0) {
      return React.createElement('p', { style: { color: '#95a5a6' } }, 'No team members found');
    }
    
    return React.createElement(
      'div',
      null,
      React.createElement('h3', { style: { marginTop: '20px', marginBottom: '15px', color: '#2c3e50' } }, '👥 Team Members (' + teamMembers.length + ')'),
      React.createElement(
        'div',
        { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' } },
        teamMembers.map(member =>
          React.createElement(
            'div',
            {
              key: member.id,
              style: {
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e9ecef'
              }
            },
            React.createElement('div', { style: { fontWeight: '600', color: '#2c3e50' } }, member.name || member.developer_name),
            React.createElement('div', { style: { fontSize: '12px', color: '#7f8c8d' } }, member.email || member.developer_email),
            member.role && React.createElement('div', { style: { fontSize: '11px', color: '#3498db', marginTop: '5px' } }, '• ' + member.role)
          )
        )
      )
    );
  };

  return React.createElement(
    'div',
    { style: dashboardStyles.wrapper },
    React.createElement(
      'div',
      { style: dashboardStyles.navbar },
      React.createElement('h1', { style: { fontSize: '24px' } }, '👔 Team Head Dashboard'),
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '20px' } },
        dashboardData && React.createElement(
          'div',
          { style: { textAlign: 'right', fontSize: '14px' } },
          React.createElement('div', { style: { fontSize: '11px', opacity: 0.8, textTransform: 'uppercase' } }, 'Team Head'),
          React.createElement('div', null, dashboardData.name)
        ),
        React.createElement('button', {
          onClick: () => {
            console.log('📍 Logout clicked');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
          },
          style: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.5)',
            padding: '8px 16px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: '600'
          }
        }, 'Logout')
      )
    ),
    loading && React.createElement('div', { style: { textAlign: 'center', padding: '40px', fontSize: '16px' } }, '⏳ Loading dashboard...'),
    error && React.createElement('div', { style: { backgroundColor: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '5px', marginBottom: '20px', maxWidth: '1200px', margin: '0 auto' } }, '❌ ' + error),
    !loading && !dashboardData && React.createElement('div', { style: { backgroundColor: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '5px', maxWidth: '1200px', margin: '20px auto' } }, '⚠️ No dashboard data loaded. Check console for errors.'),
    !loading && dashboardData && React.createElement(
      'div',
      { style: dashboardStyles.container },
      React.createElement(
        'div',
        { style: dashboardStyles.sidebar },
        React.createElement('h3', { style: { marginBottom: '15px', color: '#2c3e50' } }, '📊 Your Teams (' + (dashboardData.teams ? dashboardData.teams.length : 0) + ')'),
        dashboardData.teams && dashboardData.teams.length > 0 ?
          dashboardData.teams.map(team =>
            React.createElement(
              'button',
              {
                key: team.id,
                style: {
                  ...dashboardStyles.teamButton,
                  ...(currentTeam && currentTeam.id === team.id ?
                    dashboardStyles.activeTeam : dashboardStyles.inactiveTeam)
                },
                onClick: () => selectTeam(team)
              },
              React.createElement('div', null, team.team_name),
              React.createElement('div', { style: dashboardStyles.projectInfo }, `📁 ${team.project_name}`)
            )
          ) :
          React.createElement('p', { style: { color: '#95a5a6' } }, 'No teams assigned')
      ),
      React.createElement(
        'div',
        { style: dashboardStyles.mainContent },
        currentTeam ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'h2',
            { style: { marginBottom: '20px', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' } },
            `🎯 ${currentTeam.team_name}`
          ),
          React.createElement('div', null,
            React.createElement('strong', null, 'Project: '),
            React.createElement('span', null, currentTeam.project_name)
          ),
          currentTeam.project_description && React.createElement(
            'div',
            { style: { color: '#7f8c8d', fontSize: '14px', marginTop: '5px' } },
            React.createElement('strong', null, 'Description: '),
            React.createElement('span', null, currentTeam.project_description)
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '10px', marginTop: '15px', marginBottom: '20px' } },
            React.createElement('button', {
              onClick: handleDivideProject,
              style: {
                backgroundColor: '#f39c12',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'background-color 0.3s'
              },
              onMouseEnter: function(e) { e.target.style.backgroundColor = '#e67e22'; },
              onMouseLeave: function(e) { e.target.style.backgroundColor = '#f39c12'; }
            }, '✂️ Divide Project into Tasks')
          ),
          React.createElement('hr', { style: { margin: '20px 0', border: 'none', borderTop: '1px solid #ecf0f1' } }),
          renderTeamMembers()
        ) :
          React.createElement('p', { style: { color: '#95a5a6', textAlign: 'center', padding: '40px' } }, 'Select a team to view details')
      )
    )
  );
};
