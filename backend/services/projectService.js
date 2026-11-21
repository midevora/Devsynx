// Backend Projects Service
// Handles all project-related database operations

const db = require('../db');

const projectService = {
  // Get all projects
  async getAllProjects() {
    const connection = await db.promise().getConnection();
    try {
      const [projects] = await connection.query('SELECT * FROM ds_projects');
      return projects;
    } finally {
      connection.release();
    }
  },

  // Create a new project
  async createProject(name, description, startDate, expectedDeliveryDate, githubOrg, githubRepo) {
    const connection = await db.promise().getConnection();
    try {
      // Ensure column exists
      try {
        await connection.query(
          `ALTER TABLE ds_projects ADD COLUMN expected_delivery_date DATE`
        );
      } catch (err) {
        // Column likely already exists
      }

      const githubUploadService = require('./githubUploadService');
      await githubUploadService.ensureGithubSchema(connection);

      // Insert project
      const [result] = await connection.query(
        'INSERT INTO ds_projects (name, description, start_date, expected_delivery_date, github_org, github_repo) VALUES (?, ?, ?, ?, ?, ?)',
        [name, description || null, startDate || null, expectedDeliveryDate || null, githubOrg || null, githubRepo || null]
      );

      return {
        success: true,
        projectId: result.insertId,
        message: `Project "${name}" created successfully!`,
        stored: {
          startDate: startDate,
          expectedDeliveryDate: expectedDeliveryDate
        }
      };
    } finally {
      connection.release();
    }
  },

  // Update a project
  async updateProject(projectId, name, description, startDate, expectedDeliveryDate) {
    const connection = await db.promise().getConnection();
    try {
      const [result] = await connection.query(
        'UPDATE ds_projects SET name = ?, description = ?, start_date = ?, expected_delivery_date = ? WHERE id = ?',
        [name, description || null, startDate || null, expectedDeliveryDate || null, projectId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Project not found');
      }

      return {
        success: true,
        message: `Project "${name}" updated successfully!`,
        projectId: projectId
      };
    } finally {
      connection.release();
    }
  },

  // Delete a project
  async deleteProject(projectId) {
    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();

      // Temporarily disable foreign key checks during cascade delete
      await connection.query('SET FOREIGN_KEY_CHECKS=0');

      // Get all teams in this project
      const [teams] = await connection.query('SELECT id FROM ds_teams WHERE project_id = ?', [projectId]);

      // Delete tasks for all teams in this project
      for (const team of teams) {
        await connection.query('DELETE FROM ds_tasks WHERE team_id = ?', [team.id]);
      }

      // Delete team assignments
      for (const team of teams) {
        await connection.query('DELETE FROM ds_team_assignments WHERE team_id = ?', [team.id]);
      }

      // Delete teams
      await connection.query('DELETE FROM ds_teams WHERE project_id = ?', [projectId]);

      // Delete project
      const [result] = await connection.query('DELETE FROM ds_projects WHERE id = ?', [projectId]);

      // Re-enable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS=1');

      await connection.commit();

      if (result.affectedRows === 0) {
        throw new Error('Project not found');
      }

      return { success: true, message: 'Project and associated teams deleted successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = projectService;
