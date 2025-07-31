// config/seedCampaigns.js
const db = require('./db');

const seedCampaigns = async () => {
  try {
    console.log('Seeding campaigns...');

    // First, let's create some test advertisers if they don't exist
    const advertisers = [
      { id: 1, name: 'Credit Card Division' },
      { id: 2, name: 'Diagnostics Division' },
      { id: 3, name: 'Pharma Division' }
    ];

    for (const advertiser of advertisers) {
      await db.query(
        'INSERT INTO advertisers (id, name, email, status) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [advertiser.id, advertiser.name, `${advertiser.name.toLowerCase().replace(/\s+/g, '.')}@company.com`, 'active']
      );
    }

    // Create test campaigns
    const campaigns = [
      {
        advertiser_id: 1,
        name: 'Credit Card Summer Campaign',
        budget: 500000,
        start_date: '2024-06-01',
        end_date: '2024-08-31',
        status: 'active',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 25, age_max: 55, gender: 'all' },
          geo: { countries: ['IN'], cities: ['Mumbai', 'Delhi', 'Bangalore'] },
          device: { desktop: true, mobile: true, tablet: true }
        })
      },
      {
        advertiser_id: 2,
        name: 'Diagnostics Health Awareness',
        budget: 300000,
        start_date: '2024-07-01',
        end_date: '2024-09-30',
        status: 'active',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 30, age_max: 65, gender: 'all' },
          geo: { countries: ['IN'], cities: ['Chennai', 'Hyderabad', 'Pune'] },
          device: { desktop: true, mobile: true, tablet: true }
        })
      },
      {
        advertiser_id: 3,
        name: 'Pharma Product Launch',
        budget: 750000,
        start_date: '2024-08-01',
        end_date: '2024-10-31',
        status: 'draft',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 35, age_max: 70, gender: 'all' },
          geo: { countries: ['IN'], cities: ['Kolkata', 'Ahmedabad', 'Jaipur'] },
          device: { desktop: true, mobile: true, tablet: true }
        })
      },
      {
        advertiser_id: 1,
        name: 'Credit Card Winter Promotion',
        budget: 400000,
        start_date: '2024-11-01',
        end_date: '2024-12-31',
        status: 'paused',
        targeting_criteria: JSON.stringify({
          demographics: { age_min: 28, age_max: 50, gender: 'all' },
          geo: { countries: ['IN'], cities: ['Mumbai', 'Delhi'] },
          device: { desktop: true, mobile: true, tablet: true }
        })
      }
    ];

    for (const campaign of campaigns) {
      await db.query(
        `INSERT INTO campaigns (advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (name) DO NOTHING`,
        [
          campaign.advertiser_id,
          campaign.name,
          campaign.budget,
          campaign.start_date,
          campaign.end_date,
          campaign.status,
          campaign.targeting_criteria
        ]
      );
    }

    console.log('Campaigns seeded successfully!');
  } catch (error) {
    console.error('Error seeding campaigns:', error);
  }
};

// Run if called directly
if (require.main === module) {
  seedCampaigns().then(() => process.exit(0));
}

module.exports = seedCampaigns; 