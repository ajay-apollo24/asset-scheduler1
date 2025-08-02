const db = require('../config/db');

async function setupTestDatabase() {
  console.log('🗄️  Setting up test database...');
  
  try {
    // Create organizations table first (if it doesn't exist)
    await db.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE
      )
    `);
    
    // Create permissions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create roles table
    await db.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        is_system_role BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, organization_id)
      )
    `);
    
    // Create role_permissions junction table
    await db.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, permission_id)
      )
    `);
    
    // Create user_roles junction table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id, organization_id)
      )
    `);
    
    // Create assets table
    await db.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        location VARCHAR(255),
        level VARCHAR(50) DEFAULT 'secondary',
        dimensions JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create bookings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        asset_id INTEGER REFERENCES assets(id),
        user_id INTEGER REFERENCES users(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create creatives table
    await db.query(`
      CREATE TABLE IF NOT EXISTS creatives (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        asset_id INTEGER REFERENCES assets(id),
        campaign_id INTEGER,
        content JSONB,
        dimensions JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create campaigns table
    await db.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        budget DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create approvals table
    await db.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id),
        requested_by INTEGER REFERENCES users(id),
        decided_by INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create bids table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id),
        lob VARCHAR(100) NOT NULL,
        bid_amount NUMERIC(10,2) NOT NULL,
        max_bid NUMERIC(10,2),
        bid_reason TEXT,
        user_id INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT bids_status_check CHECK (status IN ('active', 'cancelled', 'won', 'lost'))
      )
    `);
    
    // Insert default organization
    await db.query(`
      INSERT INTO organizations (id, name) 
      VALUES (1, 'Test Organization') 
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Insert default roles
    await db.query(`
      INSERT INTO roles (id, name, description, organization_id, is_system_role) 
      VALUES 
        (1, 'admin', 'Administrator role', 1, true),
        (2, 'user', 'Regular user role', 1, true)
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Insert default permissions
    await db.query(`
      INSERT INTO permissions (id, name, description, resource, action) 
      VALUES 
        (1, 'read_assets', 'Read assets', 'assets', 'read'),
        (2, 'write_assets', 'Write assets', 'assets', 'write'),
        (3, 'read_bookings', 'Read bookings', 'bookings', 'read'),
        (4, 'write_bookings', 'Write bookings', 'bookings', 'write'),
        (5, 'read_creatives', 'Read creatives', 'creatives', 'read'),
        (6, 'write_creatives', 'Write creatives', 'creatives', 'write')
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Assign permissions to roles
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id) 
      VALUES 
        (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),  -- admin gets all permissions
        (2, 1), (2, 3), (2, 5)  -- user gets read permissions
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
    
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  }
}

module.exports = setupTestDatabase; 