const db = require('./db');

async function checkDatabase() {
    const connection = await db.promise().getConnection();
    
    try {
        console.log('\n=== Database Schema Check ===\n');
        
        // Check table structure
        const [columns] = await connection.query(`DESCRIBE ds_projects`);
        console.log('📋 ds_projects columns:');
        columns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type}`);
        });
        
        // Check existing projects
        console.log('\n📊 Existing projects:');
        const [projects] = await connection.query('SELECT * FROM ds_projects LIMIT 5');
        projects.forEach(proj => {
            console.log(`   - ${proj.name}`);
            console.log(`     • Start Date: ${proj.start_date}`);
            console.log(`     • Expected Delivery: ${proj.expected_delivery_date}`);
        });
        
        console.log('\n✅ Check complete\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

checkDatabase();
