const db = require('./db');
const bcrypt = require('bcryptjs');

const seedSaaSUsers = async () => {
  try {
    console.log('🌱 Seeding SaaS users with comprehensive roles...');

    // First, let's create the organizations/tenants table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE,
        plan_type VARCHAR(50) DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
        max_campaigns INTEGER DEFAULT 10,
        max_users INTEGER DEFAULT 5,
        billing_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create organizations
    const organizations = [
      {
        name: 'TechCorp Solutions',
        domain: 'techcorp.com',
        plan_type: 'enterprise',
        max_campaigns: 100,
        max_users: 25,
        billing_email: 'billing@techcorp.com'
      },
      {
        name: 'HealthFirst Medical',
        domain: 'healthfirst.com',
        plan_type: 'pro',
        max_campaigns: 50,
        max_users: 15,
        billing_email: 'finance@healthfirst.com'
      },
      {
        name: 'EduTech Academy',
        domain: 'edutech.edu',
        plan_type: 'basic',
        max_campaigns: 20,
        max_users: 8,
        billing_email: 'admin@edutech.edu'
      },
      {
        name: 'RetailPlus Stores',
        domain: 'retailplus.com',
        plan_type: 'pro',
        max_campaigns: 75,
        max_users: 20,
        billing_email: 'accounts@retailplus.com'
      }
    ];

    for (const org of organizations) {
      await db.query(
        `INSERT INTO organizations (name, domain, plan_type, max_campaigns, max_users, billing_email)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (domain) DO UPDATE SET
         name = EXCLUDED.name,
         plan_type = EXCLUDED.plan_type,
         max_campaigns = EXCLUDED.max_campaigns,
         max_users = EXCLUDED.max_users,
         billing_email = EXCLUDED.billing_email`,
        [org.name, org.domain, org.plan_type, org.max_campaigns, org.max_users, org.billing_email]
      );
    }

    // Get organization IDs
    const orgsResult = await db.query('SELECT id, name, domain FROM organizations ORDER BY id');
    const orgs = orgsResult.rows;

    // Create comprehensive SaaS users with different roles
    const users = [
      // Platform Admin (Super Admin)
      {
        email: 'platform.admin@adsaas.com',
        password: 'platform123',
        role: 'admin',
        organization_id: null,
        description: 'Platform Super Administrator'
      },

      // SaaS Support Team
      {
        email: 'support@adsaas.com',
        password: 'support123',
        role: 'support',
        organization_id: null,
        description: 'SaaS Support Team'
      },

      // SaaS Sales Team
      {
        email: 'sales@adsaas.com',
        password: 'sales123',
        role: 'sales',
        organization_id: null,
        description: 'SaaS Sales Team'
      },

      // SaaS Account Manager
      {
        email: 'account.manager@adsaas.com',
        password: 'account123',
        role: 'account_manager',
        organization_id: null,
        description: 'SaaS Account Manager'
      },

      // TechCorp Users
      {
        email: 'ceo@techcorp.com',
        password: 'ceo123',
        role: 'org_admin',
        organization_id: orgs.find(o => o.domain === 'techcorp.com')?.id,
        description: 'TechCorp CEO (Org Admin)'
      },
      {
        email: 'marketing@techcorp.com',
        password: 'marketing123',
        role: 'marketing_manager',
        organization_id: orgs.find(o => o.domain === 'techcorp.com')?.id,
        description: 'TechCorp Marketing Manager'
      },
      {
        email: 'creative@techcorp.com',
        password: 'creative123',
        role: 'creative_manager',
        organization_id: orgs.find(o => o.domain === 'techcorp.com')?.id,
        description: 'TechCorp Creative Manager'
      },
      {
        email: 'analyst@techcorp.com',
        password: 'analyst123',
        role: 'analyst',
        organization_id: orgs.find(o => o.domain === 'techcorp.com')?.id,
        description: 'TechCorp Marketing Analyst'
      },

      // HealthFirst Users
      {
        email: 'director@healthfirst.com',
        password: 'director123',
        role: 'org_admin',
        organization_id: orgs.find(o => o.domain === 'healthfirst.com')?.id,
        description: 'HealthFirst Marketing Director (Org Admin)'
      },
      {
        email: 'campaigns@healthfirst.com',
        password: 'campaigns123',
        role: 'campaign_manager',
        organization_id: orgs.find(o => o.domain === 'healthfirst.com')?.id,
        description: 'HealthFirst Campaign Manager'
      },
      {
        email: 'data@healthfirst.com',
        password: 'data123',
        role: 'data_analyst',
        organization_id: orgs.find(o => o.domain === 'healthfirst.com')?.id,
        description: 'HealthFirst Data Analyst'
      },

      // EduTech Users
      {
        email: 'admin@edutech.edu',
        password: 'admin123',
        role: 'org_admin',
        organization_id: orgs.find(o => o.domain === 'edutech.edu')?.id,
        description: 'EduTech Admin (Org Admin)'
      },
      {
        email: 'admissions@edutech.edu',
        password: 'admissions123',
        role: 'requestor',
        organization_id: orgs.find(o => o.domain === 'edutech.edu')?.id,
        description: 'EduTech Admissions Manager'
      },

      // RetailPlus Users
      {
        email: 'vp@retailplus.com',
        password: 'vp123',
        role: 'org_admin',
        organization_id: orgs.find(o => o.domain === 'retailplus.com')?.id,
        description: 'RetailPlus VP Marketing (Org Admin)'
      },
      {
        email: 'digital@retailplus.com',
        password: 'digital123',
        role: 'digital_manager',
        organization_id: orgs.find(o => o.domain === 'retailplus.com')?.id,
        description: 'RetailPlus Digital Marketing Manager'
      },
      {
        email: 'performance@retailplus.com',
        password: 'performance123',
        role: 'performance_analyst',
        organization_id: orgs.find(o => o.domain === 'retailplus.com')?.id,
        description: 'RetailPlus Performance Analyst'
      }
    ];

    // Add organization_id column to users table if it doesn't exist
    try {
      await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)');
    } catch (error) {
      // Column might already exist
    }

    for (const user of users) {
      const pwHash = await bcrypt.hash(user.password, 10);
      
      await db.query(
        `INSERT INTO users (email, password_hash, role, organization_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         organization_id = EXCLUDED.organization_id`,
        [user.email, pwHash, user.role, user.organization_id]
      );
      
      console.log(`✅ ${user.description} (${user.email}) - ${user.role}`);
    }

    console.log('\n🎉 SaaS users created successfully!');
    console.log('\n📋 Login Credentials by Role:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Group users by role
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });

    Object.entries(usersByRole).forEach(([role, roleUsers]) => {
      console.log(`\n🔐 ${role.toUpperCase()} ROLE:`);
      roleUsers.forEach(user => {
        const orgName = orgs.find(o => o.id === user.organization_id)?.name || 'Platform';
        console.log(`  ${user.description}:`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Password: ${user.password}`);
        console.log(`    Organization: ${orgName}`);
      });
    });

    console.log('\n🏢 Organizations Created:');
    orgs.forEach(org => {
      console.log(`  ${org.name} (${org.domain})`);
    });

    console.log('\n🚀 Test the SaaS platform with different roles and organizations!');
    
  } catch (error) {
    console.error('❌ Error seeding SaaS users:', error);
  } finally {
    process.exit(0);
  }
};

// Run the seeding
seedSaaSUsers(); 