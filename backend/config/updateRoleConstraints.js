const db = require('./db');

const updateRoleConstraints = async () => {
  try {
    console.log('🔧 Updating user role constraints for SaaS...');

    // Drop the existing constraint
    await db.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    
    // Add new constraint with all SaaS roles
    await db.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN (
        'admin',           -- Platform super admin
        'requestor',       -- Basic user (legacy)
        'org_admin',       -- Organization administrator
        'marketing_manager', -- Marketing team lead
        'campaign_manager',  -- Campaign specialist
        'creative_manager',  -- Creative team lead
        'analyst',         -- Marketing analyst
        'data_analyst',    -- Data specialist
        'digital_manager', -- Digital marketing manager
        'performance_analyst', -- Performance specialist
        'support',         -- SaaS support team
        'sales',           -- SaaS sales team
        'account_manager'  -- SaaS account manager
      ))
    `);

    console.log('✅ Role constraints updated successfully!');
    console.log('\n📋 Available Roles:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Platform Roles:');
    console.log('  admin - Platform super administrator');
    console.log('  support - SaaS support team');
    console.log('  sales - SaaS sales team');
    console.log('  account_manager - SaaS account manager');
    console.log('\n🏢 Organization Roles:');
    console.log('  org_admin - Organization administrator');
    console.log('  marketing_manager - Marketing team lead');
    console.log('  campaign_manager - Campaign specialist');
    console.log('  creative_manager - Creative team lead');
    console.log('  analyst - Marketing analyst');
    console.log('  data_analyst - Data specialist');
    console.log('  digital_manager - Digital marketing manager');
    console.log('  performance_analyst - Performance specialist');
    console.log('  requestor - Basic user (legacy)');

  } catch (error) {
    console.error('❌ Error updating role constraints:', error);
  } finally {
    process.exit(0);
  }
};

// Run the update
updateRoleConstraints(); 