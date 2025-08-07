#!/usr/bin/env node
//unifiedSeedScript.js
/**
 * Unified Seed Script for Asset Scheduler
 * This script populates the database with comprehensive sample data
 * for development and testing purposes.
 * 
 * Matches the current database schema including:
 * - Organizations and RBAC system
 * - Assets with different levels (primary, secondary, tertiary)
 * - Internal campaigns (bookings) and external campaigns
 * - Enhanced fairness system data
 * - ROI tracking metrics
 * - Bidding and auction data
 */

const db = require('../../config/db');
const bcrypt = require('bcryptjs');

class UnifiedSeedScript {
  constructor() {
    this.organizations = [];
    this.users = [];
    this.assets = [];
    this.campaigns = [];
    this.creatives = [];
    this.bids = [];
  }

  async run() {
    console.log('🚀 Starting Unified Seed Script...');
    
    try {
      // Clear existing data (optional - comment out if you want to preserve data)
      await this.clearExistingData();
      
      // Seed in order of dependencies
      await this.seedOrganizations();
      await this.seedUsers();
      await this.seedRBACSystem(); // NEW: RBAC setup
      await this.seedAssets();
      await this.seedCampaigns();
      await this.seedCreatives();
      await this.seedBids();
      await this.seedEnhancedFairnessData();
      await this.seedROIMetrics();
      
      console.log('\n🎉 Unified seeding completed successfully!');
      console.log('\n📊 Seeding Summary:');
      console.log(`   - Organizations: ${this.organizations.length}`);
      console.log(`   - Users: ${this.users.length}`);
      console.log(`   - RBAC System: Permissions, Roles, Mappings`);
      console.log(`   - Assets: ${this.assets.length}`);
      console.log(`   - Campaigns: ${this.campaigns.length}`);
      console.log(`   - Creatives: ${this.creatives.length}`);
      console.log(`   - Bids: ${this.bids.length}`);
      
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await this.closeConnection();
    }
  }

  async clearExistingData() {
    console.log('🧹 Clearing existing data...');
    
    const tables = [
      'bids', 'creatives', 'campaigns', 'assets', 'user_roles', 
      'role_permissions', 'roles', 'permissions', 'users', 'organizations',
      'engagement_metrics', 'conversion_metrics', 'revenue_metrics',
      'slot_allocation', 'fairness_scores'
    ];
    
    for (const table of tables) {
      try {
        await db.query(`DELETE FROM ${table}`);
        console.log(`   ✅ Cleared ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Could not clear ${table}: ${error.message}`);
      }
    }
  }

  async seedOrganizations() {
    console.log('🏢 Seeding organizations...');
    
    const organizations = [
      {
        name: 'Apollo Healthcare',
        domain: 'apollo.com'
      },
      {
        name: 'TechCorp Solutions',
        domain: 'techcorp.com'
      },
      {
        name: 'HealthFirst Medical',
        domain: 'healthfirst.com'
      },
      {
        name: 'EduTech Academy',
        domain: 'edutech.edu'
      }
    ];

    for (const org of organizations) {
      const result = await db.query(
        `INSERT INTO organizations (name, domain)
         VALUES ($1, $2)
         RETURNING id`,
        [org.name, org.domain]
      );
      
      this.organizations.push({ ...org, id: result.rows[0].id });
    }
    
    console.log(`   ✅ Created ${this.organizations.length} organizations`);
  }

  async seedUsers() {
    console.log('👥 Seeding users...');
    
    const users = [
      // Platform users (no organization)
      {
        email: 'platform.admin@adsaas.com',
        password: 'platform123',
        description: 'Platform Super Administrator'
      },
      {
        email: 'support@adsaas.com',
        password: 'support123',
        description: 'SaaS Support Team'
      },
      
      // Apollo Healthcare users
      {
        email: 'ceo@apollo.com',
        password: 'apollo123',
        organization_id: this.organizations.find(o => o.domain === 'apollo.com')?.id,
        description: 'Apollo CEO'
      },
      {
        email: 'marketing@apollo.com',
        password: 'apollo123',
        organization_id: this.organizations.find(o => o.domain === 'apollo.com')?.id,
        description: 'Apollo Marketing Manager'
      },
      {
        email: 'pharmacy@apollo.com',
        password: 'apollo123',
        organization_id: this.organizations.find(o => o.domain === 'apollo.com')?.id,
        description: 'Apollo Pharmacy Manager'
      },
      {
        email: 'diagnostics@apollo.com',
        password: 'apollo123',
        organization_id: this.organizations.find(o => o.domain === 'apollo.com')?.id,
        description: 'Apollo Diagnostics Manager'
      },
      
      // TechCorp users
      {
        email: 'ceo@techcorp.com',
        password: 'tech123',
        organization_id: this.organizations.find(o => o.domain === 'techcorp.com')?.id,
        description: 'TechCorp CEO'
      },
      {
        email: 'marketing@techcorp.com',
        password: 'tech123',
        organization_id: this.organizations.find(o => o.domain === 'techcorp.com')?.id,
        description: 'TechCorp Marketing Manager'
      },
      
      // HealthFirst users
      {
        email: 'director@healthfirst.com',
        password: 'health123',
        organization_id: this.organizations.find(o => o.domain === 'healthfirst.com')?.id,
        description: 'HealthFirst Director'
      },
      {
        email: 'campaigns@healthfirst.com',
        password: 'health123',
        organization_id: this.organizations.find(o => o.domain === 'healthfirst.com')?.id,
        description: 'HealthFirst Campaign Manager'
      },
      
      // EduTech users
      {
        email: 'admin@edutech.edu',
        password: 'edu123',
        organization_id: this.organizations.find(o => o.domain === 'edutech.edu')?.id,
        description: 'EduTech Administrator'
      }
    ];

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      const result = await db.query(
        `INSERT INTO users (email, password_hash, organization_id)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.email, passwordHash, user.organization_id]
      );
      
      this.users.push({ ...user, id: result.rows[0].id });
    }
    
    console.log(`   ✅ Created ${this.users.length} users`);
  }

  async seedRBACSystem() {
    console.log('🔐 Seeding RBAC system...');
    
    // 1. Create permissions
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

      // Organization permissions
      { name: 'organization:read', description: 'View organization', resource: 'organization', action: 'read' },
      { name: 'organization:update', description: 'Update organization', resource: 'organization', action: 'update' },

      // Billing permissions
      { name: 'billing:read', description: 'View billing', resource: 'billing', action: 'read' },
      { name: 'billing:update', description: 'Update billing', resource: 'billing', action: 'update' }
    ];

    for (const permission of permissions) {
      await db.query(
        `INSERT INTO permissions (name, description, resource, action)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO NOTHING`,
        [permission.name, permission.description, permission.resource, permission.action]
      );
    }
    
    console.log(`   ✅ Created ${permissions.length} permissions`);

    // 2. Create roles
    const roles = [
      // Platform roles (no organization)
      { name: 'platform_admin', description: 'Platform Super Administrator', organization_id: null, is_system_role: true },
      { name: 'support', description: 'SaaS Support Team', organization_id: null, is_system_role: true },
      { name: 'sales', description: 'Sales Team', organization_id: null, is_system_role: true },
      
      // Organization roles
      { name: 'org_admin', description: 'Organization Administrator', organization_id: null, is_system_role: true },
      { name: 'marketing_manager', description: 'Marketing Manager', organization_id: null, is_system_role: true },
      { name: 'campaign_manager', description: 'Campaign Manager', organization_id: null, is_system_role: true },
      { name: 'creative_manager', description: 'Creative Manager', organization_id: null, is_system_role: true },
      { name: 'analyst', description: 'Analyst', organization_id: null, is_system_role: true },
      { name: 'data_analyst', description: 'Data Analyst', organization_id: null, is_system_role: true },
      { name: 'digital_manager', description: 'Digital Manager', organization_id: null, is_system_role: true }
    ];

    for (const role of roles) {
      await db.query(
        `INSERT INTO roles (name, description, organization_id, is_system_role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name, organization_id) DO NOTHING`,
        [role.name, role.description, role.organization_id, role.is_system_role]
      );
    }
    
    console.log(`   ✅ Created ${roles.length} roles`);

    // 3. Assign permissions to roles
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
      ]
    };

    // Get role and permission IDs
    const rolesResult = await db.query('SELECT id, name FROM roles');
    const permissionsResult = await db.query('SELECT id, name FROM permissions');
    
    const rolesMap = {};
    const permissionsMap = {};
    
    rolesResult.rows.forEach(role => rolesMap[role.name] = role.id);
    permissionsResult.rows.forEach(permission => permissionsMap[permission.name] = permission.id);

    // Assign permissions to roles
    for (const [roleName, permissionNames] of Object.entries(rolePermissionMappings)) {
      const roleId = rolesMap[roleName];
      if (!roleId) continue;

      for (const permissionName of permissionNames) {
        const permissionId = permissionsMap[permissionName];
        if (!permissionId) continue;

        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [roleId, permissionId]
        );
      }
    }
    
    console.log('   ✅ Assigned permissions to roles');

    // 4. Assign roles to users
    const userRoleMappings = [
      { userEmail: 'platform.admin@adsaas.com', roleName: 'platform_admin' },
      { userEmail: 'support@adsaas.com', roleName: 'support' },
      { userEmail: 'ceo@apollo.com', roleName: 'org_admin' },
      { userEmail: 'marketing@apollo.com', roleName: 'marketing_manager' },
      { userEmail: 'pharmacy@apollo.com', roleName: 'campaign_manager' },
      { userEmail: 'diagnostics@apollo.com', roleName: 'campaign_manager' },
      { userEmail: 'ceo@techcorp.com', roleName: 'org_admin' },
      { userEmail: 'marketing@techcorp.com', roleName: 'marketing_manager' },
      { userEmail: 'director@healthfirst.com', roleName: 'org_admin' },
      { userEmail: 'campaigns@healthfirst.com', roleName: 'campaign_manager' },
      { userEmail: 'admin@edutech.edu', roleName: 'org_admin' }
    ];

    for (const mapping of userRoleMappings) {
      const user = this.users.find(u => u.email === mapping.userEmail);
      const roleId = rolesMap[mapping.roleName];
      
      if (user && roleId) {
        await db.query(
          `INSERT INTO user_roles (user_id, role_id, organization_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, role_id, organization_id) DO NOTHING`,
          [user.id, roleId, user.organization_id]
        );
      }
    }
    
    console.log('   ✅ Assigned roles to users');
    console.log('   ✅ RBAC system setup completed');
  }

  async seedAssets() {
    console.log('🏗️  Seeding assets...');
    
    const assets = [
      // Primary assets (highest value, most visible)
      {
        name: 'Homepage Hero Banner',
        location: 'Homepage',
        type: 'Takeover',
        max_slots: 1,
        importance: 5,
        impressions_per_day: 100000,
        value_per_day: 5000.00,
        level: 'primary',
        is_active: true
      },
      {
        name: 'App Launch Bottom Sheet',
        location: 'App Launch',
        type: 'Takeover',
        max_slots: 1,
        importance: 5,
        impressions_per_day: 80000,
        value_per_day: 4000.00,
        level: 'primary',
        is_active: true
      },
      
      // Secondary assets (moderate value, good visibility)
      {
        name: 'Order Confirmation Banner',
        location: 'Post-order',
        type: 'Banner',
        max_slots: 3,
        importance: 3,
        impressions_per_day: 40000,
        value_per_day: 2000.00,
        level: 'secondary',
        is_active: true
      },
      {
        name: 'Cart Promo Strip',
        location: 'Cart',
        type: 'Banner',
        max_slots: 2,
        importance: 2,
        impressions_per_day: 30000,
        value_per_day: 1500.00,
        level: 'secondary',
        is_active: true
      },
      {
        name: 'Sidebar Ad Space',
        location: 'Sidebar',
        type: 'Banner',
        max_slots: 2,
        importance: 2,
        impressions_per_day: 25000,
        value_per_day: 1200.00,
        level: 'secondary',
        is_active: true
      },
      
      // Tertiary assets (lower value, limited visibility)
      {
        name: 'Footer Newsletter Signup',
        location: 'Footer',
        type: 'Banner',
        max_slots: 1,
        importance: 1,
        impressions_per_day: 15000,
        value_per_day: 800.00,
        level: 'tertiary',
        is_active: true
      },
      {
        name: 'Email Template Header',
        location: 'Email',
        type: 'Banner',
        max_slots: 1,
        importance: 1,
        impressions_per_day: 10000,
        value_per_day: 600.00,
        level: 'tertiary',
        is_active: true
      }
    ];

    for (const asset of assets) {
      const result = await db.query(
        `INSERT INTO assets (name, location, type, max_slots, importance, impressions_per_day, value_per_day, level, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [asset.name, asset.location, asset.type, asset.max_slots, asset.importance, 
         asset.impressions_per_day, asset.value_per_day, asset.level, asset.is_active]
      );
      
      this.assets.push({ ...asset, id: result.rows[0].id });
    }
    
    console.log(`   ✅ Created ${this.assets.length} assets`);
  }

  async seedCampaigns() {
    console.log('📢 Seeding campaigns...');
    
    const campaigns = [
      // Internal campaigns (Apollo Healthcare)
      {
        advertiser_id: this.users.find(u => u.email === 'marketing@apollo.com')?.id,
        name: 'Apollo Q4 Brand Awareness',
        budget: 1000000.00,
        start_date: '2024-10-01',
        end_date: '2024-12-31',
        status: 'active',
        advertiser_type: 'internal',
        lob: 'Marketing',
        purpose: 'Q4 brand awareness campaign',
        asset_id: this.assets.find(a => a.name === 'Homepage Hero Banner')?.id,
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 25, age_max: 65, gender: 'all' },
          geo: { countries: ['IN'], cities: ['Mumbai', 'Delhi', 'Bangalore'] },
          device: { desktop: true, mobile: true, tablet: true }
        })
      },
      {
        advertiser_id: this.users.find(u => u.email === 'pharmacy@apollo.com')?.id,
        name: 'Apollo Pharmacy Promotion',
        budget: 500000.00,
        start_date: '2024-11-01',
        end_date: '2024-12-31',
        status: 'active',
        advertiser_type: 'internal',
        lob: 'Pharmacy',
        purpose: 'Pharmacy product promotion',
        asset_id: this.assets.find(a => a.name === 'App Launch Bottom Sheet')?.id,
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 30, age_max: 70, gender: 'all' },
          geo: { countries: ['IN'], cities: ['Chennai', 'Hyderabad', 'Pune'] },
          device: { desktop: true, mobile: true }
        })
      },
      {
        advertiser_id: this.users.find(u => u.email === 'diagnostics@apollo.com')?.id,
        name: 'Apollo Diagnostics Campaign',
        budget: 300000.00,
        start_date: '2024-12-01',
        end_date: '2024-12-31',
        status: 'active',
        advertiser_type: 'internal',
        lob: 'Diagnostics',
        purpose: 'Diagnostic test bookings',
        asset_id: this.assets.find(a => a.name === 'Order Confirmation Banner')?.id,
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 35, age_max: 75, gender: 'all' },
          geo: { countries: ['IN'], cities: ['Kolkata', 'Ahmedabad', 'Jaipur'] },
          device: { desktop: true, mobile: true }
        })
      },
      
      // External campaigns (SaaS customers)
      {
        advertiser_id: this.users.find(u => u.email === 'ceo@techcorp.com')?.id,
        name: 'TechCorp Q4 Product Launch',
        budget: 2500000.00,
        start_date: '2024-10-01',
        end_date: '2024-12-31',
        status: 'active',
        advertiser_type: 'external',
        asset_id: this.assets.find(a => a.name === 'Sidebar Ad Space')?.id,
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 25, age_max: 45, gender: 'all' },
          geo: { countries: ['US', 'CA', 'UK'], cities: ['San Francisco', 'New York', 'London'] },
          device: { desktop: true, mobile: true, tablet: true },
          interests: ['technology', 'innovation', 'startups']
        })
      },
      {
        advertiser_id: this.users.find(u => u.email === 'director@healthfirst.com')?.id,
        name: 'HealthFirst Telemedicine',
        budget: 500000.00,
        start_date: '2024-09-01',
        end_date: '2024-11-30',
        status: 'active',
        advertiser_type: 'external',
        asset_id: this.assets.find(a => a.name === 'Cart Promo Strip')?.id,
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 30, age_max: 65, gender: 'all' },
          geo: { countries: ['US'], cities: ['New York', 'Los Angeles', 'Chicago'] },
          device: { desktop: true, mobile: true, tablet: true },
          interests: ['healthcare', 'telemedicine', 'wellness']
        })
      },
      {
        advertiser_id: this.users.find(u => u.email === 'admin@edutech.edu')?.id,
        name: 'EduTech Spring Admissions',
        budget: 150000.00,
        start_date: '2024-01-15',
        end_date: '2024-03-31',
        status: 'draft',
        advertiser_type: 'external',
        asset_id: this.assets.find(a => a.name === 'Footer Newsletter Signup')?.id,
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 16, age_max: 25, gender: 'all' },
          geo: { countries: ['US'], cities: ['Boston', 'New York', 'Los Angeles'] },
          device: { desktop: true, mobile: true },
          interests: ['education', 'college', 'university']
        })
      }
    ];

    for (const campaign of campaigns) {
      const result = await db.query(
        `INSERT INTO campaigns (advertiser_id, name, budget, start_date, end_date, status, 
         advertiser_type, lob, purpose, asset_id, targeting_criteria, creative_settings, performance_settings)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [campaign.advertiser_id, campaign.name, campaign.budget, campaign.start_date, 
         campaign.end_date, campaign.status, campaign.advertiser_type, campaign.lob, 
         campaign.purpose, campaign.asset_id, campaign.targeting_criteria,
         JSON.stringify({ format: 'banner', dimensions: { width: 728, height: 90 } }),
         JSON.stringify({ optimization_goal: 'impressions', target_cpa: 1000 })]
      );
      
      this.campaigns.push({ ...campaign, id: result.rows[0].id });
    }
    
    console.log(`   ✅ Created ${this.campaigns.length} campaigns`);
  }

  async seedCreatives() {
    console.log('🎨 Seeding creatives...');
    
    const creatives = [
      {
        asset_id: this.assets.find(a => a.name === 'Homepage Hero Banner')?.id,
        campaign_id: this.campaigns.find(c => c.name === 'Apollo Q4 Brand Awareness')?.id,
        name: 'Apollo Hero Banner',
        type: 'image',
        content: JSON.stringify({
          image_url: 'https://example.com/apollo-hero.jpg',
          click_url: 'https://apollo.com/q4-campaign',
          headline: 'Apollo Healthcare - Your Health, Our Priority',
          description: 'Get the best healthcare services this Q4'
        }),
        dimensions: JSON.stringify({ width: 728, height: 90 }),
        status: 'approved'
      },
      {
        asset_id: this.assets.find(a => a.name === 'App Launch Bottom Sheet')?.id,
        campaign_id: this.campaigns.find(c => c.name === 'Apollo Pharmacy Promotion')?.id,
        name: 'Pharmacy Promo Sheet',
        type: 'image',
        content: JSON.stringify({
          image_url: 'https://example.com/pharmacy-promo.jpg',
          click_url: 'https://apollo.com/pharmacy',
          headline: 'Apollo Pharmacy - 20% Off This Month',
          description: 'Exclusive pharmacy discounts for you'
        }),
        dimensions: JSON.stringify({ width: 300, height: 250 }),
        status: 'approved'
      },
      {
        asset_id: this.assets.find(a => a.name === 'Sidebar Ad Space')?.id,
        campaign_id: this.campaigns.find(c => c.name === 'TechCorp Q4 Product Launch')?.id,
        name: 'TechCorp Sidebar Ad',
        type: 'image',
        content: JSON.stringify({
          image_url: 'https://example.com/techcorp-sidebar.jpg',
          click_url: 'https://techcorp.com/product-launch',
          headline: 'TechCorp - Revolutionary New Product',
          description: 'Discover the future of technology'
        }),
        dimensions: JSON.stringify({ width: 300, height: 600 }),
        status: 'approved'
      }
    ];

    for (const creative of creatives) {
      const result = await db.query(
        `INSERT INTO creatives (asset_id, campaign_id, name, type, content, dimensions, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [creative.asset_id, creative.campaign_id, creative.name, creative.type, 
         creative.content, creative.dimensions, creative.status]
      );
      
      this.creatives.push({ ...creative, id: result.rows[0].id });
    }
    
    console.log(`   ✅ Created ${this.creatives.length} creatives`);
  }

  async seedBids() {
    console.log('💰 Seeding bids...');
    
    // Skip bids for now since the bids table still references the old bookings_old table
    // This will be fixed in a future migration when the bids table is updated to reference campaigns
    console.log('   ⚠️  Skipping bids - table structure needs migration update');
    console.log('   ℹ️  Bids table still references bookings_old instead of campaigns');
    
    // TODO: Update bids table to reference campaigns instead of bookings_old
    // Then uncomment the bid seeding code below
    
    /*
    const bids = [
      {
        booking_id: this.campaigns.find(c => c.name === 'Apollo Q4 Brand Awareness')?.id,
        user_id: this.users.find(u => u.email === 'marketing@apollo.com')?.id,
        lob: 'Marketing',
        bid_amount: 5000.00,
        max_bid: 7500.00,
        bid_reason: 'Q4 brand awareness campaign',
        status: 'active'
      },
      {
        booking_id: this.campaigns.find(c => c.name === 'Apollo Pharmacy Promotion')?.id,
        user_id: this.users.find(u => u.email === 'pharmacy@apollo.com')?.id,
        lob: 'Pharmacy',
        bid_amount: 3000.00,
        max_bid: 4500.00,
        bid_reason: 'Pharmacy product promotion',
        status: 'active'
      },
      {
        booking_id: this.campaigns.find(c => c.name === 'Apollo Diagnostics Campaign')?.id,
        user_id: this.users.find(u => u.email === 'diagnostics@apollo.com')?.id,
        lob: 'Diagnostics',
        bid_amount: 2000.00,
        max_bid: 3000.00,
        bid_reason: 'Diagnostic test bookings',
        status: 'active'
      }
    ];

    for (const bid of bids) {
      const result = await db.query(
        `INSERT INTO bids (booking_id, user_id, lob, bid_amount, max_bid, bid_reason, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [bid.booking_id, bid.user_id, bid.lob, bid.bid_amount, bid.max_bid, bid.bid_reason, bid.status]
      );
      
      this.bids.push({ ...bid, id: result.rows[0].id });
    }
    */
    
    console.log(`   ✅ Bids section completed (skipped due to table structure)`);
  }

  async seedEnhancedFairnessData() {
    console.log('⚖️  Seeding enhanced fairness data...');
    
    // Seed slot allocation data
    for (const asset of this.assets) {
      await db.query(
        `INSERT INTO slot_allocation (asset_id, asset_level, date, total_slots, 
         internal_slots_allocated, external_slots_allocated, monetization_slots_allocated,
         internal_percentage, external_percentage, monetization_percentage)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9)`,
        [
          asset.id, 
          asset.level, 
          asset.max_slots,
          Math.floor(asset.max_slots * 0.7), // 70% internal
          Math.floor(asset.max_slots * 0.3), // 30% external
          Math.floor(asset.max_slots * 0.15), // 15% monetization
          70.0, // internal percentage
          30.0, // external percentage
          15.0  // monetization percentage
        ]
      );
    }
    
    // Seed fairness scores
    for (const campaign of this.campaigns) {
      if (campaign.advertiser_type === 'internal') {
        await db.query(
          `INSERT INTO fairness_scores (lob, asset_id, score, factors, calculated_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [
            campaign.lob,
            campaign.asset_id,
            Math.random() * 2 + 1, // Random score between 1-3
            JSON.stringify({
              strategic_weight: 1.3,
              time_fairness: 1.2,
              booking_history: 1.1
            })
          ]
        );
      }
    }
    
    console.log('   ✅ Created enhanced fairness data');
  }

  async seedROIMetrics() {
    console.log('📊 Seeding ROI metrics...');
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Seed engagement metrics for AI Bot campaigns
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo.getTime() + (i * 24 * 60 * 60 * 1000));
      
      await db.query(
        `INSERT INTO engagement_metrics (campaign_id, asset_id, lob, date, 
         user_interactions, unique_users, avg_time_spent_seconds, engagement_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          this.campaigns.find(c => c.lob === 'Marketing')?.id,
          this.assets.find(a => a.name === 'Homepage Hero Banner')?.id,
          'Marketing',
          date.toISOString().split('T')[0],
          Math.floor(Math.random() * 1000) + 100,
          Math.floor(Math.random() * 500) + 50,
          Math.floor(Math.random() * 120) + 30,
          Math.random() * 0.1 + 0.05
        ]
      );
    }
    
    // Seed conversion metrics for Lab Test campaigns
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo.getTime() + (i * 24 * 60 * 60 * 1000));
      
      await db.query(
        `INSERT INTO conversion_metrics (campaign_id, asset_id, lob, date,
         total_conversions, conversion_rate, avg_conversion_value, total_conversion_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          this.campaigns.find(c => c.lob === 'Diagnostics')?.id,
          this.assets.find(a => a.name === 'Order Confirmation Banner')?.id,
          'Diagnostics',
          date.toISOString().split('T')[0],
          Math.floor(Math.random() * 50) + 5,
          Math.random() * 0.05 + 0.02,
          Math.random() * 1000 + 500,
          Math.random() * 50000 + 10000
        ]
      );
    }
    
    // Seed revenue metrics for Monetization campaigns
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo.getTime() + (i * 24 * 60 * 60 * 1000));
      
      await db.query(
        `INSERT INTO revenue_metrics (campaign_id, asset_id, lob, date,
         daily_revenue, revenue_efficiency, cost_per_acquisition, roi_ratio)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          this.campaigns.find(c => c.advertiser_type === 'external')?.id,
          this.assets.find(a => a.name === 'Sidebar Ad Space')?.id,
          'Monetization',
          date.toISOString().split('T')[0],
          Math.random() * 5000 + 1000,
          Math.random() * 0.3 + 0.7,
          Math.random() * 50 + 20,
          Math.random() * 2 + 1
        ]
      );
    }
    
    console.log('   ✅ Created ROI metrics data');
  }

  async closeConnection() {
    try {
      if (db.end) {
        await db.end();
      } else if (db.pool && db.pool.end) {
        await db.pool.end();
      }
    } catch (error) {
      console.log('ℹ️  Database connection already closed');
    }
  }
}

// Run the unified seed script
const seedScript = new UnifiedSeedScript();
seedScript.run().catch(console.error); 