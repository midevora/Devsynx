const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'devsynx_db'
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error connecting:', err.message);
        process.exit(1);
    }

    console.log('✅ Connected to database');

    // Check table existence
    console.log('\n📋 Checking ds_developers table:');
    connection.query('SELECT id, name, email, role FROM ds_developers LIMIT 10', (err, results) => {
        if (err) {
            console.error('❌ Error:', err.message);
        } else {
            console.log('✅ developers found:', results.length);
            results.forEach(dev => {
                console.log(`   - ID: ${dev.id}, Name: ${dev.name}, Email: ${dev.email}, Role: ${dev.role}`);
            });
        }

        console.log('\n📋 Checking ds_roles table:');
        connection.query('SELECT id, developer_id, role_type FROM ds_roles LIMIT 20', (err, results) => {
            if (err) {
                console.error('❌ Error:', err.message);
            } else {
                console.log('✅ Roles found:', results.length);
                results.forEach(role => {
                    console.log(`   - ID: ${role.id}, Developer ID: ${role.developer_id}, Role Type: ${role.role_type}`);
                });
            }

            console.log('\n📋 Checking for developers without roles:');
            connection.query(`
                SELECT d.id, d.name, d.email, d.role 
                FROM ds_developers d
                LEFT JOIN ds_roles r ON d.id = r.developer_id
                WHERE r.id IS NULL
            `, (err, results) => {
                if (err) {
                    console.error('❌ Error:', err.message);
                } else {
                    console.log('✅ Developers without roles:', results.length);
                    results.forEach(dev => {
                        console.log(`   - ID: ${dev.id}, Name: ${dev.name}, Email: ${dev.email}, Role: ${dev.role}`);
                    });
                }

                if (results && results.length > 0) {
                    console.log('\n⚠️  Populating missing roles...');
                    
                    let completed = 0;
                    results.forEach(dev => {
                        // Determine role type based on dev.role field
                        let roleType = 'developer';
                        if (dev.role && dev.role.toLowerCase().includes('team head')) {
                            roleType = 'team_head';
                        } else if (dev.role && dev.role.toLowerCase() === 'manager') {
                            roleType = 'manager';
                        }

                        connection.query(
                            'INSERT INTO ds_roles (developer_id, role_type) VALUES (?, ?)',
                            [dev.id, roleType],
                            (err) => {
                                if (err) {
                                    console.error(`❌ Error inserting role for ${dev.name}:`, err.message);
                                } else {
                                    console.log(`✅ Added ${roleType} role for ${dev.name}`);
                                }
                                completed++;
                                if (completed === results.length) {
                                    console.log('\n✅ Done! Testing API endpoints...');
                                    testAPIs();
                                }
                            }
                        );
                    });
                } else {
                    console.log('\n✅ All developers have roles! Testing API endpoints...');
                    testAPIs();
                }
            });
        });
    });
});

function testAPIs() {
    console.log('\n📋 Testing /api/developers endpoint:');
    connection.query(`
        SELECT d.* FROM ds_developers d
        INNER JOIN ds_roles r ON d.id = r.developer_id
        WHERE r.role_type = 'developer'
    `, (err, results) => {
        if (err) {
            console.error('❌ Error:', err.message);
        } else {
            console.log(`✅ Would return ${results.length} developers`);
            results.forEach(dev => {
                console.log(`   - ${dev.name} (${dev.email})`);
            });
        }

        console.log('\n📋 Testing /api/team-heads endpoint:');
        connection.query(`
            SELECT d.* FROM ds_developers d
            INNER JOIN ds_roles r ON d.id = r.developer_id
            WHERE r.role_type = 'team_head'
        `, (err, results) => {
            if (err) {
                console.error('❌ Error:', err.message);
            } else {
                console.log(`✅ Would return ${results.length} team heads`);
                results.forEach(head => {
                    console.log(`   - ${head.name} (${head.email})`);
                });
            }

            connection.end();
            console.log('\n✅ Debug check complete!');
        });
    });
}
