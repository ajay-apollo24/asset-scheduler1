// config/seed.js
const db = require('./db');

const seedAssets = async () => {
  try {
    await db.query('DELETE FROM assets'); // optional: clear table before seeding

    const assets = [
      {
        name: 'App Launch Bottom Sheet',
        location: 'Home',
        type: 'Takeover',
        max_slots: 1,
        importance: 5,
        impressions_per_day: 100000,
        value_per_day: 5000
      },
      {
        name: 'Order Confirmation Banner',
        location: 'Post-order',
        type: 'Banner',
        max_slots: 3,
        importance: 3,
        impressions_per_day: 40000,
        value_per_day: 2000
      },
      {
        name: 'Cart Promo Strip',
        location: 'Cart',
        type: 'Banner',
        max_slots: 2,
        importance: 2,
        impressions_per_day: 30000,
        value_per_day: 1500
      }
    ];

    for (const asset of assets) {
      await db.query(
        `INSERT INTO assets (name, location, type, max_slots, importance, impressions_per_day, value_per_day, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [asset.name, asset.location, asset.type, asset.max_slots, asset.importance, asset.impressions_per_day, asset.value_per_day]
      );
    }

    console.log('✅ Asset seed complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed assets:', err);
    process.exit(1);
  }
};

seedAssets();