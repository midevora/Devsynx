// Backend Teams Service
// Handles all team-related database operations

const db = require('../db');

const teamService = {
  // Get all teams with project and team head details
  async getAllTeams() {
    const connection = await db.promise().getConnection();
    try {
      const [teams] = await connection.query(
        `SELECT t.id, t.team_name, t.project_id, t.team_head_id, 
                p.name as project_name, d.name as team_head_name 
         FROM ds_teams t 
         LEFT JOIN ds_projects p ON t.project_id = p.id 
         LEFT JOIN ds_developers d ON t.team_head_id = d.id`
      );
      return teams;
    } finally {
      connection.release();
    }
  },

  // Create a new team
  async createTeam(teamName, projectId, teamHeadId, memberIds) {
    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();

      // Insert team
      const [teamResult] = await connection.query(
        'INSERT INTO ds_teams (team_name, project_id, team_head_id) VALUES (?, ?, ?)',
        [teamName, projectId, teamHeadId]
      );
      const newTeamId = teamResult.insertId;

      // Assign members
      if (memberIds && memberIds.length > 0) {
        const assignmentData = memberIds.map(devId => [newTeamId, devId]);
        await connection.query(
          'INSERT INTO ds_team_assignments (team_id, developer_id) VALUES ?',
          [assignmentData]
        );
      }

      await connection.commit();
      return { success: true, teamId: newTeamId, message: `Team ${teamName} created successfully!` };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Delete a team
  async deleteTeam(teamId) {
    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();

      // Delete tasks first (they reference team_id)
      await connection.query('DELETE FROM ds_tasks WHERE team_id = ?', [teamId]);

      // Delete assignments
      await connection.query('DELETE FROM ds_team_assignments WHERE team_id = ?', [teamId]);

      // Delete team
      const [result] = await connection.query('DELETE FROM ds_teams WHERE id = ?', [teamId]);

      await connection.commit();

      if (result.affectedRows === 0) {
        throw new Error('Team not found');
      }

      return { success: true, message: 'Team deleted successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Update a team
  async updateTeam(teamId, teamName, teamHeadId, memberIds) {
    let connection;
    try {
      connection = await db.promise().getConnection();
      console.log('🔗 Connection acquired for update');
      
      await connection.beginTransaction();
      console.log('📤 Transaction started');

      // Update team name and team head
      console.log('📝 Updating team:', { teamId, teamName, teamHeadId });
      const [updateResult] = await connection.query(
        'UPDATE ds_teams SET team_name = ?, team_head_id = ? WHERE id = ?',
        [teamName, teamHeadId, teamId]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error('Team not found');
      }
      console.log('✓ Team updated');

      // Delete existing assignments
      console.log('🗑️ Deleting old assignments for team:', teamId);
      await connection.query('DELETE FROM ds_team_assignments WHERE team_id = ?', [teamId]);
      console.log('✓ Old assignments deleted');

      // Add new assignments
      if (memberIds && memberIds.length > 0) {
        const assignmentData = memberIds.map(devId => [teamId, devId]);
        console.log('➕ Adding new assignments:', assignmentData);
        await connection.query(
          'INSERT INTO ds_team_assignments (team_id, developer_id) VALUES ?',
          [assignmentData]
        );
        console.log('✓ New assignments added');
      }

      await connection.commit();
      console.log('✅ Transaction committed');
      return { success: true, message: 'Team updated successfully' };
    } catch (error) {
      console.error('❌ Error in updateTeam:', error.message, error.code);
      if (connection) {
        try {
          await connection.rollback();
          console.log('⏮️ Transaction rolled back');
        } catch (rollbackError) {
          console.error('❌ Rollback failed:', rollbackError.message);
        }
      }
      throw error;
    } finally {
      if (connection) {
        connection.release();
        console.log('🔌 Connection released');
      }
    }
  }
};

module.exports = teamService;
