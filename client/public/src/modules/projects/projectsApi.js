// Projects API Module - Handles all project-related API calls

const PROJECTS_API = {
  // Get all projects
  async getProjects() {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching projects:', err);
      return [];
    }
  },

  // Create a new project
  async createProject(projectData) {
    try {
      const response = await fetch('/api/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      return await response.json();
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  },

  // Delete a project
  async deleteProject(projectId) {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  }
};

export default PROJECTS_API;
