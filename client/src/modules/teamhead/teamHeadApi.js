// Team Head API Module
// Client-side API utilities for team head operations

window.TEAMHEAD_API = {
  // Get team head dashboard info
  async getDashboard(email) {
    try {
      console.log('🔄 Fetching dashboard for:', email);
      const response = await fetch(`/api/teamhead/${email}/dashboard`);
      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Dashboard API error:', response.status, error);
        throw new Error(`Failed to fetch dashboard: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Dashboard data:', data);
      return data;
    } catch (err) {
      console.error('❌ getDashboard error:', err);
      throw err;
    }
  },

  // Get team members
  async getTeamMembers(teamId) {
    try {
      console.log('🔄 Fetching team members for team:', teamId);
      const response = await fetch(`/api/teams/${teamId}/members`);
      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Team members API error:', response.status, error);
        throw new Error(`Failed to fetch team members: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Team members:', data);
      return data;
    } catch (err) {
      console.error('❌ getTeamMembers error:', err);
      throw err;
    }
  },

  // Create a task
  async createTask(teamId, developerId, taskName, description, complexity, assignedBy) {
    try {
      console.log('🔄 Creating task:', taskName);
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          developerId,
          taskName,
          description,
          complexity,
          assignedBy
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = data?.error || `Failed to create task: ${response.status}`;
        console.error('❌ Create task API error:', response.status, data || errorMessage);
        throw new Error(errorMessage);
      }
      console.log('✅ Task created:', data);
      return data;
    } catch (err) {
      console.error('❌ createTask error:', err);
      throw err;
    }
  },

  // Get all tasks for a team
  async getTeamTasks(teamId) {
    try {
      console.log('🔄 Fetching team tasks for team:', teamId);
      const response = await fetch(`/api/teams/${teamId}/tasks`);
      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Team tasks API error:', response.status, error);
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Team tasks:', data);
      return data;
    } catch (err) {
      console.error('❌ getTeamTasks error:', err);
      throw err;
    }
  },

  // Get tasks for a developer
  async getDeveloperTasks(teamId, developerId) {
    try {
      console.log('🔄 Fetching developer tasks for developer:', developerId);
      const response = await fetch(`/api/teams/${teamId}/tasks/developer/${developerId}`);
      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Developer tasks API error:', response.status, error);
        throw new Error(`Failed to fetch developer tasks: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Developer tasks:', data);
      return data;
    } catch (err) {
      console.error('❌ getDeveloperTasks error:', err);
      throw err;
    }
  },

  // Update task status
  async updateTaskStatus(taskId, status) {
    try {
      console.log('🔄 Updating task status:', taskId, 'to', status);
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        let message = `Failed to update task status: ${response.status}`;
        try {
          const error = JSON.parse(await response.text());
          message = error.error || message;
        } catch (parseError) {
          console.error('❌ Update status API error:', response.status);
        }
        throw new Error(message);
      }
      const data = await response.json();
      console.log('✅ Status updated:', data);
      return data;
    } catch (err) {
      console.error('❌ updateTaskStatus error:', err);
      throw err;
    }
  },

  // Delete a task
  async deleteTask(taskId) {
    try {
      console.log('🔄 Deleting task:', taskId);
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Delete task API error:', response.status, error);
        throw new Error(`Failed to delete task: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Task deleted:', data);
      return data;
    } catch (err) {
      console.error('❌ deleteTask error:', err);
      throw err;
    }
  }
};
