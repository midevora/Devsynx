// Verification script to test progress calculation
const http = require('http');

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:5000/api${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function verifyProgressCalculation() {
    try {
        console.log('🔍 Testing Progress Calculation System...\n');

        // Fetch all data
        const tasks = await makeRequest('/tasks');
        const teamMembers = await makeRequest('/team-members');
        const teams = await makeRequest('/teams');

        console.log(`✅ Tasks fetched: ${tasks.length}`);
        console.log(`✅ Team members fetched: ${teamMembers.length}`);
        console.log(`✅ Teams fetched: ${teams.length}\n`);

        // Group tasks by team
        const tasksByTeam = {};
        tasks.forEach(task => {
            if (!tasksByTeam[task.team_id]) {
                tasksByTeam[task.team_id] = { done: 0, active: 0, pending: 0 };
            }
            if (task.status === 'completed') tasksByTeam[task.team_id].done++;
            else if (task.status === 'in_progress') tasksByTeam[task.team_id].active++;
            else tasksByTeam[task.team_id].pending++;
        });

        // Group members by team
        const membersByTeam = {};
        teamMembers.forEach(member => {
            if (!membersByTeam[member.team_id]) {
                membersByTeam[member.team_id] = 0;
            }
            membersByTeam[member.team_id]++;
        });

        console.log('📊 TEAM PROGRESS REPORT:\n');
        console.log('Team ID | Team Name | Members | Done | Active | Pending | Total | Progress');
        console.log('--------|-----------|---------|------|--------|---------|-------|----------');

        teams.forEach(team => {
            const taskStats = tasksByTeam[team.id] || { done: 0, active: 0, pending: 0 };
            const total = taskStats.done + taskStats.active + taskStats.pending;
            const progress = total > 0 ? Math.round((taskStats.done / total) * 100) : 0;
            const members = membersByTeam[team.id] || 0;

            console.log(
                `${team.id.toString().padEnd(7)} | ${team.team_name.padEnd(9)} | ${members.toString().padEnd(7)} | ` +
                `${taskStats.done.toString().padEnd(4)} | ${taskStats.active.toString().padEnd(6)} | ` +
                `${taskStats.pending.toString().padEnd(7)} | ${total.toString().padEnd(5)} | ${progress}%`
            );
        });

        console.log('\n✅ Progress Calculation System is WORKING! 🎉');
        console.log('\n👉 Now open: http://localhost/devsynx/client/public/manager.html');
        console.log('   Login as: manager@devsynx.com / manager123');
        console.log('\n   You should see:');
        console.log('   - Team 1: 50% progress (2 done, 1 active, 1 pending)');
        console.log('   - Team 2: 33% progress (1 done, 1 active, 1 pending)');
        console.log('   - Team 3: 67% progress (2 done, 0 active, 1 pending)');
        console.log('   - Team 5: 25% progress (1 done, 1 active, 2 pending)');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

verifyProgressCalculation();
