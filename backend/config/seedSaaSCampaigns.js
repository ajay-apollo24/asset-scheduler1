const db = require('./db');

const seedSaaSCampaigns = async () => {
  try {
    console.log('🌱 Seeding SaaS campaigns for multiple organizations...');

    // Get organizations and users
    const orgsResult = await db.query('SELECT id, name, domain, plan_type FROM organizations ORDER BY id');
    const usersResult = await db.query('SELECT id, email, role, organization_id FROM users WHERE organization_id IS NOT NULL ORDER BY organization_id, id');
    
    const orgs = orgsResult.rows;
    const users = usersResult.rows;

    if (orgs.length === 0) {
      console.log('No organizations found. Please run seedSaaSUsers.js first.');
      return;
    }

    console.log('Found organizations:', orgs.map(o => `${o.name} (${o.plan_type})`));
    console.log('Found users:', users.length);

    // Create comprehensive campaigns for each organization
    const campaigns = [
      // TechCorp (Enterprise) - High volume, sophisticated campaigns
      {
        organization_id: orgs.find(o => o.domain === 'techcorp.com')?.id,
        advertiser_id: users.find(u => u.email === 'ceo@techcorp.com')?.id,
        name: 'TechCorp Q4 Product Launch',
        budget: 2500000,
        start_date: '2024-10-01',
        end_date: '2024-12-31',
        status: 'active',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 25, age_max: 45, gender: 'all' },
          geo: { countries: ['US', 'CA', 'UK', 'DE'], cities: ['San Francisco', 'New York', 'London', 'Berlin'] },
          device: { desktop: true, mobile: true, tablet: true },
          interests: ['technology', 'innovation', 'startups']
        })
      },
      {
        organization_id: orgs.find(o => o.domain === 'techcorp.com')?.id,
        advertiser_id: users.find(u => u.email === 'marketing@techcorp.com')?.id,
        name: 'TechCorp Developer Conference',
        budget: 800000,
        start_date: '2024-11-15',
        end_date: '2024-12-15',
        status: 'active',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 22, age_max: 40, gender: 'all' },
          geo: { countries: ['US'], cities: ['San Francisco', 'Austin', 'Seattle'] },
          device: { desktop: true, mobile: true },
          interests: ['programming', 'software development', 'tech conferences']
        })
      },

      // HealthFirst (Pro) - Healthcare focused campaigns
      {
        organization_id: orgs.find(o => o.domain === 'healthfirst.com')?.id,
        advertiser_id: users.find(u => u.email === 'director@healthfirst.com')?.id,
        name: 'HealthFirst Telemedicine Awareness',
        budget: 500000,
        start_date: '2024-09-01',
        end_date: '2024-11-30',
        status: 'active',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 30, age_max: 65, gender: 'all' },
          geo: { countries: ['US'], cities: ['New York', 'Los Angeles', 'Chicago'] },
          device: { desktop: true, mobile: true, tablet: true },
          interests: ['healthcare', 'telemedicine', 'wellness']
        })
      },
      {
        organization_id: orgs.find(o => o.domain === 'healthfirst.com')?.id,
        advertiser_id: users.find(u => u.email === 'campaigns@healthfirst.com')?.id,
        name: 'HealthFirst Preventive Care',
        budget: 300000,
        start_date: '2024-10-01',
        end_date: '2024-12-31',
        status: 'draft',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 40, age_max: 70, gender: 'all' },
          geo: { countries: ['US'], cities: ['Miami', 'Phoenix', 'Denver'] },
          device: { desktop: true, mobile: true },
          interests: ['preventive care', 'health insurance', 'medical services']
        })
      },

      // EduTech (Basic) - Educational campaigns
      {
        organization_id: orgs.find(o => o.domain === 'edutech.edu')?.id,
        advertiser_id: users.find(u => u.email === 'admin@edutech.edu')?.id,
        name: 'EduTech Spring Admissions',
        budget: 150000,
        start_date: '2024-01-15',
        end_date: '2024-03-31',
        status: 'active',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 16, age_max: 25, gender: 'all' },
          geo: { countries: ['US'], cities: ['Boston', 'New York', 'Los Angeles'] },
          device: { desktop: true, mobile: true },
          interests: ['education', 'online learning', 'higher education']
        })
      },
      {
        organization_id: orgs.find(o => o.domain === 'edutech.edu')?.id,
        advertiser_id: users.find(u => u.email === 'admissions@edutech.edu')?.id,
        name: 'EduTech Summer Programs',
        budget: 80000,
        start_date: '2024-04-01',
        end_date: '2024-06-30',
        status: 'paused',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 14, age_max: 22, gender: 'all' },
          geo: { countries: ['US'], cities: ['Boston', 'San Francisco'] },
          device: { desktop: true, mobile: true },
          interests: ['summer programs', 'academic enrichment', 'college prep']
        })
      },

      // RetailPlus (Pro) - E-commerce campaigns
      {
        organization_id: orgs.find(o => o.domain === 'retailplus.com')?.id,
        advertiser_id: users.find(u => u.email === 'vp@retailplus.com')?.id,
        name: 'RetailPlus Black Friday Sale',
        budget: 1200000,
        start_date: '2024-11-20',
        end_date: '2024-11-30',
        status: 'active',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 18, age_max: 55, gender: 'all' },
          geo: { countries: ['US'], cities: ['New York', 'Los Angeles', 'Chicago', 'Houston'] },
          device: { desktop: true, mobile: true, tablet: true },
          interests: ['shopping', 'deals', 'retail', 'fashion']
        })
      },
      {
        organization_id: orgs.find(o => o.domain === 'retailplus.com')?.id,
        advertiser_id: users.find(u => u.email === 'digital@retailplus.com')?.id,
        name: 'RetailPlus Holiday Collection',
        budget: 600000,
        start_date: '2024-12-01',
        end_date: '2024-12-25',
        status: 'draft',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 25, age_max: 50, gender: 'all' },
          geo: { countries: ['US'], cities: ['New York', 'Los Angeles', 'Miami'] },
          device: { desktop: true, mobile: true },
          interests: ['holiday shopping', 'gifts', 'fashion', 'lifestyle']
        })
      }
    ];

    // Add organization_id column to campaigns table if it doesn't exist
    try {
      await db.query('ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)');
    } catch (error) {
      // Column might already exist
    }

    for (const campaign of campaigns) {
      // Check if campaign already exists
      const existingCampaign = await db.query(
        'SELECT id FROM campaigns WHERE name = $1 AND organization_id = $2',
        [campaign.name, campaign.organization_id]
      );

      if (existingCampaign.rows.length === 0) {
        await db.query(
          `INSERT INTO campaigns (organization_id, advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            campaign.organization_id,
            campaign.advertiser_id,
            campaign.name,
            campaign.budget,
            campaign.start_date,
            campaign.end_date,
            campaign.status,
            campaign.targeting_criteria
          ]
        );
        console.log(`✅ Created: ${campaign.name}`);
      } else {
        console.log(`⏭️  Exists: ${campaign.name}`);
      }
    }

    console.log('\n🎉 SaaS campaigns seeded successfully!');
    console.log('\n📊 Campaign Summary by Organization:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const org of orgs) {
      const orgCampaigns = campaigns.filter(c => c.organization_id === org.id);
      const totalBudget = orgCampaigns.reduce((sum, c) => sum + c.budget, 0);
      const activeCount = orgCampaigns.filter(c => c.status === 'active').length;
      
      console.log(`\n🏢 ${org.name} (${org.plan_type.toUpperCase()}):`);
      console.log(`  Total Campaigns: ${orgCampaigns.length}`);
      console.log(`  Active Campaigns: ${activeCount}`);
      console.log(`  Total Budget: $${totalBudget.toLocaleString()}`);
      orgCampaigns.forEach(c => {
        console.log(`    - ${c.name} (${c.status}) - $${c.budget.toLocaleString()}`);
      });
    }

    console.log('\n🚀 Test multi-tenant campaign management!');
    
  } catch (error) {
    console.error('❌ Error seeding SaaS campaigns:', error);
  } finally {
    process.exit(0);
  }
};

// Run the seeding
seedSaaSCampaigns(); 