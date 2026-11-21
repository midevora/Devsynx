const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to MySQL');

    connection.query('CREATE DATABASE IF NOT EXISTS devsynx_db', (err) => {
        if (err) throw err;
        console.log('✅ Database created');

        connection.changeUser({database: 'devsynx_db'}, () => {
            console.log('✅ Switched to devsynx_db');

            // Drop tables
            connection.query('DROP TABLE IF EXISTS ds_tasks', () => {
                connection.query('DROP TABLE IF EXISTS ds_team_assignments', () => {
                    connection.query('DROP TABLE IF EXISTS ds_teams', () => {
                        connection.query('DROP TABLE IF EXISTS ds_projects', () => {
                            connection.query('DROP TABLE IF EXISTS ds_roles', () => {
                                connection.query('DROP TABLE IF EXISTS ds_developers', () => {
                                    connection.query('DROP TABLE IF EXISTS ds_users', () => {
                                        console.log('✅ Dropped existing tables');

                                // Create ds_developers
                                connection.query(`
                                    CREATE TABLE ds_developers (
                                        id INT AUTO_INCREMENT PRIMARY KEY,
                                        name VARCHAR(255) NOT NULL,
                                        email VARCHAR(255),
                                        role VARCHAR(100)
                                    )
                                `, () => {
                                    console.log('✅ Created ds_developers table');

                                    // Create ds_projects
                                    connection.query(`
                                        CREATE TABLE ds_projects (
                                            id INT AUTO_INCREMENT PRIMARY KEY,
                                            name VARCHAR(255) NOT NULL,
                                            description TEXT,
                                            start_date DATE
                                        )
                                    `, () => {
                                        console.log('✅ Created ds_projects table');

                                        // Create ds_teams
                                        connection.query(`
                                            CREATE TABLE ds_teams (
                                                id INT AUTO_INCREMENT PRIMARY KEY,
                                                team_name VARCHAR(255) NOT NULL,
                                                project_id INT NOT NULL,
                                                team_head_id INT NOT NULL,
                                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                FOREIGN KEY (project_id) REFERENCES ds_projects(id),
                                                FOREIGN KEY (team_head_id) REFERENCES ds_developers(id)
                                            )
                                        `, () => {
                                            console.log('✅ Created ds_teams table');

                                            // Create ds_team_assignments
                                            connection.query(`
                                                CREATE TABLE ds_team_assignments (
                                                    id INT AUTO_INCREMENT PRIMARY KEY,
                                                    team_id INT NOT NULL,
                                                    developer_id INT NOT NULL,
                                                    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                    FOREIGN KEY (team_id) REFERENCES ds_teams(id),
                                                    FOREIGN KEY (developer_id) REFERENCES ds_developers(id)
                                                )
                                            `, () => {
                                                console.log('✅ Created ds_team_assignments table');

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
                                                        FOREIGN KEY (developer_id) REFERENCES ds_developers(id)
                                                    )
                                                `, () => {
                                                    console.log('✅ Created ds_users table');

                                                    // Create ds_roles table - tracks team heads
                                                    connection.query(`
                                                        CREATE TABLE ds_roles (
                                                            id INT AUTO_INCREMENT PRIMARY KEY,
                                                            developer_id INT NOT NULL UNIQUE,
                                                            role_type ENUM('developer', 'team_head', 'manager', 'client') NOT NULL,
                                                            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                            FOREIGN KEY (developer_id) REFERENCES ds_developers(id)
                                                        )
                                                    `, () => {
                                                        console.log('✅ Created ds_roles table');

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
                                                                FOREIGN KEY (team_id) REFERENCES ds_teams(id),
                                                                FOREIGN KEY (developer_id) REFERENCES ds_developers(id),
                                                                FOREIGN KEY (assigned_by) REFERENCES ds_developers(id)
                                                            )
                                                        `, () => {
                                                            console.log('✅ Created ds_tasks table');
                                                            insertData();
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

function insertData() {
    // Insert default manager
    connection.query(
        'INSERT INTO ds_users (email, password, name, role) VALUES (?, ?, ?, ?)',
        ['manager@devsynx.com', 'manager123', 'DevSynx Manager', 'manager'],
        (err) => {
            if (err && err.code !== 'ER_DUP_ENTRY') console.log(err);
            console.log('✅ Default manager user ready');

            // Insert developers
            const developers = [
                ['Alice Johnson','alice@devsynx.com', 'Senior Developer'],
                ['Bob Smith', 'bob@devsynx.com', 'Developer'],
                ['Carol Davis', 'carol@devsynx.com', 'Frontend Developer'],
                ['David Wilson', 'david@devsynx.com', 'Backend Developer'],
                ['Eve Martinez', 'eve@devsynx.com', 'Full Stack Developer']
            ];

            connection.query(
                'INSERT INTO ds_developers (name, email, role) VALUES ?',
                [developers],
                (err) => {
                    if (err) throw err;
                    console.log('✅ Inserted 5 sample developers');

                    // Insert projects
                    const projects = [
                        ['E-Commerce Platform', 'Building a scalable e-commerce solution', '2024-01-15'],
                        ['Mobile App', 'Cross-platform mobile application', '2024-02-01'],
                        ['AI Dashboard', 'Analytics dashboard with ML features', '2024-03-01'],
                        ['API Gateway', 'Microservices API gateway', '2024-01-20']
                    ];

                    connection.query(
                        'INSERT INTO ds_projects (name, description, start_date) VALUES ?',
                        [projects],
                        (err) => {
                            if (err) throw err;
                            console.log('✅ Inserted 4 sample projects');

                            // Insert roles for developers and team heads
                            const roles = [
                                [1, 'team_head'],  // Alice as Team Head
                                [2, 'developer'],  // Bob as Developer
                                [3, 'developer'],  // Carol as Developer
                                [4, 'developer'],  // David as Developer
                                [5, 'developer']   // Eve as Developer
                            ];

                            connection.query(
                                'INSERT INTO ds_roles (developer_id, role_type) VALUES ?',
                                [roles],
                                (err) => {
                                    if (err) throw err;
                                    console.log('✅ Inserted developer roles');

                                    // Insert team head user (using Alice as team head)
                                    connection.query(
                                        'INSERT INTO ds_users (email, password, name, role, developer_id) VALUES (?, ?, ?, ?, ?)',
                                        ['alice@devsynx.com', 'teamhead123', 'Alice Johnson', 'team_head', 1],
                                        (err) => {
                                            if (err && err.code !== 'ER_DUP_ENTRY') console.log(err);
                                            console.log('✅ Team head user created');

                                            // Create sample team with Alice as team head
                                            connection.query(
                                                'INSERT INTO ds_teams (team_name, project_id, team_head_id) VALUES (?, ?, ?)',
                                                ['Frontend Development Team', 1, 1],
                                                (err, result) => {
                                                    if (err) throw err;
                                                    const teamId = result.insertId;
                                                    console.log('✅ Sample team created');

                                                    // Assign team members
                                                    const assignments = [
                                                        [teamId, 3],  // Carol Davis
                                                        [teamId, 4],  // David Wilson
                                                        [teamId, 5]   // Eve Martinez
                                                    ];

                                                    connection.query(
                                                        'INSERT INTO ds_team_assignments (team_id, developer_id) VALUES ?',
                                                        [assignments],
                                                        (err) => {
                                                            if (err) throw err;
                                                            console.log('✅ Sample team assignments created');
                                                            
                                                            console.log('\n✅ Database setup completed successfully!');
                                                            console.log('\n📝 Default User Credentials:');
                                                            console.log('   Manager:');
                                                            console.log('     Email: manager@devsynx.com');
                                                            console.log('     Password: manager123');
                                                            console.log('\n   Team Head (Alice):');
                                                            console.log('     Email: alice@devsynx.com');
                                                            console.log('     Password: teamhead123');
                                                            connection.end();
                                                            process.exit(0);
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
}
});
});
