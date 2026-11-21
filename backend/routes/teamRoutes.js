// routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const teamService = require('../services/teamService');
const projectService = require('../services/projectService');
const githubUploadService = require('../services/githubUploadService');

async function ensureClientProjectAccessTable(connection) {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS ds_client_projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_email VARCHAR(255) NOT NULL,
            project_id INT NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_client_project (client_email, project_id),
            FOREIGN KEY (project_id) REFERENCES ds_projects(id) ON DELETE CASCADE
        )
    `);
}

async function requireManager(connection, email) {
    if (!email) {
        return false;
    }
    const [rows] = await connection.query(
        'SELECT id FROM ds_users WHERE email = ? AND role = ? LIMIT 1',
        [email, 'manager']
    );
    return rows.length > 0;
}

// GET company GitHub settings. The token is never returned to the browser.
router.get('/github-settings', async (req, res) => {
    let connection;
    try {
        connection = await db.promise().getConnection();
        if (!await requireManager(connection, req.query.manager_email)) {
            return res.status(403).json({ error: 'Manager access required' });
        }
        const settings = await githubUploadService.getGithubSettings(connection);
        res.json({
            github_org: settings?.github_org || '',
            github_repo: settings?.github_repo || '',
            has_token: Boolean(settings?.github_token),
            updated_by: settings?.updated_by || null,
            updated_at: settings?.updated_at || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// PUT company GitHub settings. An empty token preserves the existing token.
router.put('/github-settings', async (req, res) => {
    const { manager_email, github_org, github_repo, github_token } = req.body;
    let connection;
    try {
        connection = await db.promise().getConnection();
        if (!await requireManager(connection, manager_email)) {
            return res.status(403).json({ error: 'Manager access required' });
        }
        if (!github_org || !github_repo) {
            return res.status(400).json({ error: 'GitHub organization and repository are required' });
        }
        const settings = await githubUploadService.saveGithubSettings(connection, {
            githubOrg: github_org.trim(),
            githubRepo: github_repo.trim(),
            githubToken: (github_token || '').trim(),
            updatedBy: manager_email
        });
        res.json({
            success: true,
            message: 'Company GitHub account saved',
            github_org: settings.github_org,
            github_repo: settings.github_repo,
            has_token: Boolean(settings.github_token)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// GET all developers
router.get('/developers', async (req, res) => {
    try {
        const connection = await db.promise().getConnection();
        const [developers] = await connection.query(
            `SELECT d.* FROM ds_developers d
             INNER JOIN ds_roles r ON d.id = r.developer_id
             WHERE r.role_type = 'developer'`
        );
        connection.release();
        res.json(developers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all team heads
router.get('/team-heads', async (req, res) => {
    try {
        const connection = await db.promise().getConnection();
        const [teamHeads] = await connection.query(
            `SELECT d.* FROM ds_developers d
             INNER JOIN ds_roles r ON d.id = r.developer_id
             WHERE r.role_type = 'team_head'`
        );
        connection.release();
        res.json(teamHeads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all projects
router.get('/projects', async (req, res) => {
    try {
        const projects = await projectService.getAllProjects();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET client dashboard data for assigned projects only
router.get('/client/dashboard/:email', async (req, res) => {
    const { email } = req.params;

    if (!email) {
        return res.status(400).json({ error: 'Client email is required' });
    }

    let connection;
    try {
        connection = await db.promise().getConnection();
        await ensureClientProjectAccessTable(connection);

        const [projects] = await connection.query(
            `SELECT
                p.id,
                p.name,
                p.description,
                p.start_date,
                p.expected_delivery_date,
                COALESCE(COUNT(DISTINCT t.id), 0) AS total_tasks,
                COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                COALESCE(SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress_tasks,
                COALESCE(SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_tasks,
                MAX(t.updated_at) AS last_update
             FROM ds_client_projects cp
             INNER JOIN ds_projects p ON p.id = cp.project_id
             LEFT JOIN ds_teams tm ON tm.project_id = p.id
             LEFT JOIN ds_tasks t ON t.team_id = tm.id
             WHERE cp.client_email = ?
             GROUP BY p.id, p.name, p.description, p.start_date, p.expected_delivery_date
             ORDER BY COALESCE(MAX(t.updated_at), p.start_date) DESC`,
            [email]
        );

        const normalizedProjects = projects.map((project) => {
            const totalTasks = Number(project.total_tasks) || 0;
            const completedTasks = Number(project.completed_tasks) || 0;
            const inProgressTasks = Number(project.in_progress_tasks) || 0;
            const pendingTasks = Number(project.pending_tasks) || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return {
                ...project,
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                in_progress_tasks: inProgressTasks,
                pending_tasks: pendingTasks,
                progress_percent: progress,
                last_update: project.last_update || null
            };
        });

        const overall = normalizedProjects.reduce((accumulator, project) => {
            accumulator.totalProjects += 1;
            accumulator.totalTasks += project.total_tasks;
            accumulator.completedTasks += project.completed_tasks;
            accumulator.inProgressTasks += project.in_progress_tasks;
            accumulator.pendingTasks += project.pending_tasks;
            return accumulator;
        }, {
            totalProjects: 0,
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            pendingTasks: 0
        });

        const overallProgress = overall.totalTasks > 0
            ? Math.round((overall.completedTasks / overall.totalTasks) * 100)
            : 0;

        res.json({
            success: true,
            projects: normalizedProjects,
            summary: {
                ...overall,
                overallProgress
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// GET all teams
router.get('/teams', async (req, res) => {
    try {
        const teams = await teamService.getAllTeams();
        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE a team
router.delete('/teams/:id', async (req, res) => {
    const teamId = req.params.id;
    try {
        const result = await teamService.deleteTeam(teamId);
        res.json(result);
    } catch (error) {
        if (error.message === 'Team not found') {
            return res.status(404).json({ error: 'Team not found' });
        }
        res.status(500).json({ error: error.message });
    }
});

// DELETE a project
router.delete('/projects/:id', async (req, res) => {
    const projectId = req.params.id;
    try {
        const result = await projectService.deleteProject(projectId);
        res.json(result);
    } catch (error) {
        if (error.message === 'Project not found') {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.status(500).json({ error: error.message });
    }
});

// GET all registered clients
router.get('/clients', async (req, res) => {
    let connection;
    try {
        connection = await db.promise().getConnection();
        const [clients] = await connection.query(
            'SELECT id, email, name FROM ds_users WHERE role = ? ORDER BY name ASC',
            ['client']
        );
        res.json({ clients });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// POST create a new project
router.post('/create-project', async (req, res) => {
    const {
        name,
        description,
        startDate,
        start_date,
        expectedDeliveryDate,
        expected_delivery_date,
        client_email,
        client_id,
        github_org,
        github_repo
    } = req.body;

    const normalizedName = (name || '').trim();
    const normalizedStartDate = startDate || start_date || null;
    const normalizedExpectedDeliveryDate = expectedDeliveryDate || expected_delivery_date || null;

    if (!normalizedName) {
        return res.status(400).json({ error: 'Project name is required' });
    }

    if (!client_email && !client_id) {
        return res.status(400).json({ error: 'Please select a registered client for this project' });
    }

    let connection;
    try {
        connection = await db.promise().getConnection();
        await ensureClientProjectAccessTable(connection);

        let clientEmail = null;
        if (client_id) {
            const [clientRows] = await connection.query(
                'SELECT email FROM ds_users WHERE id = ? AND role = ? LIMIT 1',
                [client_id, 'client']
            );
            if (clientRows.length === 0) {
                return res.status(400).json({ error: 'Please select a registered client account' });
            }
            clientEmail = clientRows[0].email;
        } else {
            const [clientRows] = await connection.query(
                'SELECT email FROM ds_users WHERE email = ? AND role = ? LIMIT 1',
                [client_email, 'client']
            );
            if (clientRows.length === 0) {
                return res.status(400).json({ error: 'Please select a registered client account' });
            }
            clientEmail = clientRows[0].email;
        }

        const result = await projectService.createProject(
            normalizedName,
            description || null,
            normalizedStartDate,
            normalizedExpectedDeliveryDate,
            github_org || null,
            github_repo || null
        );

        await connection.query(
            'INSERT IGNORE INTO ds_client_projects (client_email, project_id) VALUES (?, ?)',
            [clientEmail, result.projectId]
        );

        res.status(201).json({
            success: true,
            message: `Project "${normalizedName}" created successfully!`,
            projectId: result.projectId,
            clientEmail
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// POST create a new team
router.post('/create-team', async (req, res) => {
    // Handle both camelCase (from frontend) and snake_case formats
    const { teamName, team_name, projectId, project_id, teamHeadId, team_head_id, members, member_ids } = req.body;

    const finalTeamName = teamName || team_name;
    const finalProjectId = projectId || project_id;
    const finalTeamHeadId = teamHeadId || team_head_id;
    const finalMembers = members || member_ids || [];

    // Validate required fields
    if (!finalTeamName || !finalProjectId || !finalTeamHeadId) {
        return res.status(400).json({ error: 'Team name, project ID, and team head ID are required' });
    }

    if (!Array.isArray(finalMembers) || finalMembers.length === 0) {
        return res.status(400).json({ error: 'At least one team member is required' });
    }

    try {
        const result = await teamService.createTeam(
            finalTeamName,
            finalProjectId,
            finalTeamHeadId,
            finalMembers
        );
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== TEAM HEAD DASHBOARD ROUTES =====

// GET team head dashboard info (teams, members, projects)
router.get('/teamhead/:email/dashboard', async (req, res) => {
    try {
        const teamHeadService = require('../services/teamHeadService');
        const teamHeadInfo = await teamHeadService.getTeamHeadInfo(req.params.email);
        res.json(teamHeadInfo);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// GET team members for a team
router.get('/teams/:teamId/members', async (req, res) => {
    try {
        const teamHeadService = require('../services/teamHeadService');
        const members = await teamHeadService.getTeamMembersWithLoad(req.params.teamId);
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create a task
router.post('/tasks/create', async (req, res) => {
    const { teamId, developerId, taskName, description, complexity, assignedBy, githubFilePath } = req.body;

    if (!teamId || !developerId || !taskName || !complexity) {
        return res.status(400).json({
            error: 'Team ID, Developer ID, Task Name, and Complexity are required'
        });
    }

    let connection;
    try {
        const taskOverloadService = require('../services/taskOverloadService');
        connection = await db.promise().getConnection();
        const overloadAssessment = await taskOverloadService.assessDeveloperLoad(
            connection,
            developerId,
            complexity
        );

        if (overloadAssessment.overloaded) {
            return res.status(409).json({
                error: `Developer is overloaded: current load ${overloadAssessment.current_points}/${overloadAssessment.capacity}, projected load ${overloadAssessment.projected_points}/${overloadAssessment.capacity}`,
                overload: overloadAssessment
            });
        }

        const teamHeadService = require('../services/teamHeadService');
        const result = await teamHeadService.createTask(
            teamId,
            developerId,
            taskName,
            description,
            complexity,
            assignedBy,
            githubFilePath
        );
        res.status(201).json(result);
    } catch (error) {
        if (error.code === 'DEVELOPER_OVERLOADED') {
            return res.status(409).json({
                error: error.message,
                overload: error.details
            });
        }
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// GET all tasks for a team
router.get('/teams/:teamId/tasks', async (req, res) => {
    try {
        const teamHeadService = require('../services/teamHeadService');
        const tasks = await teamHeadService.getTeamTasks(req.params.teamId);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET tasks for a specific developer
router.get('/teams/:teamId/tasks/developer/:developerId', async (req, res) => {
    try {
        const teamHeadService = require('../services/teamHeadService');
        const tasks = await teamHeadService.getDeveloperTasks(
            req.params.teamId,
            req.params.developerId
        );
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update task status
router.put('/tasks/:taskId/status', async (req, res) => {
    const { status } = req.body;

    if (!status || !['pending', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({
            error: 'Valid status required: pending, in_progress, or completed'
        });
    }

    try {
        const teamHeadService = require('../services/teamHeadService');
        const result = await teamHeadService.updateTaskStatus(req.params.taskId, status);
        res.json(result);
    } catch (error) {
        if (error.code === 'GITHUB_NOT_UPLOADED') {
            return res.status(409).json({
                error: error.message,
                github_check: error.details
            });
        }
        if (error.message === 'Task not found') {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(500).json({ error: error.message });
    }
});

// PUT update task (name, complexity, status, description)
router.put('/tasks/:taskId', async (req, res) => {
    const { task_name, complexity, status, description } = req.body;

    if (!task_name || !complexity || !status) {
        return res.status(400).json({
            error: 'Task name, complexity, and status are required'
        });
    }

    if (!['low', 'medium', 'high'].includes(complexity)) {
        return res.status(400).json({
            error: 'Complexity must be: low, medium, or high'
        });
    }

    if (!['pending', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({
            error: 'Status must be: pending, in_progress, or completed'
        });
    }

    try {
        const teamHeadService = require('../services/teamHeadService');
        const result = await teamHeadService.updateTask(req.params.taskId, {
            task_name,
            complexity,
            status,
            description: description || ''
        });
        res.json(result);
    } catch (error) {
        if (error.code === 'GITHUB_NOT_UPLOADED') {
            return res.status(409).json({
                error: error.message,
                github_check: error.details
            });
        }
        if (error.message === 'Task not found') {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(500).json({ error: error.message });
    }
});

// DELETE a task
router.delete('/tasks/:taskId', async (req, res) => {
    try {
        const teamHeadService = require('../services/teamHeadService');
        const result = await teamHeadService.deleteTask(req.params.taskId);
        res.json(result);
    } catch (error) {
        if (error.message === 'Task not found') {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(500).json({ error: error.message });
    }
});

// GET all tasks for a specific project
router.get('/projects/:projectId/tasks', async (req, res) => {
    try {
        const connection = await db.promise().getConnection();
        const [tasks] = await connection.query(
            `SELECT t.id, t.task_name, t.description, t.complexity, t.status,
                    t.github_verified, t.github_check_summary, t.github_evidence_url,
                    d.name as assigned_to, d.email as developer_email,
                    d.id as developer_id,
                    th.name as assigned_by_name,
                    tm.team_name,
                    t.created_at, t.updated_at
             FROM ds_tasks t
             INNER JOIN ds_developers d ON t.developer_id = d.id
             INNER JOIN ds_teams tm ON t.team_id = tm.id
             LEFT JOIN ds_developers th ON t.assigned_by = th.id
             WHERE tm.project_id = ?
             ORDER BY t.created_at DESC`,
            [req.params.projectId]
        );
        connection.release();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all projects with their details
router.get('/projects-all', async (req, res) => {
    try {
        const connection = await db.promise().getConnection();
        const [projects] = await connection.query(
            `SELECT DISTINCT p.*
             FROM ds_projects p
             ORDER BY p.name`
        );
        connection.release();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all tasks across all teams (for manager dashboard)
router.get('/tasks', async (req, res) => {
    try {
        const connection = await db.promise().getConnection();
        const [tasks] = await connection.query(
            `SELECT t.id, t.team_id, t.developer_id, t.task_name, t.description, 
                    t.complexity, t.status, t.github_verified, t.github_check_summary,
                    t.github_evidence_url, t.created_at, t.updated_at,
                    d.name as developer_name, d.email as developer_email,
                    tm.team_name
             FROM ds_tasks t
             LEFT JOIN ds_developers d ON t.developer_id = d.id
             LEFT JOIN ds_teams tm ON t.team_id = tm.id
             ORDER BY t.created_at DESC`
        );
        connection.release();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all team members across all teams (for manager dashboard)
router.get('/team-members', async (req, res) => {
    try {
        const connection = await db.promise().getConnection();
        const [members] = await connection.query(
            `SELECT ta.id, ta.team_id, ta.developer_id, 
                    d.name as developer_name, d.email as developer_email,
                    t.team_name, p.name as project_name
             FROM ds_team_assignments ta
             LEFT JOIN ds_developers d ON ta.developer_id = d.id
             LEFT JOIN ds_teams t ON ta.team_id = t.id
             LEFT JOIN ds_projects p ON t.project_id = p.id
             ORDER BY ta.team_id`
        );
        connection.release();
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update a team
console.log('🚀 Registering PUT /teams/:id route');
router.put('/teams/:id', async (req, res) => {
    console.log('🎯 PUT /teams/:id handler called!');
    const teamId = parseInt(req.params.id);
    const { team_name, team_head_id, member_ids } = req.body;

    console.log('📝 Update team request:', { teamId, team_name, team_head_id, member_ids, types: { team_head_id: typeof team_head_id, member_ids: Array.isArray(member_ids) ? member_ids.map(m => typeof m) : typeof member_ids } });

    if (!team_name || !team_head_id || !member_ids || member_ids.length === 0) {
        return res.status(400).json({ error: 'Team name, team head, and at least one member are required' });
    }

    try {
        // Ensure types are correct
        const cleanTeamHeadId = parseInt(team_head_id);
        const cleanMemberIds = member_ids.map(id => parseInt(id));
        
        console.log('🔄 Converted values:', { cleanTeamHeadId, cleanMemberIds });
        
        const result = await teamService.updateTeam(teamId, team_name, cleanTeamHeadId, cleanMemberIds);
        console.log('✅ Team updated successfully:', result);
        res.json(result);
    } catch (error) {
        console.error('❌ Error updating team:', error.message, error.stack);
        if (error.message === 'Team not found') {
            return res.status(404).json({ error: 'Team not found' });
        }
        res.status(500).json({ error: error.message });
    }
});

// PUT update a project
console.log('📍 Registering PUT /projects/:id');
router.put('/projects/:id', async (req, res) => {
    console.log('🎯 PUT /projects/:id called with ID:', req.params.id, 'Body:', req.body);
    const projectId = parseInt(req.params.id);
    const { name, description, start_date, expected_delivery_date } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
    }

    try {
        const result = await projectService.updateProject(
            projectId,
            name,
            description,
            start_date,
            expected_delivery_date
        );
        console.log('✅ Project update successful:', result);
        res.json(result);
    } catch (error) {
        console.error('❌ Error updating project:', error.message);
        if (error.message === 'Project not found') {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;