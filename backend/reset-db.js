const mysql = require('mysql2');

// Connect to MySQL without database specified
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3307
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to MySQL');

    // Drop and recreate database
    connection.query('DROP DATABASE IF EXISTS devsynx_db', (err) => {
        if (err) throw err;
        console.log('✅ Dropped existing database');

        connection.query('CREATE DATABASE devsynx_db', (err) => {
            if (err) throw err;
            console.log('✅ Created new devsynx_db');

            connection.changeUser({database: 'devsynx_db'}, (err) => {
                if (err) throw err;
                console.log('✅ Switched to devsynx_db');
                
                createTables();
            });
        });
    });
});

function createTables() {
    const queries = [
        `CREATE TABLE ds_developers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            role VARCHAR(100)
        )`,
        
        `CREATE TABLE ds_projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            start_date DATE,
            expected_delivery_date DATE
        )`,
        
        `CREATE TABLE ds_teams (
            id INT AUTO_INCREMENT PRIMARY KEY,
            team_name VARCHAR(255) NOT NULL,
            project_id INT NOT NULL,
            team_head_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES ds_projects(id),
            FOREIGN KEY (team_head_id) REFERENCES ds_developers(id)
        )`,
        
        `CREATE TABLE ds_team_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            team_id INT NOT NULL,
            developer_id INT NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES ds_teams(id),
            FOREIGN KEY (developer_id) REFERENCES ds_developers(id)
        )`,
        
        `CREATE TABLE ds_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role ENUM('manager', 'developer', 'team_head', 'client') NOT NULL,
            developer_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (developer_id) REFERENCES ds_developers(id)
        )`,
        
        `CREATE TABLE ds_roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            developer_id INT NOT NULL UNIQUE,
            role_type ENUM('developer', 'team_head', 'manager', 'client') NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (developer_id) REFERENCES ds_developers(id)
        )`,
        
        `CREATE TABLE ds_tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            team_id INT NOT NULL,
            developer_id INT NOT NULL,
            task_name VARCHAR(255) NOT NULL,
            description TEXT,
            complexity ENUM('low', 'medium', 'high') NOT NULL,
            status ENUM('pending', 'in_progress', 'completed', 'active', 'done', 'ongoing') DEFAULT 'pending',
            assigned_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES ds_teams(id),
            FOREIGN KEY (developer_id) REFERENCES ds_developers(id),
            FOREIGN KEY (assigned_by) REFERENCES ds_developers(id)
        )`
    ];

    let completed = 0;

    queries.forEach((query) => {
        connection.query(query, (err) => {
            if (err) throw err;
            completed++;
            if (completed === queries.length) {
                console.log('✅ All tables created');
                insertData();
            }
        });
    });
}

function insertData() {
    console.log('\n📝 Inserting default data...');

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
        console.log('✅ Inserted 5 developers');

        // Insert projects
        const projects = [
            ['E-Commerce Platform', 'Building a scalable e-commerce solution', '2024-01-15', '2024-06-15'],
            ['Mobile App', 'Cross-platform mobile application', '2024-02-01', '2024-07-01'],
            ['AI Dashboard', 'Analytics dashboard with ML features', '2024-03-01', '2024-08-01'],
            ['API Gateway', 'Microservices API gateway', '2024-01-20', '2024-05-20']
        ];

        connection.query('INSERT INTO ds_projects (name, description, start_date, expected_delivery_date) VALUES ?', [projects], (err) => {
            if (err) throw err;
            console.log('✅ Inserted 4 projects');

            // Insert manager user
            connection.query('INSERT INTO ds_users (email, password, name, role) VALUES (?, ?, ?, ?)', 
                ['manager@devsynx.com', 'manager123', 'DevSynx Manager', 'manager'], (err) => {
                if (err) throw err;
                console.log('✅ Created manager user');

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
                    console.log('✅ Inserted roles');

                    // Insert team head user
                    connection.query('INSERT INTO ds_users (email, password, name, role, developer_id) VALUES (?, ?, ?, ?, ?)',
                        ['alice@devsynx.com', 'teamhead123', 'Alice Johnson', 'team_head', 1], (err) => {
                        if (err) throw err;
                        console.log('✅ Created team head user');

                        // Insert developer users
                        const devUsers = [
                            ['bob@devsynx.com', 'dev123', 'Bob Smith', 'developer', 2],
                            ['carol@devsynx.com', 'dev123', 'Carol Davis', 'developer', 3],
                            ['david@devsynx.com', 'dev123', 'David Wilson', 'developer', 4],
                            ['eve@devsynx.com', 'dev123', 'Eve Martinez', 'developer', 5]
                        ];

                        connection.query('INSERT INTO ds_users (email, password, name, role, developer_id) VALUES ?', [devUsers], (err) => {
                            if (err) throw err;
                            console.log('✅ Created developer users');

                            console.log('\n✅ Database setup complete!\n');
                            console.log('📝 Login Credentials:\n');
                            console.log('   Manager:');
                            console.log('     Email: manager@devsynx.com');
                            console.log('     Password: manager123\n');
                            console.log('   Team Head:');
                            console.log('     Email: alice@devsynx.com');
                            console.log('     Password: teamhead123\n');
                            console.log('   Developer:');
                            console.log('     Email: bob@devsynx.com');
                            console.log('     Password: dev123\n');

                            connection.end();
                            process.exit(0);
                        });
                    });
                });
            });
        });
    });
}
