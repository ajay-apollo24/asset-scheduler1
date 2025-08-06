const db = require('./db');

const migrateToRBAC = async () => {
  try {
    console.log('🔄 Migrating from role column to RBAC system...');

    // 1. First, let's check what roles are currently in the users table
    const usersWithRoles = await db.query('SELECT id, email, role FROM users WHERE role IS NOT NULL');
    console.log(`Found ${usersWithRoles.rows.length} users with roles in the users table`);

    // 2. Create a mapping of old roles to new RBAC roles
    const roleMapping = {
      'admin': 'platform_admin',
      'requestor': 'requestor',
      'org_admin': 'org_admin',
      'marketing_manager': 'marketing_manager',
      'campaign_manager': 'campaign_manager',
      'creative_manager': 'creative_manager',
      'analyst': 'analyst',
      'data_analyst': 'data_analyst',
      'digital_manager': 'digital_manager',
      'performance_analyst': 'performance_analyst',
      'support': 'support',
      'sales': 'sales',
      'account_manager': 'account_manager'
    };

    // 3. For each user, find their organization and assign the appropriate RBAC role
    for (const user of usersWithRoles.rows) {
      const newRoleName = roleMapping[user.role];
      if (!newRoleName) {
        console.log(`⚠️  No mapping found for role: ${user.role} (user: ${user.email})`);
        continue;
      }

      // Get user's organization
      const userOrg = await db.query('SELECT organization_id FROM users WHERE id = $1', [user.id]);
      const organization_id = userOrg.rows[0]?.organization_id;

      // Find the appropriate role (system role or org-specific role)
      let roleQuery = 'SELECT id FROM roles WHERE name = $1';
      let roleParams = [newRoleName];

      if (organization_id) {
        // For org-specific roles, include organization_id
        roleQuery = 'SELECT id FROM roles WHERE name = $1 AND organization_id = $2';
        roleParams = [newRoleName, organization_id];
      } else {
        // For system roles, organization_id should be null
        roleQuery = 'SELECT id FROM roles WHERE name = $1 AND organization_id IS NULL';
        roleParams = [newRoleName];
      }

      const roleResult = await db.query(roleQuery, roleParams);
      
      if (roleResult.rows.length === 0) {
        console.log(`⚠️  Role not found: ${newRoleName} for user ${user.email}`);
        continue;
      }

      const role_id = roleResult.rows[0].id;

      // Check if user-role mapping already exists
      const existingMapping = await db.query(
        'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [user.id, role_id]
      );

      if (existingMapping.rows.length === 0) {
        // Create the user-role mapping
        await db.query(
          `INSERT INTO user_roles (user_id, role_id, organization_id)
           VALUES ($1, $2, $3)`,
          [user.id, role_id, organization_id]
        );
        console.log(`✅ Mapped ${user.email} (${user.role} → ${newRoleName})`);
      } else {
        console.log(`ℹ️  Mapping already exists for ${user.email} to ${newRoleName}`);
      }
    }

    // 4. Now we can safely remove the role column from users table
    console.log('\n🗑️  Removing role column from users table...');
    
    // First, let's check if there are any constraints on the role column
    const constraints = await db.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
      AND conname LIKE '%role%'
    `);
    
    if (constraints.rows.length > 0) {
      console.log('Found role-related constraints, dropping them...');
      for (const constraint of constraints.rows) {
        await db.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${constraint.conname}`);
      }
    }

    // Remove the role column
    await db.query('ALTER TABLE users DROP COLUMN IF EXISTS role');
    console.log('✅ Role column removed from users table');

    // 5. Update the users table to remove the role check constraint if it exists
    try {
      await db.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
      console.log('✅ Removed users_role_check constraint');
    } catch (error) {
      console.log('ℹ️  users_role_check constraint not found or already removed');
    }

    console.log('\n🎉 Migration to RBAC completed successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Users processed: ${usersWithRoles.rows.length}`);
    console.log(`🔗 Role mappings created: ${usersWithRoles.rows.length}`);
    console.log(`🗑️  Role column removed from users table`);
    console.log(`🔐 System now uses proper RBAC with user_roles table`);

    // 6. Show final user-role mappings
    const finalMappings = await db.query(`
      SELECT 
        u.email,
        r.name as role_name,
        o.name as organization_name
      FROM user_roles ur
      JOIN users u ON ur.user_id = u.id
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN organizations o ON ur.organization_id = o.id
      ORDER BY u.email
    `);

    console.log('\n👥 Current User-Role Mappings:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const mapping of finalMappings.rows) {
      const org = mapping.organization_name || 'Platform';
      console.log(`${mapping.email} → ${mapping.role_name} (${org})`);
    }

  } catch (error) {
    console.error('❌ Error during RBAC migration:', error);
  } finally {
    process.exit(0);
  }
};

// Run the migration
migrateToRBAC(); 