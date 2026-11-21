#!/usr/bin/env node

const db = require('./db');

async function showAllTables() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 DEVSYNX DATABASE - COMPLETE SCHEMA AND DATA OVERVIEW');
    console.log('='.repeat(80) + '\n');

    const connection = await db.promise().getConnection();
    
    try {
        // Get all table names
        const [tables] = await connection.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'devsynx_db'"
        );

        console.log(`Found ${tables.length} tables:\n`);
        
        // For each table, show structure and data
        for (const tableObj of tables) {
            const tableName = tableObj.TABLE_NAME;
            console.log('\n' + '─'.repeat(80));
            console.log(`📋 TABLE: ${tableName.toUpperCase()}`);
            console.log('─'.repeat(80));

            // Get table structure
            const [structure] = await connection.query(`DESCRIBE ${tableName}`);
            console.log('\nStructure:');
            console.log('┌─ Column Name' + ' '.repeat(20) + '│ Type' + ' '.repeat(30) + '│ Nullable │ Key │ Extra');
            console.log('├' + '─'.repeat(78));
            
            for (const col of structure) {
                const colName = col.Field.padEnd(30);
                const colType = col.Type.padEnd(35);
                const nullable = (col.Null === 'YES' ? 'YES' : 'NO').padEnd(9);
                const key = (col.Key || '-').padEnd(5);
                const extra = col.Extra || '';
                console.log(`│ ${colName}│ ${colType}│ ${nullable}│ ${key}│ ${extra}`);
            }

            // Get row count
            const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            const rowCount = countResult[0].count;
            
            console.log(`\nData: ${rowCount} row(s)`);
            
            if (rowCount > 0) {
                const [data] = await connection.query(`SELECT * FROM ${tableName} LIMIT 10`);
                console.log('\nPreview:');
                console.log(JSON.stringify(data, null, 2));
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ SUMMARY');
        console.log('='.repeat(80));
        console.log(`\nTotal Tables: ${tables.length}`);
        console.log('\nTables:');
        tables.forEach((t, i) => {
            console.log(`  ${i + 1}. ${t.TABLE_NAME}`);
        });

        // Show relationships
        console.log('\n📌 FOREIGN KEY RELATIONSHIPS:');
        console.log('─'.repeat(80));
        
        const relationships = [
            'ds_users → ds_developers (developer_id)',
            'ds_teams → ds_projects (project_id)',
            'ds_teams → ds_developers (team_head_id)',
            'ds_team_assignments → ds_teams (team_id)',
            'ds_team_assignments → ds_developers (developer_id)',
            'ds_roles → ds_developers (developer_id)',
            'ds_tasks → ds_teams (team_id)',
            'ds_tasks → ds_developers (developer_id)',
            'ds_tasks → ds_developers (assigned_by)'
        ];
        
        relationships.forEach(rel => {
            console.log(`  • ${rel}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

showAllTables();
