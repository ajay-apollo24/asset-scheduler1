const db = require('../../config/db');

class TestDBHelper {
  static async cleanup() {
    try {
      await db.query('DELETE FROM creatives WHERE name LIKE \'Test%\'');
      await db.query('DELETE FROM bookings WHERE title LIKE \'Test%\'');
      await db.query('DELETE FROM assets WHERE name LIKE \'Test%\'');
      await db.query('DELETE FROM bids WHERE bid_amount > 0');
      await db.query('DELETE FROM approvals WHERE decided_by IN (SELECT id FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\')');
      await db.query('DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\')');
      await db.query('DELETE FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\'');
      await db.query('DELETE FROM campaigns WHERE name LIKE \'Test%\'');
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  static async createTestUser(overrides = {}) {
    const defaultUser = {
      email: 'test@example.com',
      password_hash: 'hashed_password',
      organization_id: 1,
      ...overrides
    };

    const result = await db.query(
      'INSERT INTO users (email, password_hash, organization_id) VALUES ($1, $2, $3) RETURNING *',
      [defaultUser.email, defaultUser.password_hash, defaultUser.organization_id]
    );
    
    // Assign default user role
    await db.query(
      'INSERT INTO user_roles (user_id, role_id, organization_id) VALUES ($1, $2, $3)',
      [result.rows[0].id, 2, defaultUser.organization_id] // role_id 2 = 'user'
    );

    return result.rows[0];
  }

  static async createTestAdmin(overrides = {}) {
    const defaultAdmin = {
      email: 'admin@example.com',
      password_hash: 'hashed_password',
      organization_id: 1,
      ...overrides
    };

    const result = await db.query(
      'INSERT INTO users (email, password_hash, organization_id) VALUES ($1, $2, $3) RETURNING *',
      [defaultAdmin.email, defaultAdmin.password_hash, defaultAdmin.organization_id]
    );
    
    // Assign admin role
    await db.query(
      'INSERT INTO user_roles (user_id, role_id, organization_id) VALUES ($1, $2, $3)',
      [result.rows[0].id, 1, defaultAdmin.organization_id] // role_id 1 = 'admin'
    );

    return result.rows[0];
  }

  static async createTestAsset(overrides = {}) {
    const defaultAsset = {
      name: 'Test Asset',
      type: 'billboard',
      location: 'Test Location',
      level: 'secondary',
      ...overrides
    };

    const result = await db.query(
      'INSERT INTO assets (name, type, location, level) VALUES ($1, $2, $3, $4) RETURNING *',
      [defaultAsset.name, defaultAsset.type, defaultAsset.location, defaultAsset.level]
    );
    return result.rows[0];
  }

  static async createTestBooking(overrides = {}) {
    const defaultBooking = {
      title: 'Test Booking',
      asset_id: 1,
      user_id: 1,
      start_date: '2024-01-15',
      end_date: '2024-01-20',
      status: 'pending',
      ...overrides
    };

    const result = await db.query(
      'INSERT INTO bookings (title, asset_id, user_id, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [defaultBooking.title, defaultBooking.asset_id, defaultBooking.user_id, defaultBooking.start_date, defaultBooking.end_date, defaultBooking.status]
    );
    return result.rows[0];
  }
}

module.exports = TestDBHelper; 