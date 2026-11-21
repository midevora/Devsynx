const mysql = require('mysql2');

// First, connect to MySQL without specifying a database
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to MySQL on port 3306');

    // Drop the database if it exists (clears namespace and tableространство issues)
    connection.query('DROP DATABASE IF EXISTS devsynx_db_main', (err) => {
        if (err) {
            console.error('❌ Error dropping database:', err.message);
            process.exit(1);
        }
        console.log('✅ Dropped existing database (cleaning up tablespace issues)');

        // Create fresh database
        connection.query('CREATE DATABASE devsynx_db_main', (err) => {
            if (err) {
                console.error('❌ Error creating database:', err.message);
                process.exit(1);
            }
            console.log('✅ Created fresh devsynx_db_main database');

            // Switch to new database
            connection.changeUser({database: 'devsynx_db_main'}, (err) => {
                if (err) {
                    console.error('❌ Error switching database:', err.message);
                    process.exit(1);
                }
                console.log('✅ Switched to devsynx_db_main\n');

                createTables();
            });
        });
    });

    function createTables() {
        console.log('📝 Creating tables...');

        // Create ds_developers table
        connection.query(`
            CREATE TABLE ds_developers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                role VARCHAR(100)
            )
        `, (err) => {
            if (err) throw err;
            console.log('✅ ds_developers table created');

            // Create ds_projects table
            connection.query(`
                CREATE TABLE ds_projects (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    start_date DATE
                )
            `, (err) => {
                if (err) throw err;
                console.log('✅ ds_projects table created');

                // Create ds_roles table
                connection.query(`
                    CREATE TABLE ds_roles (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        developer_id INT NOT NULL UNIQUE,
                        role_type ENUM('developer', 'team_head', 'manager', 'client') NOT NULL,
                        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (developer_id) REFERENCES ds_developers(id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) throw err;
                    console.log('✅ ds_roles table created');

                    // Create ds_users table
                    connection.query(`
                        CREATE TABLE ds_users (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            email VARCHAR(255) NOT NULL UNIQUE,
                            password VARCHAR(255) NOT NULL,
                            name VARCHAR(255) NOT NULL,
                            role ENUM('manager', 'developer', 'team_head', 'client') NOT NULL,
                            developer_id INT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (developer_id) REFERENCES ds_developers(id) ON DELETE SET NULL
                        )
                    `, (err) => {
                        if (err) throw err;
                        console.log('✅ ds_users table created');

                        // Create ds_teams table
                        connection.query(`
                            CREATE TABLE ds_teams (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                team_name VARCHAR(255) NOT NULL,
                                project_id INT NOT NULL,
                                team_head_id INT NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (project_id) REFERENCES ds_projects(id) ON DELETE CASCADE,
                                FOREIGN KEY (team_head_id) REFERENCES ds_developers(id) ON DELETE CASCADE
                            )
                        `, (err) => {
                            if (err) throw err;
                            console.log('✅ ds_teams table created');

                            // Create ds_team_assignments table
                            connection.query(`
                                CREATE TABLE ds_team_assignments (
                                    id INT AUTO_INCREMENT PRIMARY KEY,
                                    team_id INT NOT NULL,
                                    developer_id INT NOT NULL,
                                    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                    FOREIGN KEY (team_id) REFERENCES ds_teams(id) ON DELETE CASCADE,
                                    FOREIGN KEY (developer_id) REFERENCES ds_developers(id) ON DELETE CASCADE
                                )
                            `, (err) => {
                                if (err) throw err;
                                console.log('✅ ds_team_assignments table created');

                                // Create ds_tasks table
                                connection.query(`
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
                                        FOREIGN KEY (team_id) REFERENCES ds_teams(id) ON DELETE CASCADE,
                                        FOREIGN KEY (developer_id) REFERENCES ds_developers(id) ON DELETE CASCADE,
                                        FOREIGN KEY (assigned_by) REFERENCES ds_developers(id) ON DELETE CASCADE
                                    )
                                `, (err) => {
                                    if (err) throw err;
                                    console.log('✅ ds_tasks table created\n');
                                    insertData();
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    function insertData() {
        console.log('📝 Inserting sample data...');

        // Insert developers
        const developers = [
            ['Alice Johnson', 'alice@devsynx.com', 'Senior Developer'],
            ['Bob Smith', 'bob@devsynx.com', 'Developer'],
            ['Carol Davis', 'carol@devsynx.com', 'Frontend Developer'],
            ['David Wilson', 'david@devsynx.com', 'Backend Developer'],
            ['Eve Martinez', 'eve@devsynx.com', 'Full Stack Developer']
        ];

        connection.query('INSERT INTO ds_developers (name, email, role) VALUES ?', [developers], (err) => {
            if (err) throw err;
            console.log('✅ Inserted 5 sample developers');

            // Insert projects
            const projects = [
                ['E-Commerce Platform', 'Building a scalable e-commerce solution', '2024-01-15'],
                ['Mobile App', 'Cross-platform mobile application', '2024-02-01'],
                ['AI Dashboard', 'Analytics dashboard with ML features', '2024-03-01'],
                ['API Gateway', 'Microservices API gateway', '2024-01-20']
            ];

            connection.query('INSERT INTO ds_projects (name, description, start_date) VALUES ?', [projects], (err) => {
                if (err) throw err;
                console.log('✅ Inserted 4 sample projects');

                // Insert roles
                const roles = [
                    [1, 'team_head'],
                    [2, 'developer'],
                    [3, 'developer'],
                    [4, 'developer'],
                    [5, 'developer']
                ];

                connection.query('INSERT INTO ds_roles (developer_id, role_type) VALUES ?', [roles], (err) => {
                    if (err) throw err;
                    console.log('✅ Assigned developer roles');

                    // Insert manager user
                    connection.query(
                        'INSERT INTO ds_users (email, password, name, role) VALUES (?, ?, ?, ?)',
                        ['manager@devsynx.com', 'manager123', 'DevSynx Manager', 'manager'],
                        (err) => {
                            if (err) throw err;
                            console.log('✅ Manager user created');

                            // Insert team head user
                            connection.query(
                                'INSERT INTO ds_users (email, password, name, role, developer_id) VALUES (?, ?, ?, ?, ?)',
                                ['alice@devsynx.com', 'teamhead123', 'Alice Johnson', 'team_head', 1],
                                (err) => {
                                    if (err) throw err;
                                    console.log('✅ Team head user created (Alice)');

                                    // Insert developer users
                                    const devUsers = [
                                        ['bob@devsynx.com', 'dev123', 'Bob Smith', 'developer', 2],
                                        ['carol@devsynx.com', 'dev123', 'Carol Davis', 'developer', 3],
                                        ['david@devsynx.com', 'dev123', 'David Wilson', 'developer', 4],
                                        ['eve@devsynx.com', 'dev123', 'Eve Martinez', 'developer', 5]
                                    ];

                                    connection.query('INSERT INTO ds_users (email, password, name, role, developer_id) VALUES ?', [devUsers], (err) => {
                                        if (err) throw err;
                                        console.log('✅ Developer users created (Bob, Carol, David, Eve)');

                                        // Create sample team
                                        connection.query(
                                            'INSERT INTO ds_teams (team_name, project_id, team_head_id) VALUES (?, ?, ?)',
                                            ['Frontend Development Team', 1, 1],
                                            (err, result) => {
                                                if (err) throw err;
                                                const teamId = result.insertId;
                                                console.log('✅ Sample team created (Frontend Development Team)');

                                                // Assign team members
                                                const assignments = [
                                                    [teamId, 3],
                                                    [teamId, 4],
                                                    [teamId, 5]
                                                ];

                                                connection.query('INSERT INTO ds_team_assignments (team_id, developer_id) VALUES ?', [assignments], (err) => {
                                                    if (err) throw err;
                                                    console.log('✅ Team members assigned\n');

                                                    // Display summary
                                                    console.log('='.repeat(60));
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
                                                    console.log('  Email:    carol@devsynx.com');
                                                    console.log('  Email:    david@devsynx.com');
                                                    console.log('  Email:    eve@devsynx.com');
                                                    console.log('  Password: dev123 (all developers)\n');

                                                    console.log('='.repeat(60));
                                                    console.log('🎯 Sample Team Setup:');
                                                    console.log('  Team Name: Frontend Development Team');
                                                    console.log('  Project: E-Commerce Platform');
                                                    console.log('  Team Head: Alice Johnson');
                                                    console.log('  Members: Carol Davis, David Wilson, Eve Martinez');
                                                    console.log('='.repeat(60) + '\n');

                                                    connection.end();
                                                    process.exit(0);
                                                });
                                            }
                                        );
                                    });
                                }
                            );
                        }
                    );
                });
            });
        });
    }
});
