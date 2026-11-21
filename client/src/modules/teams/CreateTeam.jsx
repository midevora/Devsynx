// Teams Module - CreateTeam Component
// Handles team creation and team list management

const CreateTeam = ({ developers, teamHeads, projects, onTeamCreated }) => {
  const [formData, setFormData] = React.useState({
    teamName: '',
    projectId: '',
    teamHeadId: '',
    members: []
  });
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [teams, setTeams] = React.useState([]);
  const [loadingTeams, setLoadingTeams] = React.useState(false);

  // Import the API module
  const TEAMS_API = window.TEAMS_API;

  React.useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setLoadingTeams(true);
    const data = await TEAMS_API.getTeams();
    setTeams(data);
    setLoadingTeams(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMemberToggle = (developerId) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.includes(developerId)
        ? prev.members.filter(id => id !== developerId)
        : [...prev.members, developerId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.teamName || !formData.projectId || !formData.teamHeadId || formData.members.length === 0) {
      setError('All fields and at least one team member are required');
      return;
    }

    setError('');
    setMessage('');

    try {
      const data = await TEAMS_API.createTeam(formData);

      if (data.success) {
        setMessage('✅ Team created successfully!');
        setFormData({ teamName: '', projectId: '', teamHeadId: '', members: [] });
        setTimeout(() => {
          fetchTeams();
          if (onTeamCreated) onTeamCreated();
        }, 500);
      } else {
        setError('❌ ' + (data.error || 'Failed to create team'));
      }
    } catch (err) {
      setError('❌ Cannot connect to server');
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (window.confirm(`Are you sure you want to delete team "${teamName}"?`)) {
      try {
        const data = await TEAMS_API.deleteTeam(teamId);

        if (data.success) {
          setMessage('✅ Team deleted successfully!');
          setTimeout(() => fetchTeams(), 500);
        } else {
          setError('❌ Failed to delete team');
        }
      } catch (err) {
        setError('❌ Cannot connect to server');
      }
    }
  };

  return (
    <div className="form-container">
      <h2 style={{ marginBottom: '25px', color: '#2c3e50' }}>Create a New Team</h2>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="teamName">Team Name</label>
            <input
              type="text"
              id="teamName"
              name="teamName"
              value={formData.teamName}
              onChange={handleInputChange}
              placeholder="Enter team name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="projectId">Select Project</label>
            <select
              id="projectId"
              name="projectId"
              value={formData.projectId}
              onChange={handleInputChange}
            >
              <option value="">-- Choose a project --</option>
              {projects && projects.map(proj => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="teamHeadId">Team Head</label>
          <select
            id="teamHeadId"
            name="teamHeadId"
            value={formData.teamHeadId}
            onChange={handleInputChange}
          >
            <option value="">-- Assign a team head --</option>
            {teamHeads && teamHeads.map(head => (
              <option key={head.id} value={head.id}>
                {head.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select Team Members</label>
          <div className="checkbox-group">
            {developers && developers.length > 0 ? (
              developers
                .map(dev => (
                <div key={dev.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`dev-${dev.id}`}
                    checked={formData.members.includes(dev.id)}
                    onChange={() => handleMemberToggle(dev.id)}
                  />
                  <label htmlFor={`dev-${dev.id}`}>{dev.name}</label>
                </div>
              ))
            ) : (
              <p style={{ color: '#7f8c8d' }}>No developers available</p>
            )}
          </div>
        </div>

        <button type="submit" className="submit-btn">Create Team</button>
      </form>

      {/* Teams List Section */}
      <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #ecf0f1' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>📋 Existing Teams</h3>
        {loadingTeams ? (
          <p style={{ color: '#7f8c8d' }}>Loading teams...</p>
        ) : teams.length === 0 ? (
          <p style={{ color: '#7f8c8d' }}>No teams created yet</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {teams.map(team => (
              <div key={team.id} style={{
                padding: '15px',
                border: '1px solid #bdc3c7',
                borderRadius: '6px',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>{team.team_name}</h4>
                  <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                    <strong>Project:</strong> {team.project_name || 'N/A'}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                    <strong>Team Head:</strong> {team.team_head_name || 'N/A'}
                  </p>
                </div>
                <button 
                  onClick={() => handleDeleteTeam(team.id, team.team_name)}
                  style={{
                    marginTop: '10px',
                    padding: '8px 15px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
                >
                  🗑️ Delete Team
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

window.CreateTeam = CreateTeam;
