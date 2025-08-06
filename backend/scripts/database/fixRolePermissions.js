const db = require('./db');

const fixRolePermissions = async () => {
  try {
    console.log('🔧 Fixing role permissions for all organization-specific roles...');

    // Get all roles with their organization_id
    const rolesResult = await db.query(`
      SELECT id, name, organization_id, is_system_role 
      FROM roles 
      ORDER BY name, organization_id
    `);
    
    const roles = rolesResult.rows;
    console.log(`Found ${roles.length} roles`);

    // Define role-permission mappings (same as before)
    const rolePermissionMappings = {
      'platform_admin': ['campaign:create', 'campaign:read', 'campaign:update', 'campaign:delete', 'campaign:approve', 'campaign:pause', 'creative:create', 'creative:read', 'creative:update', 'creative:delete', 'creative:approve', 'user:create', 'user:read', 'user:update', 'user:delete', 'user:assign_roles', 'role:create', 'role:read', 'role:update', 'role:delete', 'role:assign_permissions', 'analytics:read', 'analytics:export', 'analytics:realtime', 'billing:read', 'billing:update', 'billing:manage', 'organization:read', 'organization:update', 'organization:manage', 'platform:admin', 'platform:users', 'platform:organizations', 'platform:analytics'],
      'support': ['campaign:read', 'creative:read', 'user:read', 'analytics:read', 'organization:read', 'billing:read'],
      'sales': ['campaign:read', 'analytics:read', 'organization:read', 'billing:read', 'user:read'],
      'account_manager': ['campaign:read', 'campaign:update', 'creative:read', 'analytics:read', 'organization:read', 'organization:update', 'billing:read', 'billing:update', 'user:read', 'user:update'],
      'org_admin': ['campaign:create', 'campaign:read', 'campaign:update', 'campaign:delete', 'campaign:approve', 'campaign:pause', 'creative:create', 'creative:read', 'creative:update', 'creative:delete', 'creative:approve', 'user:create', 'user:read', 'user:update', 'user:delete', 'user:assign_roles', 'role:create', 'role:read', 'role:update', 'role:delete', 'role:assign_permissions', 'analytics:read', 'analytics:export', 'analytics:realtime', 'billing:read', 'billing:update', 'organization:read', 'organization:update'],
      'marketing_manager': ['campaign:create', 'campaign:read', 'campaign:update', 'campaign:approve', 'campaign:pause', 'creative:create', 'creative:read', 'creative:update', 'creative:approve', 'user:read', 'user:update', 'analytics:read', 'analytics:export', 'organization:read'],
      'campaign_manager': ['campaign:create', 'campaign:read', 'campaign:update', 'campaign:pause', 'creative:read', 'creative:update', 'analytics:read', 'organization:read'],
      'creative_manager': ['campaign:read', 'creative:create', 'creative:read', 'creative:update', 'creative:delete', 'creative:approve', 'analytics:read', 'organization:read'],
      'analyst': ['campaign:read', 'creative:read', 'analytics:read', 'analytics:export', 'organization:read'],
      'data_analyst': ['campaign:read', 'campaign:update', 'creative:read', 'analytics:read', 'analytics:export', 'analytics:realtime', 'organization:read'],
      'digital_manager': ['campaign:create', 'campaign:read', 'campaign:update', 'campaign:pause', 'creative:read', 'creative:update', 'analytics:read', 'analytics:export', 'organization:read'],
      'performance_analyst': ['campaign:read', 'campaign:update', 'creative:read', 'analytics:read', 'analytics:export', 'analytics:realtime', 'organization:read'],
      'requestor': ['campaign:read', 'creative:read', 'analytics:read', 'organization:read']
    };

    // Get all permissions
    const permissionsResult = await db.query('SELECT id, name FROM permissions');
    const permissions = permissionsResult.rows;
    const permissionMap = new Map(permissions.map(p => [p.name, p.id]));

    // Clear existing role-permission mappings
    await db.query('DELETE FROM role_permissions');
    console.log('✅ Cleared existing role-permission mappings');

    // Assign permissions to all roles
    for (const role of roles) {
      const permissionNames = rolePermissionMappings[role.name];
      if (!permissionNames) {
        console.log(`⚠️  No permission mapping found for role: ${role.name}`);
        continue;
      }

      for (const permissionName of permissionNames) {
        const permissionId = permissionMap.get(permissionName);
        if (!permissionId) {
          console.log(`⚠️  Permission not found: ${permissionName}`);
          continue;
        }

        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)`,
          [role.id, permissionId]
        );
      }

      console.log(`✅ Assigned ${permissionNames.length} permissions to ${role.name} (org: ${role.organization_id || 'system'})`);
    }

    // Verify the fix
    const userEmail = 'campaigns@healthfirst.com';
    const userResult = await db.query(`
      SELECT 
        u.id as user_id,
        r.id as role_id,
        r.name as role_name,
        r.organization_id as role_org_id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.email = $1
    `, [userEmail]);

    if (userResult.rows.length > 0) {
      const roleId = userResult.rows[0].role_id;
      const permissionsResult = await db.query(`
        SELECT p.name as permission_name
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1
      `, [roleId]);

      console.log(`\n✅ Verification for ${userEmail}:`);
      console.log(`Role: ${userResult.rows[0].role_name} (ID: ${roleId})`);
      console.log(`Permissions: ${permissionsResult.rows.map(p => p.permission_name).join(', ')}`);
    }

    console.log('\n🎉 Role permissions fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing role permissions:', error);
  } finally {
    process.exit(0);
  }
};

fixRolePermissions(); 