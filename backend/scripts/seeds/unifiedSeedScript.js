#!/usr/bin/env node

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
        domain: 'apollo.com',
        plan_type: 'enterprise',
        max_campaigns: 200,
        max_users: 50,
        billing_email: 'billing@apollo.com',
        status: 'active'
      },
      {
        name: 'TechCorp Solutions',
        domain: 'techcorp.com',
        plan_type: 'pro',
        max_campaigns: 100,
        max_users: 25,
        billing_email: 'finance@techcorp.com',
        status: 'active'
      },
      {
        name: 'HealthFirst Medical',
        domain: 'healthfirst.com',
        plan_type: 'pro',
        max_campaigns: 75,
        max_users: 20,
        billing_email: 'accounts@healthfirst.com',
        status: 'active'
      },
      {
        name: 'EduTech Academy',
        domain: 'edutech.edu',
        plan_type: 'basic',
        max_campaigns: 30,
        max_users: 10,
        billing_email: 'admin@edutech.edu',
        status: 'active'
      }
    ];

    for (const org of organizations) {
      const result = await db.query(
        `INSERT INTO organizations (name, domain, plan_type, max_campaigns, max_users, billing_email, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [org.name, org.domain, org.plan_type, org.max_campaigns, org.max_users, org.billing_email, org.status]
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