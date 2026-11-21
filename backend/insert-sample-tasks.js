// Script to insert sample tasks for testing progress bars
const db = require('./db');

async function insertSampleTasks() {
    try {
        const connection = await db.promise().getConnection();

        // Sample tasks for Team 1 (Frontend Development Team)
        const team1Tasks = [
            { team_id: 1, developer_id: 3, task_name: 'Create Login Component', description: 'Build the login UI component', complexity: 'medium', status: 'completed', assigned_by: 1 },
            { team_id: 1, developer_id: 4, task_name: 'Setup Database Connection', description: 'Configure database for frontend', complexity: 'high', status: 'completed', assigned_by: 1 },
            { team_id: 1, developer_id: 5, task_name: 'Design Dashboard Layout', description: 'Create responsive dashboard', complexity: 'medium', status: 'in_progress', assigned_by: 1 },
            { team_id: 1, developer_id: 3, task_name: 'Add Form Validation', description: 'Implement form validation', complexity: 'low', status: 'pending', assigned_by: 1 },
            { team_id: 1, developer_id: 4, task_name: 'API Integration', description: 'Integrate backend API', complexity: 'high', status: 'completed', assigned_by: 1 },
            { team_id: 1, developer_id: 5, task_name: 'User Authentication', description: 'Implement user auth', complexity: 'high', status: 'in_progress', assigned_by: 1 },
            { team_id: 1, developer_id: 3, task_name: 'Database Optimization', description: 'Optimize queries', complexity: 'high', status: 'completed', assigned_by: 1 },
            { team_id: 1, developer_id: 4, task_name: 'Cache Implementation', description: 'Add caching layer', complexity: 'medium', status: 'completed', assigned_by: 1 },
            { team_id: 1, developer_id: 5, task_name: 'Performance Testing', description: 'Load testing', complexity: 'high', status: 'pending', assigned_by: 1 },
            { team_id: 1, developer_id: 3, task_name: 'Write Unit Tests', description: 'Create test suite', complexity: 'medium', status: 'pending', assigned_by: 1 },
            { team_id: 1, developer_id: 4, task_name: 'Setup CI/CD Pipeline', description: 'Configure deployment', complexity: 'high', status: 'completed', assigned_by: 1 },
            { team_id: 1, developer_id: 5, task_name: 'API Documentation', description: 'Document REST API', complexity: 'low', status: 'in_progress', assigned_by: 1 },
        ];

        const allTasks = team1Tasks;

        console.log('🚀 Inserting sample tasks...');

        for (const task of allTasks) {
            await connection.query(
                `INSERT INTO ds_tasks (team_id, developer_id, task_name, description, complexity, status, assigned_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [task.team_id, task.developer_id, task.task_name, task.description, task.complexity, task.status, task.assigned_by]
            );
        }

        connection.release();
        console.log(`✅ Successfully inserted ${allTasks.length} sample tasks!`);
        console.log('\n📊 Task Summary:');
        console.log('Team 1 (Frontend Development Team): 12 tasks');
        console.log('  - Completed: 5 tasks');
        console.log('  - In Progress: 3 tasks');
        console.log('  - Pending: 4 tasks');
        console.log('  - Progress: 42%');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error inserting tasks:', error.message);
        process.exit(1);
    }
}

insertSampleTasks();
