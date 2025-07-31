const db = require('./db');

const assignRBACPermissions = async () => {
  try {
    console.log('🔧 Assigning permissions to roles and mapping users...');

    // Get all permissions, roles, and users
    const permissionsResult = await db.query('SELECT id, name, resource, action FROM permissions');
    const rolesResult = await db.query('SELECT id, name, organization_id, is_system_role FROM roles');
    const usersResult = await db.query('SELECT id, email, role, organization_id FROM users');

    const permissions = permissionsResult.rows;
    const roles = rolesResult.rows;
    const users = usersResult.rows;

    console.log(`Found ${permissions.length} permissions, ${roles.length} roles, ${users.length} users`);

    // Define role-permission mappings
    const rolePermissionMappings = {
      // Platform Admin - All permissions
      'platform_admin': permissions.map(p => p.name),

      // Support - Read access to help customers
      'support': [
        'campaign:read', 'creative:read', 'user:read', 'analytics:read',
        'organization:read', 'billing:read'
      ],

      // Sales - Customer data access
      'sales': [
        'campaign:read', 'analytics:read', 'organization:read', 'billing:read',
        'user:read'
      ],

      // Account Manager - Customer relationship management
      'account_manager': [
        'campaign:read', 'campaign:update', 'creative:read', 'analytics:read',
        'organization:read', 'organization:update', 'billing:read', 'billing:update',
        'user:read', 'user:update'
      ],

      // Organization Admin - Full access within organization
      'org_admin': [
        'campaign:create', 'campaign:read', 'campaign:update', 'campaign:delete', 'campaign:approve', 'campaign:pause',
        'creative:create', 'creative:read', 'creative:update', 'creative:delete', 'creative:approve',
        'user:create', 'user:read', 'user:update', 'user:delete', 'user:assign_roles',
        'role:create', 'role:read', 'role:update', 'role:delete', 'role:assign_permissions',
        'analytics:read', 'analytics:export', 'analytics:realtime',
        'billing:read', 'billing:update',
        'organization:read', 'organization:update'
      ],

      // Marketing Manager - Campaign and team management
      'marketing_manager': [
        'campaign:create', 'campaign:read', 'campaign:update', 'campaign:approve', 'campaign:pause',
        'creative:create', 'creative:read', 'creative:update', 'creative:approve',
        'user:read', 'user:update',
        'analytics:read', 'analytics:export',
        'organization:read'
      ],

      // Campaign Manager - Campaign management
      'campaign_manager': [
        'campaign:create', 'campaign:read', 'campaign:update', 'campaign:pause',
        'creative:read', 'creative:update',
        'analytics:read',
        'organization:read'
      ],

      // Creative Manager - Creative asset management
      'creative_manager': [
        'campaign:read',
        'creative:create', 'creative:read', 'creative:update', 'creative:delete', 'creative:approve',
        'analytics:read',
        'organization:read'
      ],

      // Analyst - Analytics and reporting
      'analyst': [
        'campaign:read',
        'creative:read',
        'analytics:read', 'analytics:export',
        'organization:read'
      ],

      // Data Analyst - Advanced analytics
      'data_analyst': [
        'campaign:read', 'campaign:update',
        'creative:read',
        'analytics:read', 'analytics:export', 'analytics:realtime',
        'organization:read'
      ],

      // Digital Manager - Digital campaign management
      'digital_manager': [
        'campaign:create', 'campaign:read', 'campaign:update', 'campaign:pause',
        'creative:read', 'creative:update',
        'analytics:read', 'analytics:export',
        'organization:read'
      ],

      // Performance Analyst - Performance optimization
      'performance_analyst': [
        'campaign:read', 'campaign:update',
        'creative:read',
        'analytics:read', 'analytics:export', 'analytics:realtime',
        'organization:read'
      ],

      // Requestor - Basic access
      'requestor': [
        'campaign:read',
        'creative:read',
        'analytics:read',
        'organization:read'
      ]
    };

    // Assign permissions to roles
    for (const [roleName, permissionNames] of Object.entries(rolePermissionMappings)) {
      const role = roles.find(r => r.name === roleName);
      if (!role) {
        console.log(`⚠️  Role not found: ${roleName}`);
        continue;
      }

      for (const permissionName of permissionNames) {
        const permission = permissions.find(p => p.name === permissionName);
        if (!permission) {
          console.log(`⚠️  Permission not found: ${permissionName}`);
          continue;
        }

        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [role.id, permission.id]
        );
      }

      console.log(`✅ Assigned ${permissionNames.length} permissions to ${roleName}`);
    }

    // Map users to roles
    const userRoleMappings = [
      // Platform users
      { email: 'platform.admin@adsaas.com', roleName: 'platform_admin', organization_id: null },
      { email: 'support@adsaas.com', roleName: 'support', organization_id: null },
      { email: 'sales@adsaas.com', roleName: 'sales', organization_id: null },
      { email: 'account.manager@adsaas.com', roleName: 'account_manager', organization_id: null },

      // TechCorp users
      { email: 'ceo@techcorp.com', roleName: 'org_admin', organization_id: users.find(u => u.email === 'ceo@techcorp.com')?.organization_id },
      { email: 'marketing@techcorp.com', roleName: 'marketing_manager', organization_id: users.find(u => u.email === 'marketing@techcorp.com')?.organization_id },
      { email: 'creative@techcorp.com', roleName: 'creative_manager', organization_id: users.find(u => u.email === 'creative@techcorp.com')?.organization_id },
      { email: 'analyst@techcorp.com', roleName: 'analyst', organization_id: users.find(u => u.email === 'analyst@techcorp.com')?.organization_id },

      // HealthFirst users
      { email: 'director@healthfirst.com', roleName: 'org_admin', organization_id: users.find(u => u.email === 'director@healthfirst.com')?.organization_id },
      { email: 'campaigns@healthfirst.com', roleName: 'campaign_manager', organization_id: users.find(u => u.email === 'campaigns@healthfirst.com')?.organization_id },
      { email: 'data@healthfirst.com', roleName: 'data_analyst', organization_id: users.find(u => u.email === 'data@healthfirst.com')?.organization_id },

      // EduTech users
      { email: 'admin@edutech.edu', roleName: 'org_admin', organization_id: users.find(u => u.email === 'admin@edutech.edu')?.organization_id },
      { email: 'admissions@edutech.edu', roleName: 'requestor', organization_id: users.find(u => u.email === 'admissions@edutech.edu')?.organization_id },

      // RetailPlus users
      { email: 'vp@retailplus.com', roleName: 'org_admin', organization_id: users.find(u => u.email === 'vp@retailplus.com')?.organization_id },
      { email: 'digital@retailplus.com', roleName: 'digital_manager', organization_id: users.find(u => u.email === 'digital@retailplus.com')?.organization_id },
      { email: 'performance@retailplus.com', roleName: 'performance_analyst', organization_id: users.find(u => u.email === 'performance@retailplus.com')?.organization_id }
    ];

    for (const mapping of userRoleMappings) {
      const user = users.find(u => u.email === mapping.email);
      const role = roles.find(r => r.name === mapping.roleName && r.organization_id === mapping.organization_id);

      if (!user) {
        console.log(`⚠️  User not found: ${mapping.email}`);
        continue;
      }

      if (!role) {
        console.log(`⚠️  Role not found: ${mapping.roleName} for org ${mapping.organization_id}`);
        continue;
      }

      await db.query(
        `INSERT INTO user_roles (user_id, role_id, organization_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_id, organization_id) DO NOTHING`,
        [user.id, role.id, mapping.organization_id]
      );

      console.log(`✅ Mapped ${mapping.email} to ${mapping.roleName}`);
    }

    console.log('\n🎉 RBAC permissions and user mappings assigned successfully!');
    console.log('\n📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show role-permission counts
    for (const [roleName, permissionNames] of Object.entries(rolePermissionMappings)) {
      console.log(`${roleName}: ${permissionNames.length} permissions`);
    }

    console.log(`\n👥 Users mapped to roles: ${userRoleMappings.length}`);
    
  } catch (error) {
    console.error('❌ Error assigning RBAC permissions:', error);
  } finally {
    process.exit(0);
  }
};

// Run the assignment
assignRBACPermissions(); 