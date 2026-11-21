const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'devsynx_db',
  multipleStatements: true
});

async function checkUsers() {
  try {
    const connection = await pool.getConnection();
    
    console.log('\n=== ALL USERS IN DATABASE ===\n');
    const [users] = await connection.execute('SELECT id, email, name, role FROM ds_users LIMIT 20');
    console.table(users);
    
    console.log('\n=== CHECKING LOGIN TABLE ===\n');
    const tables = await connection.execute("SHOW TABLES LIKE '%login%'");
    if (tables[0].length > 0) {
      console.log('Found login table:', tables[0]);
      const [logins] = await connection.execute('SELECT * FROM ' + tables[0][0]['Tables_in_devsynx_db'] + ' LIMIT 10');
      console.table(logins);
    } else {
      console.log('No login table found');
    }

    console.log('\n=== CHECKING PASSWORD/AUTH IN DS_USERS ===\n');
    const [usersWithPass] = await connection.execute('SELECT id, email, name, role, password FROM ds_users LIMIT 10');
    console.table(usersWithPass);

    connection.release();
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

checkUsers();
