// Test helpers for analytics implementation tests
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

// Mock JWT secret for testing
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

const testHelpers = {
  async createTestUser(userData = {}) {
    const defaultUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123',
      role: 'admin',
      ...userData
    };

    // Hash password (simple hash for testing)
    const hashedPassword = Buffer.from(defaultUser.password).toString('base64');

    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role`,
      [defaultUser.username, defaultUser.email, hashedPassword, defaultUser.role, true]
    );

    const user = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      ...user,
      token,
      password: defaultUser.password
    };
  },

  async createTestAsset(assetData = {}) {
    const defaultAsset = {
      name: `Test Asset ${Date.now()}`,
      location: 'Test Location',
      type: 'billboard',
      max_slots: 5,
      importance: 1,
      impressions_per_day: 1000,
      value_per_day: 50.00,
      level: 'secondary',
      is_active: true,
      dimensions: JSON.stringify({ width: 300, height: 250 }),
      ...assetData
    };

    const result = await db.query(
      `INSERT INTO assets (name, location, type, max_slots, importance, impressions_per_day, value_per_day, level, is_active, dimensions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, location, type, max_slots, importance, impressions_per_day, value_per_day, level, is_active, dimensions`,
      [
        defaultAsset.name,
        defaultAsset.location,
        defaultAsset.type,
        defaultAsset.max_slots,
        defaultAsset.importance,
        defaultAsset.impressions_per_day,
        defaultAsset.value_per_day,
        defaultAsset.level,
        defaultAsset.is_active,
        defaultAsset.dimensions
      ]
    );

    return result.rows[0];
  },

  async createTestCreative(assetId, creativeData = {}) {
    const defaultCreative = {
      asset_id: assetId,
      campaign_id: null,
      name: `Test Creative ${Date.now()}`,
      type: 'image',
      content: JSON.stringify({
        url: 'https://example.com/test-image.jpg',
        alt_text: 'Test Creative'
      }),
      dimensions: JSON.stringify({ width: 300, height: 250 }),
      file_size: 102400,
      status: 'draft',
      ...creativeData
    };

    const result = await db.query(
      `INSERT INTO creatives (asset_id, campaign_id, name, type, content, dimensions, file_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, asset_id, campaign_id, name, type, content, dimensions, file_size, status, created_at, updated_at`,
      [
        defaultCreative.asset_id,
        defaultCreative.campaign_id,
        defaultCreative.name,
        defaultCreative.type,
        defaultCreative.content,
        defaultCreative.dimensions,
        defaultCreative.file_size,
        defaultCreative.status
      ]
    );

    return result.rows[0];
  },

  async createTestCampaign(campaignData = {}) {
    const defaultCampaign = {
      advertiser_id: 1,
      name: `Test Campaign ${Date.now()}`,
      budget: 1000.00,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'active',
      targeting_criteria: JSON.stringify({
        geolocation: ['US'],
        demographics: { age_range: [18, 45] }
      }),
      ...campaignData
    };

    const result = await db.query(
      `INSERT INTO campaigns (advertiser_id, name, budget, start_date, end_date, status, targeting_criteria)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, advertiser_id, name, budget, start_date, end_date, status, targeting_criteria`,
      [
        defaultCampaign.advertiser_id,
        defaultCampaign.name,
        defaultCampaign.budget,
        defaultCampaign.start_date,
        defaultCampaign.end_date,
        defaultCampaign.status,
        defaultCampaign.targeting_criteria
      ]
    );

    return result.rows[0];
  },

  async createTestPerformanceMetrics(creativeId, metricsData = {}) {
    const defaultMetrics = {
      creative_id: creativeId,
      date: new Date().toISOString().split('T')[0],
      impressions: 1000,
      clicks: 15,
      revenue: 5.00,
      ...metricsData
    };

    const result = await db.query(
      `INSERT INTO performance_metrics (creative_id, date, impressions, clicks, revenue)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (creative_id, date) 
       DO UPDATE SET 
         impressions = performance_metrics.impressions + $3,
         clicks = performance_metrics.clicks + $4,
         revenue = performance_metrics.revenue + $5,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        defaultMetrics.creative_id,
        defaultMetrics.date,
        defaultMetrics.impressions,
        defaultMetrics.clicks,
        defaultMetrics.revenue
      ]
    );

    return result.rows[0];
  },

  async cleanupTestData(userId, assetId, creativeId) {
    try {
      if (creativeId) {
        await db.query('DELETE FROM performance_metrics WHERE creative_id = $1', [creativeId]);
        await db.query('DELETE FROM creatives WHERE id = $1', [creativeId]);
      }
      if (assetId) {
        await db.query('DELETE FROM assets WHERE id = $1', [assetId]);
      }
      if (userId) {
        await db.query('DELETE FROM users WHERE id = $1', [userId]);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  },

  async setupTestDatabase() {
    try {
      // Create test tables if they don't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS assets (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          location VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL,
          max_slots INTEGER NOT NULL,
          importance INTEGER DEFAULT 1,
          impressions_per_day INTEGER DEFAULT 0,
          value_per_day DECIMAL(12,2) DEFAULT 0,
          level VARCHAR(50) DEFAULT 'secondary',
          is_active BOOLEAN DEFAULT true,
          dimensions JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS creatives (
          id SERIAL PRIMARY KEY,
          asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
          campaign_id INTEGER,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          content JSONB NOT NULL,
          dimensions JSONB,
          file_size INTEGER,
          status VARCHAR(50) DEFAULT 'draft',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS campaigns (
          id SERIAL PRIMARY KEY,
          advertiser_id INTEGER,
          name VARCHAR(255) NOT NULL,
          budget DECIMAL(10,2),
          start_date DATE,
          end_date DATE,
          status VARCHAR(50) DEFAULT 'draft',
          targeting_criteria JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id SERIAL PRIMARY KEY,
          creative_id INTEGER,
          date DATE NOT NULL,
          impressions INTEGER DEFAULT 0,
          clicks INTEGER DEFAULT 0,
          revenue DECIMAL(10,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(creative_id, date)
        )
      `);

      console.log('Test database setup completed');
    } catch (error) {
      console.error('Error setting up test database:', error);
      throw error;
    }
  },

  async clearTestData() {
    try {
      await db.query('DELETE FROM performance_metrics');
      await db.query('DELETE FROM creatives');
      await db.query('DELETE FROM campaigns');
      await db.query('DELETE FROM assets');
      await db.query('DELETE FROM users WHERE username LIKE \'testuser_%\'');
      console.log('Test data cleared');
    } catch (error) {
      console.error('Error clearing test data:', error);
    }
  }
};

module.exports = testHelpers; 