const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3307,
    database: 'devsynx_db'
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to devsynx_db');

    // Disable foreign key checks temporarily
    connection.query('SET FOREIGN_KEY_CHECKS = 0', (err) => {
        if (err) throw err;
        console.log('✅ Disabled foreign key checks');

        // Delete all data from tables
        deleteAllData();
    });
});

function deleteAllData() {
    const tables = ['ds_tasks', 'ds_team_assignments', 'ds_teams', 'ds_roles', 'ds_users', 'ds_projects', 'ds_developers'];
    let deleted = 0;

    tables.forEach((table) => {
        connection.query(`TRUNCATE TABLE ${table}`, (err) => {
            if (err && err.code !== 'ER_NO_REFERENCED_TABLE') {
                console.log(`Note: ${table} not ready yet`);
            }
            deleted++;
            if (deleted === tables.length) {
                console.log('✅ Cleared all tables');
                connection.query('SET FOREIGN_KEY_CHECKS = 1', (err) => {
                    if (err) throw err;
                    console.log('✅ Re-enabled foreign key checks');
                    insertData();
                });
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

                            console.log('\n✅ Database initialized successfully!\n');
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
