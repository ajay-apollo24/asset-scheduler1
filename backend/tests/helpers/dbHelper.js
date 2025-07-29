// tests/helpers/dbHelper.js
const db = require('../../config/db');

class TestDBHelper {
  static async setupTestDB() {
    try {
      // Test database connection first
      await db.query('SELECT 1');
      
      // Create test tables if they don't exist
      await this.createTestTables();
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw new Error(`Database setup failed: ${error.message}`);
    }
  }

  static async createTestTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createAssetsTable = `
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        max_slots INTEGER DEFAULT 1,
        importance INTEGER DEFAULT 1,
        impressions_per_day INTEGER DEFAULT 0,
        value_per_day DECIMAL(10,2) DEFAULT 0,
        level VARCHAR(50) DEFAULT 'secondary',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createBookingsTable = `
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER REFERENCES assets(id),
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        lob VARCHAR(100) NOT NULL,
        purpose TEXT,
        creative_url TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createAuditLogsTable = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        metadata JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createApprovalsTable = `
      CREATE TABLE IF NOT EXISTS approvals (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id),
        step INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        comment TEXT,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await db.query(createUsersTable);
      await db.query(createAssetsTable);
      await db.query(createBookingsTable);
      await db.query(createAuditLogsTable);
      await db.query(createApprovalsTable);
    } catch (error) {
      console.error('Error creating test tables:', error);
      throw error;
    }
  }

  static async cleanupTestDB() {
    const tables = ['audit_logs', 'approvals', 'bookings', 'assets', 'users'];
    
    for (const table of tables) {
      try {
        await db.query(`DELETE FROM ${table}`);
        // Reset sequence only if table exists and has data
        const sequenceCheck = await db.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = '${table}'
          )
        `);
        
        if (sequenceCheck.rows[0].exists) {
          await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1`);
        }
      } catch (error) {
        console.error(`Error cleaning up ${table}:`, error);
        // Don't throw here to allow other cleanup to continue
      }
    }
  }

  static async insertTestData() {
    try {
      // Insert test user
      const testUser = await db.query(`
        INSERT INTO users (email, password_hash, role) 
        VALUES ($1, $2, $3) 
        RETURNING *
      `, ['test@example.com', 'hashed_password', 'admin']);

      // Insert test asset
      const testAsset = await db.query(`
        INSERT INTO assets (name, location, type, max_slots, importance, level) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `, ['Test Asset', 'test_location', 'banner', 1, 1, 'secondary']);

      return {
        user: testUser.rows[0],
        asset: testAsset.rows[0]
      };
    } catch (error) {
      console.error('Error inserting test data:', error);
      throw error;
    }
  }

  static async getTestData() {
    try {
      const users = await db.query('SELECT * FROM users');
      const assets = await db.query('SELECT * FROM assets');
      const bookings = await db.query('SELECT * FROM bookings');
      const auditLogs = await db.query('SELECT * FROM audit_logs');
      const approvals = await db.query('SELECT * FROM approvals');

      return {
        users: users.rows,
        assets: assets.rows,
        bookings: bookings.rows,
        auditLogs: auditLogs.rows,
        approvals: approvals.rows
      };
    } catch (error) {
      console.error('Error getting test data:', error);
      throw error;
    }
  }
}

module.exports = TestDBHelper; 