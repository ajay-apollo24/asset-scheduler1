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
        max_slots: 1
      },
      {
        name: 'Order Confirmation Banner',
        location: 'Post-order',
        type: 'Banner',
        max_slots: 3
      },
      {
        name: 'Cart Promo Strip',
        location: 'Cart',
        type: 'Banner',
        max_slots: 2
      }
    ];

    for (const asset of assets) {
      await db.query(
        `INSERT INTO assets (name, location, type, max_slots, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [asset.name, asset.location, asset.type, asset.max_slots]
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