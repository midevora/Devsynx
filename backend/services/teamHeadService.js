// Backend Team Head Service
// Handles all team head dashboard operations

const db = require('../db');
const taskOverloadService = require('./taskOverloadService');
const githubUploadService = require('./githubUploadService');

const teamHeadService = {
  // Get team head's teams and basic info by email
  async getTeamHeadInfo(email) {
    const connection = await db.promise().getConnection();
    try {
      // Get developer info by email
      const [developers] = await connection.query(
        'SELECT id, name, email FROM ds_developers WHERE email = ?',
        [email]
      );

      if (developers.length === 0) {
        throw new Error('Team head not found');
      }

      const teamHeadId = developers[0].id;

      // Get all teams where this user is team head
      const [teams] = await connection.query(
        `SELECT t.id, t.team_name, t.project_id, p.name as project_name, p.description as project_description
         FROM ds_teams t
         LEFT JOIN ds_projects p ON t.project_id = p.id
         WHERE t.team_head_id = ?`,
        [teamHeadId]
      );

      return {
        teamHeadId,
        name: developers[0].name,
        email: developers[0].email,
        teams
      };
    } finally {
      connection.release();
    }
  },

  // Get team members for a specific team
  async getTeamMembers(teamId) {
    const connection = await db.promise().getConnection();
    try {
      const [members] = await connection.query(
        `SELECT d.id, d.name, d.email, d.role 
         FROM ds_developers d
         INNER JOIN ds_team_assignments ta ON d.id = ta.developer_id
         WHERE ta.team_id = ?`,
        [teamId]
      );

      return members;
    } finally {
      connection.release();
    }
  },

  async getTeamMembersWithLoad(teamId) {
    const connection = await db.promise().getConnection();
    try {
      const [members] = await connection.query(
        `SELECT d.id, d.name, d.email, d.role 
         FROM ds_developers d
         INNER JOIN ds_team_assignments ta ON d.id = ta.developer_id
         WHERE ta.team_id = ?`,
        [teamId]
      );

      const membersWithLoad = [];
      for (const member of members) {
        const loadAssessment = await taskOverloadService.getDeveloperLoadSummary(
          connection,
          member.id
        );

        membersWithLoad.push({
          ...member,
          load: loadAssessment.current_points,
          capacity: loadAssessment.capacity,
          remaining_capacity: loadAssessment.remaining_capacity,
          overloaded: loadAssessment.overloaded,
          load_breakdown: loadAssessment.breakdown
        });
      }

      return membersWithLoad;
    } finally {
      connection.release();
    }
  },

  // Assign a task to a developer
  async createTask(teamId, developerId, taskName, description, complexity, assignedBy, githubFilePath) {
    const connection = await db.promise().getConnection();
    try {
      // Ensure tasks table exists with proper columns
      try {
        await connection.query(
          `ALTER TABLE ds_tasks ADD COLUMN IF NOT EXISTS task_name VARCHAR(255) DEFAULT 'Untitled'`
        );
      } catch (err) {
        // Column likely already exists on older engines
      }

      const overloadAssessment = await taskOverloadService.assessDeveloperLoad(
        connection,
        developerId,
        complexity
      );

      if (overloadAssessment.overloaded) {
        const overloadError = new Error(
          `Developer is overloaded: current load ${overloadAssessment.current_points}/${overloadAssessment.capacity}, projected load ${overloadAssessment.projected_points}/${overloadAssessment.capacity}`
        );
        overloadError.code = 'DEVELOPER_OVERLOADED';
        overloadError.details = overloadAssessment;
        throw overloadError;
      }

      const [result] = await connection.query(
        `INSERT INTO ds_tasks (team_id, developer_id, task_name, description, complexity, assigned_by, github_file_path, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [teamId, developerId, taskName, description || null, complexity, assignedBy, githubFilePath || null]
      );

      return {
        success: true,
        taskId: result.insertId,
        message: `Task "${taskName}" assigned successfully!`,
        overload: overloadAssessment
      };
    } finally {
      connection.release();
    }
  },

  // Get all tasks for a team
  async getTeamTasks(teamId) {
    const connection = await db.promise().getConnection();
    try {
      const [tasks] = await connection.query(
        `SELECT t.id, t.task_name, t.description, t.complexity, t.status,
                t.github_verified, t.github_check_summary, t.github_evidence_url, t.github_file_path,
                d.name as assigned_to, d.email as developer_email,
                th.name as assigned_by_name,
                t.created_at
         FROM ds_tasks t
         INNER JOIN ds_developers d ON t.developer_id = d.id
         LEFT JOIN ds_developers th ON t.assigned_by = th.id
         WHERE t.team_id = ?
         ORDER BY t.created_at DESC`,
        [teamId]
      );

      return tasks;
    } finally {
      connection.release();
    }
  },

  // Get tasks assigned to a specific developer in their team
  async getDeveloperTasks(teamId, developerId) {
    const connection = await db.promise().getConnection();
    try {
      const [tasks] = await connection.query(
        `SELECT t.id, t.task_name, t.description, t.complexity, t.status,
                t.github_verified, t.github_check_summary, t.github_evidence_url, t.github_file_path,
                th.name as assigned_by_name,
                t.created_at
         FROM ds_tasks t
         LEFT JOIN ds_developers th ON t.assigned_by = th.id
         WHERE t.team_id = ? AND t.developer_id = ?
         ORDER BY t.created_at DESC`,
        [teamId, developerId]
      );

      return tasks;
    } finally {
      connection.release();
    }
  },

  async applyGithubUploadCheck(connection, taskId, status) {
    if (!['in_progress', 'completed'].includes(status)) {
      return null;
    }

    const githubCheck = await githubUploadService.verifyTaskUploadedToGithub(
      connection,
      taskId
    );

    if (status === 'completed' && !githubCheck.uploaded) {
      const uploadError = new Error(
        githubCheck.reason || 'AI agent could not verify this task on the company GitHub account'
      );
      uploadError.code = 'GITHUB_NOT_UPLOADED';
      uploadError.details = githubCheck;
      throw uploadError;
    }

    return githubCheck;
  },

  // Update task status
  async updateTaskStatus(taskId, status) {
    const connection = await db.promise().getConnection();
    try {
      const githubCheck = await this.applyGithubUploadCheck(connection, taskId, status);

      const [result] = await connection.query(
        'UPDATE ds_tasks SET status = ? WHERE id = ?',
        [status, taskId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Task not found');
      }

      return {
        success: true,
        message: githubCheck && githubCheck.uploaded
          ? `Task status updated to ${status}. GitHub upload verified.`
          : `Task status updated to ${status}`,
        github_check: githubCheck
      };
    } finally {
      connection.release();
    }
  },

  // Update task details (name, complexity, status, description)
  async updateTask(taskId, { task_name, complexity, status, description }) {
    const connection = await db.promise().getConnection();
    try {
      const [preview] = await connection.query(
        'SELECT id FROM ds_tasks WHERE id = ?',
        [taskId]
      );
      if (preview.length === 0) {
        throw new Error('Task not found');
      }

      await connection.query(
        `UPDATE ds_tasks SET task_name = ?, complexity = ?, description = ? WHERE id = ?`,
        [task_name, complexity, description, taskId]
      );

      const githubCheck = await this.applyGithubUploadCheck(connection, taskId, status);

      const [result] = await connection.query(
        `UPDATE ds_tasks SET status = ? WHERE id = ?`,
        [status, taskId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Task not found');
      }

      return {
        success: true,
        message: 'Task updated successfully',
        taskId: taskId,
        github_check: githubCheck
      };
    } finally {
      connection.release();
    }
  },

  // Delete a task
  async deleteTask(taskId) {
    const connection = await db.promise().getConnection();
    try {
      const [result] = await connection.query(
        'DELETE FROM ds_tasks WHERE id = ?',
        [taskId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Task not found');
      }

      return {
        success: true,
        message: 'Task deleted successfully'
      };
    } finally {
      connection.release();
    }
  }
};

module.exports = teamHeadService;
