const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'devsynx_db_main',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

async function setupDatabase() {
    try {
        console.log('🔄 Starting complete database setup...\n');

        // Test connection
        const connection = await promisePool.getConnection();
        console.log('✅ Connected to MySQL on port 3306');
        connection.release();

        // Create all tables
        console.log('📝 Creating tables...');
        
        // Create ds_developers table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS ds_developers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                role VARCHAR(100)
            )
        `);
        console.log('✅ ds_developers table ready');

        // Create ds_projects table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS ds_projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                start_date DATE
            )
        `);
        console.log('✅ ds_projects table ready');

        // Create ds_roles table (must be before ds_users)
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS ds_roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                developer_id INT NOT NULL UNIQUE,
                role_type ENUM('developer', 'team_head', 'manager', 'client') NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (developer_id) REFERENCES ds_developers(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ ds_roles table ready');

        // Create ds_users table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS ds_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role ENUM('manager', 'developer', 'team_head', 'client') NOT NULL,
                developer_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (developer_id) REFERENCES ds_developers(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ ds_users table ready');

        // Create ds_teams table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS ds_teams (
                id INT AUTO_INCREMENT PRIMARY KEY,
                team_name VARCHAR(255) NOT NULL,
                project_id INT NOT NULL,
                team_head_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES ds_projects(id) ON DELETE CASCADE,
                FOREIGN KEY (team_head_id) REFERENCES ds_developers(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ ds_teams table ready');

        // Create ds_team_assignments table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS ds_team_assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                team_id INT NOT NULL,
                developer_id INT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES ds_teams(id) ON DELETE CASCADE,
                FOREIGN KEY (developer_id) REFERENCES ds_developers(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ ds_team_assignments table ready');

        // Create ds_tasks table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS ds_tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                team_id INT NOT NULL,
                developer_id INT NOT NULL,
                task_name VARCHAR(255) NOT NULL,
                description TEXT,
                complexity ENUM('low', 'medium', 'high') NOT NULL,
                status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
                assigned_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES ds_teams(id) ON DELETE CASCADE,
                FOREIGN KEY (developer_id) REFERENCES ds_developers(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES ds_developers(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ ds_tasks table ready');

        console.log('\n📝 Clearing existing data...');
        
        // Disable foreign key checks
        await promisePool.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // Clear all tables
        await promisePool.query('TRUNCATE TABLE ds_tasks');
        await promisePool.query('TRUNCATE TABLE ds_team_assignments');
        await promisePool.query('TRUNCATE TABLE ds_teams');
        await promisePool.query('TRUNCATE TABLE ds_roles');
        await promisePool.query('TRUNCATE TABLE ds_users');
        await promisePool.query('TRUNCATE TABLE ds_projects');
        await promisePool.query('TRUNCATE TABLE ds_developers');
        
        // Re-enable foreign key checks
        await promisePool.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('✅ All tables cleared');

        console.log('\n📝 Inserting sample developers...');
        
        // Insert developers
        const developers = [
            ['Alice Johnson', 'alice@devsynx.com', 'Senior Developer'],
            ['Bob Smith', 'bob@devsynx.com', 'Developer'],
            ['Carol Davis', 'carol@devsynx.com', 'Frontend Developer'],
            ['David Wilson', 'david@devsynx.com', 'Backend Developer'],
            ['Eve Martinez', 'eve@devsynx.com', 'Full Stack Developer']
        ];

        await promisePool.query(
            'INSERT INTO ds_developers (name, email, role) VALUES ?',
            [developers]
        );
        console.log('✅ Inserted 5 sample developers');

        console.log('\n📝 Inserting sample projects...');
        
        // Insert projects
        const projects = [
            ['E-Commerce Platform', 'Building a scalable e-commerce solution', '2024-01-15'],
            ['Mobile App', 'Cross-platform mobile application', '2024-02-01'],
            ['AI Dashboard', 'Analytics dashboard with ML features', '2024-03-01'],
            ['API Gateway', 'Microservices API gateway', '2024-01-20']
        ];

        await promisePool.query(
            'INSERT INTO ds_projects (name, description, start_date) VALUES ?',
            [projects]
        );
        console.log('✅ Inserted 4 sample projects');

        console.log('\n📝 Assigning developer roles...');
        
        // Insert roles
        const roles = [
            [1, 'team_head'],   // Alice as Team Head
            [2, 'developer'],   // Bob as Developer
            [3, 'developer'],   // Carol as Developer
            [4, 'developer'],   // David as Developer
            [5, 'developer']    // Eve as Developer
        ];

        await promisePool.query(
            'INSERT INTO ds_roles (developer_id, role_type) VALUES ?',
            [roles]
        );
        console.log('✅ Assigned developer roles');

        console.log('\n📝 Creating user accounts...');
        
        // Insert manager user
        await promisePool.query(
            'INSERT INTO ds_users (email, password, name, role) VALUES (?, ?, ?, ?)',
            ['manager@devsynx.com', 'manager123', 'DevSynx Manager', 'manager']
        );
        console.log('✅ Manager account created');

        // Insert team head user (Alice)
        await promisePool.query(
            'INSERT INTO ds_users (email, password, name, role, developer_id) VALUES (?, ?, ?, ?, ?)',
            ['alice@devsynx.com', 'teamhead123', 'Alice Johnson', 'team_head', 1]
        );
        console.log('✅ Team head account created (Alice)');

        // Insert developer user accounts
        const devUsers = [
            ['bob@devsynx.com', 'dev123', 'Bob Smith', 'developer', 2],
            ['carol@devsynx.com', 'dev123', 'Carol Davis', 'developer', 3],
            ['david@devsynx.com', 'dev123', 'David Wilson', 'developer', 4],
            ['eve@devsynx.com', 'dev123', 'Eve Martinez', 'developer', 5]
        ];

        await promisePool.query(
            'INSERT INTO ds_users (email, password, name, role, developer_id) VALUES ?',
            [devUsers]
        );
        console.log('✅ Developer accounts created (Bob, Carol, David, Eve)');

        console.log('\n📝 Creating sample team...');
        
        // Insert sample team with Alice as team head
        const [teamResult] = await promisePool.query(
            'INSERT INTO ds_teams (team_name, project_id, team_head_id) VALUES (?, ?, ?)',
            ['Frontend Development Team', 1, 1]
        );
        const teamId = teamResult.insertId;
        console.log('✅ Sample team created (Frontend Development Team)');

        console.log('\n📝 Assigning team members...');
        
        // Assign team members
        const assignments = [
            [teamId, 3],  // Carol Davis
            [teamId, 4],  // David Wilson
            [teamId, 5]   // Eve Martinez
        ];

        await promisePool.query(
            'INSERT INTO ds_team_assignments (team_id, developer_id) VALUES ?',
            [assignments]
        );
        console.log('✅ Team members assigned');

        console.log('\n' + '='.repeat(60));
        console.log('✅ DATABASE SETUP COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));
        
        console.log('\n📋 DEFAULT USER CREDENTIALS:\n');
        console.log('MANAGER ACCOUNT:');
        console.log('  Email:    manager@devsynx.com');
        console.log('  Password: manager123\n');
        
        console.log('TEAM HEAD ACCOUNT (Alice):');
        console.log('  Email:    alice@devsynx.com');
        console.log('  Password: teamhead123\n');
        
        console.log('DEVELOPER ACCOUNTS:');
        console.log('  Email:    bob@devsynx.com');
        console.log('  Password: dev123\n');
        console.log('  Email:    carol@devsynx.com');
        console.log('  Password: dev123\n');
        console.log('  Email:    david@devsynx.com');
        console.log('  Password: dev123\n');
        console.log('  Email:    eve@devsynx.com');
        console.log('  Password: dev123\n');

        console.log('='.repeat(60));
        console.log('🎯 Sample Team Setup:');
        console.log('  Team Name: Frontend Development Team');
        console.log('  Project: E-Commerce Platform');
        console.log('  Team Head: Alice Johnson');
        console.log('  Members: Carol Davis, David Wilson, Eve Martinez');
        console.log('='.repeat(60) + '\n');

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during database setup:');
        console.error(error);
        await pool.end();
        process.exit(1);
    }
}

setupDatabase();
