const db = require('./db');

const createRBACTables = async () => {
  try {
    console.log('🔧 Creating RBAC (Role-Based Access Control) tables...');

    // 1. Create permissions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create roles table
    await db.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        is_system_role BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, organization_id)
      )
    `);

    // 3. Create role_permissions junction table
    await db.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, permission_id)
      )
    `);

    // 4. Create user_roles junction table (many-to-many)
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id, organization_id)
      )
    `);

    // 5. Create indexes for performance
    await db.query('CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_roles_organization ON roles(organization_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_roles_organization ON user_roles(organization_id)');

    console.log('✅ RBAC tables created successfully!');

    // 6. Insert system permissions
    const permissions = [
      // Campaign permissions
      { name: 'campaign:create', description: 'Create campaigns', resource: 'campaign', action: 'create' },
      { name: 'campaign:read', description: 'View campaigns', resource: 'campaign', action: 'read' },
      { name: 'campaign:update', description: 'Update campaigns', resource: 'campaign', action: 'update' },
      { name: 'campaign:delete', description: 'Delete campaigns', resource: 'campaign', action: 'delete' },
      { name: 'campaign:approve', description: 'Approve campaigns', resource: 'campaign', action: 'approve' },
      { name: 'campaign:pause', description: 'Pause campaigns', resource: 'campaign', action: 'pause' },

      // Creative permissions
      { name: 'creative:create', description: 'Create creatives', resource: 'creative', action: 'create' },
      { name: 'creative:read', description: 'View creatives', resource: 'creative', action: 'read' },
      { name: 'creative:update', description: 'Update creatives', resource: 'creative', action: 'update' },
      { name: 'creative:delete', description: 'Delete creatives', resource: 'creative', action: 'delete' },
      { name: 'creative:approve', description: 'Approve creatives', resource: 'creative', action: 'approve' },

      // User management permissions
      { name: 'user:create', description: 'Create users', resource: 'user', action: 'create' },
      { name: 'user:read', description: 'View users', resource: 'user', action: 'read' },
      { name: 'user:update', description: 'Update users', resource: 'user', action: 'update' },
      { name: 'user:delete', description: 'Delete users', resource: 'user', action: 'delete' },
      { name: 'user:assign_roles', description: 'Assign roles to users', resource: 'user', action: 'assign_roles' },

      // Role management permissions
      { name: 'role:create', description: 'Create roles', resource: 'role', action: 'create' },
      { name: 'role:read', description: 'View roles', resource: 'role', action: 'read' },
      { name: 'role:update', description: 'Update roles', resource: 'role', action: 'update' },
      { name: 'role:delete', description: 'Delete roles', resource: 'role', action: 'delete' },
      { name: 'role:assign_permissions', description: 'Assign permissions to roles', resource: 'role', action: 'assign_permissions' },

      // Analytics permissions
      { name: 'analytics:read', description: 'View analytics', resource: 'analytics', action: 'read' },
      { name: 'analytics:export', description: 'Export analytics', resource: 'analytics', action: 'export' },
      { name: 'analytics:realtime', description: 'View real-time analytics', resource: 'analytics', action: 'realtime' },

      // Billing permissions
      { name: 'billing:read', description: 'View billing information', resource: 'billing', action: 'read' },
      { name: 'billing:update', description: 'Update billing information', resource: 'billing', action: 'update' },
      { name: 'billing:manage', description: 'Manage billing', resource: 'billing', action: 'manage' },

      // Organization permissions
      { name: 'organization:read', description: 'View organization details', resource: 'organization', action: 'read' },
      { name: 'organization:update', description: 'Update organization details', resource: 'organization', action: 'update' },
      { name: 'organization:manage', description: 'Manage organization', resource: 'organization', action: 'manage' },

      // Platform permissions (super admin only)
      { name: 'platform:admin', description: 'Platform administration', resource: 'platform', action: 'admin' },
      { name: 'platform:users', description: 'Manage all platform users', resource: 'platform', action: 'users' },
      { name: 'platform:organizations', description: 'Manage all organizations', resource: 'platform', action: 'organizations' },
      { name: 'platform:analytics', description: 'View platform-wide analytics', resource: 'platform', action: 'analytics' }
    ];

    for (const permission of permissions) {
      await db.query(
        `INSERT INTO permissions (name, description, resource, action)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE SET
         description = EXCLUDED.description,
         resource = EXCLUDED.resource,
         action = EXCLUDED.action`,
        [permission.name, permission.description, permission.resource, permission.action]
      );
    }

    console.log(`✅ ${permissions.length} permissions created`);

    // 7. Insert system roles
    const systemRoles = [
      {
        name: 'platform_admin',
        description: 'Platform Super Administrator - Full access to everything',
        organization_id: null,
        is_system_role: true
      },
      {
        name: 'support',
        description: 'SaaS Support Team - Can view and assist with customer issues',
        organization_id: null,
        is_system_role: true
      },
      {
        name: 'sales',
        description: 'SaaS Sales Team - Can view customer data for sales purposes',
        organization_id: null,
        is_system_role: true
      },
      {
        name: 'account_manager',
        description: 'SaaS Account Manager - Manages customer relationships',
        organization_id: null,
        is_system_role: true
      }
    ];

    for (const role of systemRoles) {
      await db.query(
        `INSERT INTO roles (name, description, organization_id, is_system_role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE SET
         description = EXCLUDED.description,
         organization_id = EXCLUDED.organization_id,
         is_system_role = EXCLUDED.is_system_role`,
        [role.name, role.description, role.organization_id, role.is_system_role]
      );
    }

    console.log(`✅ ${systemRoles.length} system roles created`);

    // 8. Create organization-specific roles
    const orgRoles = [
      {
        name: 'org_admin',
        description: 'Organization Administrator - Full access within organization',
        is_system_role: false
      },
      {
        name: 'marketing_manager',
        description: 'Marketing Manager - Manages marketing campaigns and team',
        is_system_role: false
      },
      {
        name: 'campaign_manager',
        description: 'Campaign Manager - Creates and manages campaigns',
        is_system_role: false
      },
      {
        name: 'creative_manager',
        description: 'Creative Manager - Manages creative assets and team',
        is_system_role: false
      },
      {
        name: 'analyst',
        description: 'Marketing Analyst - Views analytics and reports',
        is_system_role: false
      },
      {
        name: 'data_analyst',
        description: 'Data Analyst - Advanced analytics and data management',
        is_system_role: false
      },
      {
        name: 'digital_manager',
        description: 'Digital Marketing Manager - Manages digital campaigns',
        is_system_role: false
      },
      {
        name: 'performance_analyst',
        description: 'Performance Analyst - Focuses on campaign performance',
        is_system_role: false
      },
      {
        name: 'requestor',
        description: 'Basic User - Can request campaigns and view basic data',
        is_system_role: false
      }
    ];

    // Get organizations to create org-specific roles
    const orgsResult = await db.query('SELECT id, name FROM organizations');
    const orgs = orgsResult.rows;

    for (const org of orgs) {
      for (const role of orgRoles) {
        // Check if role already exists
        const existingRole = await db.query(
          'SELECT id FROM roles WHERE name = $1 AND organization_id = $2',
          [role.name, org.id]
        );

        if (existingRole.rows.length === 0) {
          await db.query(
            `INSERT INTO roles (name, description, organization_id, is_system_role)
             VALUES ($1, $2, $3, $4)`,
            [role.name, role.description, org.id, role.is_system_role]
          );
        }
      }
    }

    console.log(`✅ Organization-specific roles created for ${orgs.length} organizations`);

    console.log('\n🎉 RBAC system created successfully!');
    console.log('\n📋 System Overview:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔐 Permissions: ${permissions.length} system permissions`);
    console.log(`👥 System Roles: ${systemRoles.length} platform roles`);
    console.log(`🏢 Org Roles: ${orgRoles.length} roles per organization`);
    console.log(`🏢 Organizations: ${orgs.length} organizations with roles`);
    
  } catch (error) {
    console.error('❌ Error creating RBAC tables:', error);
  } finally {
    process.exit(0);
  }
};

// Run the creation
createRBACTables(); 