// Teams API Module - Handles all team-related API calls

const TEAMS_API = {
  // Get all teams
  async getTeams() {
    try {
      const response = await fetch('/api/teams');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching teams:', err);
      return [];
    }
  },

  // Create a new team
  async createTeam(teamData) {
    try {
      const response = await fetch('/api/create-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData)
      });
      return await response.json();
    } catch (err) {
      console.error('Error creating team:', err);
      throw err;
    }
  },

  // Delete a team
  async deleteTeam(teamId) {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (err) {
      console.error('Error deleting team:', err);
      throw err;
    }
  }
};

export default TEAMS_API;
