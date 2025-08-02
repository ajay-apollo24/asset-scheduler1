// add-reports-permission.js
const db = require('../config/db');

async function addReportsPermission() {
  try {
    console.log('🔧 Adding reports:read permission...');
    
    // 1. Add the permission
    await db.query(`
      INSERT INTO permissions (name, description, resource, action) 
      VALUES ('reports:read', 'Read reports and analytics', 'reports', 'read') 
      ON CONFLICT (name) DO NOTHING
    `);
    
    // 2. Get the permission ID
    const permissionResult = await db.query('SELECT id FROM permissions WHERE name = $1', ['reports:read']);
    const permissionId = permissionResult.rows[0].id;
    
    // 3. Get the platform admin role ID
    const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', ['platform_admin']);
    const roleId = roleResult.rows[0].id;
    
    // 4. Assign permission to role
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id) 
      VALUES ($1, $2) 
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `, [roleId, permissionId]);
    
    console.log('✅ Successfully added reports:read permission to platform_admin role');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

addReportsPermission(); 