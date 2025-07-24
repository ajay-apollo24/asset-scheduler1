-- ================================
-- 1. Table Definitions
-- ================================

-- users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'requestor')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- assets
CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  max_slots INTEGER NOT NULL CHECK (max_slots >= 1),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- bookings
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- 2. Access & Privileges
-- ================================

-- GRANT SCHEMA USAGE
GRANT USAGE ON SCHEMA public TO asset_allocation;

-- GRANT SELECT on existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO asset_allocation;

-- GRANT SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO asset_allocation;

-- GRANT FULL TABLE PRIVILEGES
GRANT ALL PRIVILEGES ON TABLE users TO asset_allocation;
GRANT ALL PRIVILEGES ON TABLE assets TO asset_allocation;
GRANT ALL PRIVILEGES ON TABLE bookings TO asset_allocation;
GRANT ALL PRIVILEGES ON TABLE audit_logs TO asset_allocation;

-- ================================
-- 3. Seed Admin User
-- ================================

-- Password: admin123
INSERT INTO users (email, password_hash, role)
VALUES (
  'admin@localhost',
  '$2b$10$J1DRUOfXZYr.1sHq3YIp8enfD6qAguUzUQTnC7W9u0FcNDOjoZYi6',
  'admin'
)
ON CONFLICT (email) DO NOTHING;