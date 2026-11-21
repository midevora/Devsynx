const mysql = require('mysql2/promise');

async function setupDatabase() {
    try {
        // Connect without database first
        let connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });
        console.log('✅ Connected to MySQL');

        // Create database
        await connection.query('CREATE DATABASE IF NOT EXISTS devsynx_db');
        console.log('✅ Database created');

        // Change to database
        await connection.changeUser({database: 'devsynx_db'});
        console.log('✅ Switched to devsynx_db');

        // Disable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Drop existing tables
        const tables = ['ds_tasks', 'ds_team_assignments', 'ds_teams', 'ds_projects', 'ds_roles', 'ds_developers', 'ds_users'];
        for (const table of tables) {
            await connection.query(`DROP TABLE IF EXISTS ${table}`);
        }

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ Dropped existing tables');

        // Create ds_developers table
        await connection.query(`
            CREATE TABLE ds_developers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                role VARCHAR(100)
            )
        `);
        console.log('✅ Created ds_developers table');

        // Create ds_projects table
        await connection.query(`
            CREATE TABLE ds_projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                start_date DATE
            )
        `);
        console.log('✅ Created ds_projects table');

        // Create ds_teams table
        await connection.query(`
            CREATE TABLE ds_teams (
                id INT AUTO_INCREMENT PRIMARY KEY,
                team_name VARCHAR(255) NOT NULL,
                project_id INT NOT NULL,
                team_head_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES ds_projects(id),
                FOREIGN KEY (team_head_id) REFERENCES ds_developers(id)
            )
        `);
        console.log('✅ Created ds_teams table');

        // Create ds_team_assignments table
        await connection.query(`
            CREATE TABLE ds_team_assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                team_id INT NOT NULL,
                developer_id INT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES ds_teams(id),
                FOREIGN KEY (developer_id) REFERENCES ds_developers(id)
            )
        `);
        console.log('✅ Created ds_team_assignments table');

        // Create ds_users table
        await connection.query(`
            CREATE TABLE ds_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role ENUM('manager', 'developer', 'team_head', 'client') NOT NULL,
                developer_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (developer_id) REFERENCES ds_developers(id)
            )
        `);
        console.log('✅ Created ds_users table');

        // Create ds_roles table
        await connection.query(`
            CREATE TABLE ds_roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                developer_id INT NOT NULL UNIQUE,
                role_type ENUM('developer', 'team_head', 'manager', 'client') NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (developer_id) REFERENCES ds_developers(id)
            )
        `);
        console.log('✅ Created ds_roles table');

        // Create ds_tasks table
        await connection.query(`
            CREATE TABLE ds_tasks (
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
                FOREIGN KEY (team_id) REFERENCES ds_teams(id),
                FOREIGN KEY (developer_id) REFERENCES ds_developers(id),
                FOREIGN KEY (assigned_by) REFERENCES ds_developers(id)
            )
        `);
        console.log('✅ Created ds_tasks table');

        // Insert data
        console.log('\n📝 Inserting sample data...\n');

        // Insert manager
        await connection.query(
            'INSERT INTO ds_users (email, password, name, role) VALUES (?, ?, ?, ?)',
            ['manager@devsynx.com', 'manager123', 'DevSynx Manager', 'manager']
        );
        console.log('✅ Manager user created');

        // Insert developers
        const developers = [
            ['Alice Johnson', 'alice@devsynx.com', 'Senior Developer'],
            ['Bob Smith', 'bob@devsynx.com', 'Developer'],
            ['Carol Davis', 'carol@devsynx.com', 'Frontend Developer'],
            ['David Wilson', 'david@devsynx.com', 'Backend Developer'],
            ['Eve Martinez', 'eve@devsynx.com', 'Full Stack Developer']
        ];

        const devResults = [];
        for (const [name, email, role] of developers) {
            const [result] = await connection.query(
                'INSERT INTO ds_developers (name, email, role) VALUES (?, ?, ?)',
                [name, email, role]
            );
            devResults.push({id: result.insertId, name, email, role});
            console.log(`✅ Developer created: ${name}`);
        }

        // Insert project
        const [projectResult] = await connection.query(
            'INSERT INTO ds_projects (name, description, start_date) VALUES (?, ?, ?)',
            ['DevSynx Platform', 'Main platform development', new Date().toISOString().split('T')[0]]
        );
        console.log('✅ Project created');

        // Create ds_roles entries for team head (Alice - ID 1)
        await connection.query(
            'INSERT INTO ds_roles (developer_id, role_type) VALUES (?, ?)',
            [1, 'team_head']
        );
        console.log('✅ Alice registered as team_head');

        // Create ds_roles entries for developers (Bob, Carol, David, Eve - IDs 2-5)
        for (let i = 2; i <= 5; i++) {
            await connection.query(
                'INSERT INTO ds_roles (developer_id, role_type) VALUES (?, ?)',
                [i, 'developer']
            );
        }
        console.log('✅ Other developers registered');

        // Insert team head user
        await connection.query(
            'INSERT INTO ds_users (email, password, name, role, developer_id) VALUES (?, ?, ?, ?, ?)',
            ['alice@devsynx.com', 'teamhead123', 'Alice Johnson', 'team_head', 1]
        ).catch(e => console.log('ℹ️  Alice user already exists'));

        // Insert developer users
        for (let i = 2; i <= 5; i++) {
            const dev = devResults[i - 1];
            await connection.query(
                'INSERT INTO ds_users (email, password, name, role, developer_id) VALUES (?, ?, ?, ?, ?)',
                [dev.email, 'dev123', dev.name, 'developer', dev.id]
            ).catch(e => console.log(`ℹ️  ${dev.name} user already exists`));
        }
        console.log('✅ Developer users created');

        // Create sample team
        const [teamResult] = await connection.query(
            'INSERT INTO ds_teams (team_name, project_id, team_head_id) VALUES (?, ?, ?)',
            ['Frontend Development Team', projectResult.insertId, 1]
        );
        console.log('✅ Sample team created');

        // Assign team members  
        const assignments = [[teamResult.insertId, 3], [teamResult.insertId, 4], [teamResult.insertId, 5]];
        for (const [teamId, devId] of assignments) {
            await connection.query(
                'INSERT INTO ds_team_assignments (team_id, developer_id) VALUES (?, ?)',
                [teamId, devId]
            );
        }
        console.log('✅ Team assignments created');

        console.log('\n✅ Database setup completed successfully!');
        console.log('\n📝 Default User Credentials:');
        console.log('   Manager:');
        console.log('     Email: manager@devsynx.com');
        console.log('     Password: manager123');
        console.log('\n   Team Head (Alice):');
        console.log('     Email: alice@devsynx.com');
        console.log('     Password: teamhead123');
        console.log('\n   Developers (Password: dev123):');
        console.log('     - bob@devsynx.com');
        console.log('     - carol@devsynx.com');
        console.log('     - david@devsynx.com');
        console.log('     - eve@devsynx.com');

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

setupDatabase();
