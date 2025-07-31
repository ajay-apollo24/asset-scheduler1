//test script to check permissions

const db = require('../backend/config/db');

const checkPermissions = async () => {
  try {
    console.log('🔍 Checking role-permission mappings...');
    
    // Check campaign_manager role permissions
    const result = await db.query(`
      SELECT r.name as role_name, p.name as permission_name 
      FROM roles r 
      JOIN role_permissions rp ON r.id = rp.role_id 
      JOIN permissions p ON rp.permission_id = p.id 
      WHERE r.name = 'campaign_manager'
    `);
    
    console.log('Campaign Manager Permissions:', result.rows);
    
    // Check all roles and their permission counts
    const roleCounts = await db.query(`
      SELECT r.name as role_name, COUNT(rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);
    
    console.log('\nAll Roles and Permission Counts:');
    roleCounts.rows.forEach(row => {
      console.log(`${row.role_name}: ${row.permission_count} permissions`);
    });
    
    // Check if role_permissions table has data
    const totalMappings = await db.query('SELECT COUNT(*) as count FROM role_permissions');
    console.log(`\nTotal role-permission mappings: ${totalMappings.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
  } finally {
    process.exit(0);
  }
};

checkPermissions(); 