// Test script to verify developer dashboard API responses
// Run this to debug what data is being returned

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

// Mock developer data from login
const mockDeveloper = {
    id: 1,
    email: 'dev1@example.com',
    name: 'Developer One',
    role: 'developer',
    developer_id: 1
};

async function testDeveloperDashboard() {
    console.log('\n🧪 Testing Developer Dashboard API Responses\n');
    console.log('📌 Mock Developer:', mockDeveloper);

    try {
        // 1. Get all teams
        console.log('\n1️⃣ Fetching /api/teams...');
        const teamsRes = await fetch(`${BASE_URL}/teams`);
        const teams = await teamsRes.json();
        console.log('✅ Teams response:', JSON.stringify(teams, null, 2));

        // 2. For each team, get members
        for (const team of teams) {
            console.log(`\n2️⃣ Fetching /api/teams/${team.id}/members...`);
            const membersRes = await fetch(`${BASE_URL}/teams/${team.id}/members`);
            const members = await membersRes.json();
            console.log('✅ Members response:', JSON.stringify(members, null, 2));

            // Check if mock developer is in this team
            const isMember = members.some(m => 
                m.id === mockDeveloper.developer_id || 
                m.email === mockDeveloper.email ||
                m.name === mockDeveloper.name
            );
            console.log(`📌 Is developer a member? ${isMember}`);

            if (isMember) {
                // 3. Get tasks for this team
                console.log(`\n3️⃣ Fetching /api/teams/${team.id}/tasks...`);
                const tasksRes = await fetch(`${BASE_URL}/teams/${team.id}/tasks`);
                const tasks = await tasksRes.json();
                console.log('✅ Tasks response:', JSON.stringify(tasks, null, 2));

                // Check which tasks are for this developer
                const developerTasks = tasks.filter(task => 
                    task.assigned_to === mockDeveloper.name ||
                    task.developer_email === mockDeveloper.email
                );
                console.log(`📌 Developer Tasks (${developerTasks.length} found):`, 
                    JSON.stringify(developerTasks, null, 2));
            }
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    console.log('\n🏁 Test completed\n');
}

// Run the test
testDeveloperDashboard();
