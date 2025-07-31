// config/seedTestCampaigns.js
const db = require('./db');

const seedTestCampaigns = async () => {
  try {
    console.log('Seeding test campaigns...');

    // Get existing users to use as advertisers
    const usersResult = await db.query('SELECT id, email FROM users LIMIT 3');
    const users = usersResult.rows;

    if (users.length === 0) {
      console.log('No users found. Please create users first.');
      return;
    }

    // Create test campaigns
    const campaigns = [
      {
        advertiser_id: users[0].id,
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
        advertiser_id: users[1]?.id || users[0].id,
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
        advertiser_id: users[2]?.id || users[0].id,
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
        advertiser_id: users[0].id,
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
      // Check if campaign already exists
      const existingCampaign = await db.query(
        'SELECT id FROM campaigns WHERE name = $1',
        [campaign.name]
      );

      if (existingCampaign.rows.length === 0) {
        await db.query(
          `INSERT INTO campaigns (advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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
        console.log(`Created campaign: ${campaign.name}`);
      } else {
        console.log(`Campaign already exists: ${campaign.name}`);
      }
    }

    console.log('Test campaigns seeded successfully!');
    console.log('Users found:', users.map(u => ({ id: u.id, email: u.email })));
  } catch (error) {
    console.error('Error seeding test campaigns:', error);
  }
};

// Run if called directly
if (require.main === module) {
  seedTestCampaigns().then(() => process.exit(0));
}

module.exports = seedTestCampaigns; 