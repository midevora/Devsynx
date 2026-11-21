// Team Head Dashboard Main Component - Simplified JSX Version
// Display teams assigned to team head and team members

window.TeamHeadDashboard = function() {
  console.log('🔄 TeamHeadDashboard component loading...');
  const [dashboardData, setDashboardData] = React.useState(null);
  const [currentTeam, setCurrentTeam] = React.useState(null);
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    console.log('📡 useEffect triggered - fetching dashboard');
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    console.log('📡 Fetching dashboard...');
    try {
      const userStr = localStorage.getItem('user');
      console.log('📦 User from localStorage:', userStr);
      
      if (!userStr) {
        throw new Error('No user found in localStorage');
      }
      
      const user = JSON.parse(userStr);
      console.log('👤 Parsed user:', user);
      
      if (!user.email) {
        throw new Error('User email not found');
      }

      console.log('🔄 Calling API: GET /api/teamhead/' + user.email + '/dashboard');
      const data = await window.TEAMHEAD_API.getDashboard(user.email);
      console.log('✅ Dashboard data received:', data);
      setDashboardData(data);

      if (data.teams && data.teams.length > 0) {
        console.log('🎯 Selecting first team:', data.teams[0]);
        selectTeam(data.teams[0]);
      }
    } catch (err) {
      console.error('❌ Dashboard fetch error:', err);
      setError('Failed to load dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = async (team) => {
    console.log('👥 Selecting team:', team);
    setCurrentTeam(team);
    try {
      console.log('🔄 Calling API: GET /api/teams/' + team.id + '/members');
      const members = await window.TEAMHEAD_API.getTeamMembers(team.id);
      console.log('✅ Team members loaded:', members);
      setTeamMembers(members);
    } catch (err) {
      console.error('❌ Error fetching team members:', err);
      setTeamMembers([]);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px' }}>
        ⏳ Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
        ❌ {error}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={{ color: '#95a5a6', textAlign: 'center', padding: '40px' }}>
        No dashboard data available
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa', padding: '20px' }}>
      {/* Navbar */}
      <div style={{
        background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
        color: '#ffffff',
        padding: '15px 30px',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>👔 Team Head Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {dashboardData && (
            <div style={{ textAlign: 'right', fontSize: '14px' }}>
              <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase' }}>Team Head</div>
              <div>{dashboardData.name || 'Team Head'}</div>
            </div>
          )}
          <button
            onClick={() => {
              localStorage.removeItem('user');
              window.location.href = 'login.html';
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.5)',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main container */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '250px 1fr',
        gap: '20px'
      }}>
        {/* Sidebar - Teams List */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          height: 'fit-content'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#2c3e50', fontSize: '16px', fontWeight: '600' }}>
            📊 Your Teams
          </h3>
          {dashboardData.teams && dashboardData.teams.length > 0 ? (
            <div>
              {dashboardData.teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => selectTeam(team)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s',
                    fontWeight: '500',
                    fontSize: '14px',
                    backgroundColor: currentTeam && currentTeam.id === team.id ? '#3498db' : '#ecf0f1',
                    color: currentTeam && currentTeam.id === team.id ? '#ffffff' : '#2c3e50'
                  }}
                >
                  <div style={{ fontWeight: '600' }}>{team.team_name}</div>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#7f8c8d',
                    marginTop: '5px'
                  }}>
                    📁 {team.project_name}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ color: '#95a5a6', textAlign: 'center', padding: '20px' }}>
              No teams assigned
            </p>
          )}
        </div>

        {/* Main content - Team details */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}>
          {currentTeam ? (
            <div>
              {/* Team header */}
              <h2 style={{
                marginBottom: '20px',
                color: '#2c3e50',
                borderBottom: '2px solid #3498db',
                paddingBottom: '10px',
                fontSize: '20px'
              }}>
                🎯 {currentTeam.team_name}
              </h2>

              {/* Project info */}
              <div style={{ marginBottom: '10px' }}>
                <strong>Project: </strong>
                <span>{currentTeam.project_name}</span>
              </div>
              {currentTeam.project_description && (
                <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '20px' }}>
                  <strong>Description: </strong>
                  <span>{currentTeam.project_description}</span>
                </div>
              )}
              <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #ecf0f1' }} />

              {/* Team members section */}
              <div>
                <h3 style={{
                  marginBottom: '15px',
                  color: '#2c3e50',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  👥 Team Members
                </h3>
                {teamMembers && teamMembers.length > 0 ? (
                  <div>
                    {teamMembers.map(member => (
                      <div
                        key={member.id}
                        style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e0e0e0',
                          padding: '15px',
                          borderRadius: '6px',
                          marginBottom: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '600',
                            color: '#2c3e50',
                            marginBottom: '3px'
                          }}>
                            {member.name || 'Unknown'}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: '#7f8c8d'
                          }}>
                            {member.email || 'No email'}
                          </div>
                        </div>
                        <div style={{
                          backgroundColor: '#3498db',
                          color: '#ffffff',
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {member.role || 'Developer'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#95a5a6' }}>No team members found</p>
                )}
              </div>
            </div>
          ) : (
            <p style={{ color: '#95a5a6', textAlign: 'center', padding: '40px' }}>
              Select a team from the left sidebar to view details
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
