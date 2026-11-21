const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'devsynx_db'
});

async function checkUsersTable() {
  try {
    const connection = await pool.getConnection();
    
    console.log('\n========================================');
    console.log('🔍 CHECKING DS_USERS TABLE');
    console.log('========================================\n');

    const [users] = await connection.execute(`
      SELECT * FROM ds_users
    `);

    console.log('📋 DS_USERS TABLE:');
    console.table(users);

    console.log('\n✅ Total users: ' + users.length);
    
    console.log('\n📋 DEVELOPERS vs USERS COMPARISON:');
    const [developers] = await connection.execute(`
      SELECT id, name, email, role FROM ds_developers ORDER BY id
    `);

    const [usersTable] = await connection.execute(`
      SELECT id, email, name, role, developer_id FROM ds_users ORDER BY id
    `);

    console.log('\nDevelopers in ds_developers:');
    console.table(developers);
    
    console.log('\nUsers in ds_users:');
    console.table(usersTable);

    // Check which developers don't have users
    console.log('\n🔍 DEVELOPERS WITHOUT USER ACCOUNTS:');
    const devIds = new Set(developers.map(d => d.id));
    const userDevIds = new Set(usersTable.map(u => u.developer_id).filter(id => id));
    
    const missingUsers = Array.from(devIds).filter(id => !userDevIds.has(id));
    if (missingUsers.length > 0) {
      const missingDevelopers = developers.filter(d => missingUsers.includes(d.id));
      console.table(missingDevelopers);
    } else {
      console.log('✅ All developers have user accounts');
    }

    connection.release();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  process.exit(0);
}

checkUsersTable();
