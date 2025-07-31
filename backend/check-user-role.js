//test script to check user role assignment
const db = require('./config/db');

const checkUserRole = async () => {
  try {
    console.log('🔍 Checking user role assignment...');
    
    const email = 'campaigns@healthfirst.com';
    
    // Get user and their role
    const result = await db.query(`
      SELECT 
        u.id as user_id,
        u.email,
        u.organization_id,
        r.id as role_id,
        r.name as role_name,
        r.organization_id as role_org_id,
        o.name as organization_name
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN organizations o ON r.organization_id = o.id
      WHERE u.email = $1
    `, [email]);
    
    console.log('User Role Assignment:', result.rows);
    
    // Check permissions for this specific role
    if (result.rows.length > 0) {
      const roleId = result.rows[0].role_id;
      const permissions = await db.query(`
        SELECT p.name as permission_name
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1
      `, [roleId]);
      
      console.log('Permissions for this role:', permissions.rows);
    }
    
  } catch (error) {
    console.error('❌ Error checking user role:', error);
  } finally {
    process.exit(0);
  }
};

checkUserRole(); 