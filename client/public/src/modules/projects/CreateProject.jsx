// Projects Module - CreateProject Component
// Handles project creation and project list management

const CreateProject = ({ onProjectCreated }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    startDate: '',
    expectedDeliveryDate: ''
  });
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [projects, setProjects] = React.useState([]);
  const [loadingProjects, setLoadingProjects] = React.useState(false);

  // Import the API module
  const PROJECTS_API = window.PROJECTS_API;

  React.useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    const data = await PROJECTS_API.getProjects();
    setProjects(data);
    setLoadingProjects(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.startDate) {
      setError('Project name and start date are required');
      return;
    }

    setError('');
    setMessage('');

    console.log('📤 Submitting form data:', formData);

    try {
      const data = await PROJECTS_API.createProject(formData);
      console.log('📥 Response:', data);

      if (data.success) {
        setMessage('✅ Project created successfully!');
        setFormData({ name: '', description: '', startDate: '', expectedDeliveryDate: '' });
        setTimeout(() => {
          fetchProjects();
          if (onProjectCreated) onProjectCreated();
        }, 500);
      } else {
        setError('❌ ' + (data.error || 'Failed to create project'));
      }
    } catch (err) {
      setError('❌ Cannot connect to server');
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (window.confirm(`Are you sure you want to delete project "${projectName}"? This will also delete all teams in this project.`)) {
      try {
        const data = await PROJECTS_API.deleteProject(projectId);

        if (data.success) {
          setMessage('✅ Project deleted successfully!');
          setTimeout(() => {
            fetchProjects();
            if (onProjectCreated) onProjectCreated();
          }, 500);
        } else {
          setError('❌ Failed to delete project');
        }
      } catch (err) {
        setError('❌ Cannot connect to server');
      }
    }
  };

  return (
    <div className="form-container">
      <h2 style={{ marginBottom: '25px', color: '#2c3e50' }}>Create a New Project</h2>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Project Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter project name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter project description (optional)"
          ></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="startDate">Start Date</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="expectedDeliveryDate">Expected Delivery Date</label>
          <input
            type="date"
            id="expectedDeliveryDate"
            name="expectedDeliveryDate"
            value={formData.expectedDeliveryDate}
            onChange={handleInputChange}
          />
        </div>
        <button type="submit" className="submit-btn">Create Project</button>
      </form>

      {/* Projects List Section */}
      <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #ecf0f1' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>💼 Existing Projects</h3>
        {loadingProjects ? (
          <p style={{ color: '#7f8c8d' }}>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p style={{ color: '#7f8c8d' }}>No projects created yet</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {projects.map(project => (
              <div key={project.id} style={{
                padding: '15px',
                border: '1px solid #bdc3c7',
                borderRadius: '6px',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>{project.name}</h4>
                  {project.description && (
                    <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                      <strong>Description:</strong> {project.description}
                    </p>
                  )}
                  {project.start_date && (
                    <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                      <strong>Start Date:</strong> {new Date(project.start_date).toLocaleDateString()}
                    </p>
                  )}
                  {project.expected_delivery_date && (
                    <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                      <strong>Expected Delivery:</strong> {new Date(project.expected_delivery_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => handleDeleteProject(project.id, project.name)}
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
                  🗑️ Delete Project
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

window.CreateProject = CreateProject;
