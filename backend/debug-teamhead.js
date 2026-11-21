const db = require('./db');

async function debugTeamHead() {
    const connection = await db.promise().getConnection();
    
    try {
        console.log('\n=== Team Head Debug Info ===\n');
        
        // Get all team heads
        console.log('📋 All Team Heads:');
        const [teamHeads] = await connection.query(
            `SELECT d.* FROM ds_developers d
             INNER JOIN ds_roles r ON d.id = r.developer_id
             WHERE r.role_type = 'team_head'`
        );
        console.log(`Found ${teamHeads.length} team heads`);
        teamHeads.forEach(th => {
            console.log(`   - ${th.name} (${th.email}) - ID: ${th.id}`);
        });
        
        // Get all teams
        console.log('\n📊 All Teams:');
        const [teams] = await connection.query(
            `SELECT t.*, p.name as project_name FROM ds_teams t
             LEFT JOIN ds_projects p ON t.project_id = p.id`
        );
        console.log(`Found ${teams.length} teams`);
        teams.forEach(team => {
            console.log(`   - ${team.team_name} (ID: ${team.id}) - Team Head ID: ${team.team_head_id}, Project: ${team.project_name}`);
        });
        
        // For each team head, get their teams
        console.log('\n🎯 Team Head -> Teams Mapping:');
        for (let th of teamHeads) {
            const [thTeams] = await connection.query(
                `SELECT t.id, t.team_name, p.name as project_name FROM ds_teams t
                 LEFT JOIN ds_projects p ON t.project_id = p.id
                 WHERE t.team_head_id = ?`,
                [th.id]
            );
            console.log(`\n   ${th.name} (${th.email}):`);
            if (thTeams.length === 0) {
                console.log(`     ❌ No teams assigned`);
            } else {
                thTeams.forEach(team => {
                    console.log(`     ✅ ${team.team_name} -> ${team.project_name}`);
                });
            }
        }
        
        console.log('\n✅ Debug complete\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

debugTeamHead();
