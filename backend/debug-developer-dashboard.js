const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'devsynx_db'
});

async function debugDeveloperDashboard() {
  try {
    const connection = await pool.getConnection();
    
    console.log('\n========================================');
    console.log('🔍 DEVELOPER DASHBOARD DEBUG');
    console.log('========================================\n');

    // 1. Check all developers
    console.log('1️⃣ ALL DEVELOPERS:');
    const [developers] = await connection.execute(`
      SELECT id, name, email, role FROM ds_developers ORDER BY id
    `);
    console.table(developers);

    // 2. Check all teams
    console.log('\n2️⃣ ALL TEAMS:');
    const [teams] = await connection.execute(`
      SELECT t.id, t.team_name, t.project_id, t.team_head_id, p.name as project_name 
      FROM ds_teams t 
      LEFT JOIN ds_projects p ON t.project_id = p.id
      ORDER BY t.id
    `);
    console.table(teams);

    // 3. Check team assignments
    console.log('\n3️⃣ TEAM ASSIGNMENTS (developer_id -> team_id):');
    const [assignments] = await connection.execute(`
      SELECT ta.team_id, ta.developer_id, d.name as developer_name, t.team_name 
      FROM ds_team_assignments ta
      JOIN ds_developers d ON ta.developer_id = d.id
      JOIN ds_teams t ON ta.team_id = t.id
      ORDER BY ta.team_id, ta.developer_id
    `);
    console.table(assignments);

    // 4. Check all tasks
    console.log('\n4️⃣ ALL TASKS:');
    const [tasks] = await connection.execute(`
      SELECT 
        t.id, 
        t.task_name, 
        t.team_id,
        t.developer_id,
        d.name as assigned_to,
        d.email as developer_email,
        tm.team_name,
        tm.project_id,
        t.status,
        t.created_at
      FROM ds_tasks t
      LEFT JOIN ds_developers d ON t.developer_id = d.id
      LEFT JOIN ds_teams tm ON t.team_id = tm.id
      ORDER BY t.id DESC
    `);
    console.table(tasks);

    // 5. Check projects
    console.log('\n5️⃣ ALL PROJECTS:');
    const [projects] = await connection.execute(`
      SELECT id, name, description FROM ds_projects ORDER BY id
    `);
    console.table(projects);

    // 6. Summary
    console.log('\n========================================');
    console.log('📊 SUMMARY:');
    console.log('========================================');
    console.log(`✅ Developers: ${developers.length}`);
    console.log(`✅ Teams: ${teams.length}`);
    console.log(`✅ Team Assignments: ${assignments.length}`);
    console.log(`✅ Tasks: ${tasks.length}`);
    console.log(`✅ Projects: ${projects.length}`);

    if (tasks.length === 0) {
      console.log('\n⚠️  WARNING: No tasks found in database!');
      console.log('   Tasks need to be created from the Team Head dashboard.');
    }

    if (assignments.length === 0) {
      console.log('\n⚠️  WARNING: No team assignments found!');
      console.log('   Developers need to be added to teams.');
    }

    console.log('\n========================================\n');

    connection.release();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  process.exit(0);
}

debugDeveloperDashboard();
