#!/bin/bash

# New Database Setup Script
# This script creates a completely new database with all tables and data from scratch

set -e  # Exit on any error

# Change to the project root directory
cd "$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database Configuration - CHANGE THESE TO YOUR PREFERENCE
DB_NAME="asset_scheduler_new"
DB_USER="asset_scheduler_user"
DB_PASSWORD="asset_scheduler_pass"
DB_HOST="localhost"
DB_PORT="5435"

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}🚀 Asset Scheduler - New Database Setup${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

# Function to print step headers
print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning messages
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print info messages
print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Step 1: Check PostgreSQL
print_step "1" "Checking PostgreSQL Installation"

# Check for Postgres.app (macOS)
if [ -d "/Applications/Postgres.app" ]; then
    print_info "Found Postgres.app installation"
    PSQL_PATH="/Applications/Postgres.app/Contents/Versions/latest/bin"
    export PATH="$PSQL_PATH:$PATH"
    print_info "Added Postgres.app to PATH: $PSQL_PATH"
elif command -v psql &> /dev/null; then
    print_info "Found PostgreSQL in system PATH"
    PSQL_PATH=""
else
    print_error "PostgreSQL is not installed or not in PATH"
    print_info "Please install PostgreSQL first:"
    print_info "  - macOS: Download Postgres.app from https://postgresapp.com/"
    print_info "  - macOS: brew install postgresql"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
    print_error "PostgreSQL is not running on $DB_HOST:$DB_PORT"
    print_info "Please start PostgreSQL first:"
    if [ -d "/Applications/Postgres.app" ]; then
        print_info "  - Open Postgres.app from Applications folder"
    fi
    exit 1
fi

print_success "PostgreSQL is running on $DB_HOST:$DB_PORT"
echo ""

# Step 2: Create Database and User
print_step "2" "Creating Database and User"

# Try different connection methods for Postgres.app
print_info "Attempting to connect to PostgreSQL..."

# Method 1: Try connecting as current user (Postgres.app default)
if psql -h $DB_HOST -p $DB_PORT -c "SELECT version();" >/dev/null 2>&1; then
    print_success "Connected as current user (Postgres.app default)"
    PSQL_USER=""
elif psql -h $DB_HOST -p $DB_PORT -U postgres -c "SELECT version();" >/dev/null 2>&1; then
    print_success "Connected as postgres user"
    PSQL_USER="-U postgres"
else
    print_error "Cannot connect to PostgreSQL"
    print_info "Please ensure Postgres.app is running and accessible"
    exit 1
fi

print_info "Creating database user: $DB_USER"
psql -h $DB_HOST -p $DB_PORT $PSQL_USER -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_warning "User $DB_USER already exists"

print_info "Creating database: $DB_NAME"
psql -h $DB_HOST -p $DB_PORT $PSQL_USER -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || print_warning "Database $DB_NAME already exists"

print_info "Granting privileges to user"
psql -h $DB_HOST -p $DB_PORT $PSQL_USER -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
psql -h $DB_HOST -p $DB_PORT $PSQL_USER -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

print_success "Database and user created successfully"
echo ""

# Step 3: Create Environment File
print_step "3" "Creating Environment File"

ENV_FILE="backend/.env"

cat > "$ENV_FILE" << EOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Application Configuration
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Enhanced Fairness Configuration
FAIRNESS_ENABLED=true
ROI_TRACKING_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=your-session-secret-change-this-in-production

# Database URL (for compatibility)
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
EOF

print_success "Environment file created: $ENV_FILE"
echo ""

# Step 4: Install Dependencies
print_step "4" "Installing Dependencies"

print_info "Installing backend dependencies"
(cd backend && npm install)

print_info "Installing frontend dependencies"
(cd frontend && npm install)

print_success "Dependencies installed successfully"
echo ""

# Step 5: Create Database Schema Manually
print_step "5" "Creating Database Schema"

print_info "Creating tables manually..."

# Connect to the new database and create tables
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    organization_id INTEGER REFERENCES organizations(id),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    level VARCHAR(50) DEFAULT 'secondary',
    location VARCHAR(255),
    capacity INTEGER,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    advertiser_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    budget DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    advertiser_type VARCHAR(50) DEFAULT 'internal',
    lob VARCHAR(100),
    purpose TEXT,
    asset_id INTEGER REFERENCES assets(id),
    targeting_criteria JSONB,
    creative_settings JSONB,
    performance_settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create creatives table
CREATE TABLE IF NOT EXISTS creatives (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    asset_id INTEGER REFERENCES assets(id),
    content TEXT,
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bids table
CREATE TABLE IF NOT EXISTS bids (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    lob VARCHAR(100),
    bid_amount DECIMAL(10,2),
    max_bid DECIMAL(10,2),
    bid_reason TEXT,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100),
    action VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id INTEGER REFERENCES organizations(id),
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, organization_id)
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id, organization_id)
);

-- Create enhanced fairness tables
CREATE TABLE IF NOT EXISTS asset_monetization_limits (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL UNIQUE,
    monetization_slot_limit DECIMAL(5,2) NOT NULL,
    internal_slot_guarantee DECIMAL(5,2) NOT NULL,
    external_slot_limit DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_fairness_config (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL UNIQUE,
    strategic_weight DECIMAL(5,2) DEFAULT 1.0,
    time_restriction VARCHAR(50),
    custom_roi_metrics JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS engagement_metrics (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id),
    lob VARCHAR(100),
    engagement_count INTEGER DEFAULT 0,
    interaction_rate DECIMAL(5,4),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversion_metrics (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id),
    lob VARCHAR(100),
    conversion_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenue_metrics (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id),
    lob VARCHAR(100),
    revenue_amount DECIMAL(10,2) DEFAULT 0,
    revenue_per_day DECIMAL(10,2),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slot_allocation (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id),
    date DATE DEFAULT CURRENT_DATE,
    internal_slots INTEGER DEFAULT 0,
    external_slots INTEGER DEFAULT 0,
    monetization_slots INTEGER DEFAULT 0,
    total_slots INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bid_caps (
    id SERIAL PRIMARY KEY,
    lob VARCHAR(100) NOT NULL,
    max_bid_multiplier DECIMAL(5,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser ON campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_asset ON campaigns(asset_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_creatives_campaign ON creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_creatives_asset ON creatives(asset_id);
CREATE INDEX IF NOT EXISTS idx_bids_campaign ON bids(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bids_user ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(bid_amount DESC);

EOF

print_success "Database schema created successfully"
echo ""

# Step 6: Run Enhanced Fairness Migration
print_step "6" "Running Enhanced Fairness Migration"

print_info "Running enhanced fairness migration with temporary environment..."
# Temporarily replace .env with temp file for migration
mv backend/.env backend/.env.backup
cat > backend/.env << EOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Application Configuration
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Enhanced Fairness Configuration
FAIRNESS_ENABLED=true
ROI_TRACKING_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=your-session-secret-change-this-in-production

# Database URL (for compatibility)
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
EOF

node scripts/run-enhanced-fairness-migration.js

# Restore original .env
mv backend/.env.backup backend/.env

print_success "Enhanced fairness migration completed"
echo ""

# Step 7: Seed Database
print_step "7" "Seeding Database with Sample Data"

print_info "Creating temporary environment for seeding..."
# Create temporary .env file for seeding
TEMP_ENV_FILE="backend/.env.temp"
cat > "$TEMP_ENV_FILE" << EOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Application Configuration
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Enhanced Fairness Configuration
FAIRNESS_ENABLED=true
ROI_TRACKING_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=your-session-secret-change-this-in-production

# Database URL (for compatibility)
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
EOF

print_info "Running seed script with temporary environment..."
# Temporarily replace .env with temp file
mv backend/.env backend/.env.backup
mv "$TEMP_ENV_FILE" backend/.env

# Run the seed script
node backend/scripts/seeds/unifiedSeedScript.js

# Restore original .env
mv backend/.env backend/.env.temp
mv backend/.env.backup backend/.env

# Clean up temp file
rm -f backend/.env.temp

print_success "Database seeded successfully"
echo ""

# Step 8: Verify Setup
print_step "8" "Verifying Setup"

print_info "Checking database tables..."
TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

if [ "$TABLE_COUNT" -gt 0 ]; then
    print_success "Found $TABLE_COUNT tables in database"
else
    print_warning "No tables found in database"
fi

print_info "Checking sample data..."
ORG_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM organizations;" | xargs)
USER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" | xargs)

if [ "$ORG_COUNT" -gt 0 ] && [ "$USER_COUNT" -gt 0 ]; then
    print_success "Sample data found: $ORG_COUNT organizations, $USER_COUNT users"
else
    print_warning "Sample data not found"
fi

print_info "Database connection details for verification:"
print_info "  Database: $DB_NAME"
print_info "  User: $DB_USER"
print_info "  Host: $DB_HOST:$DB_PORT"

echo ""

# Step 9: Final Instructions
print_step "9" "Setup Complete!"

print_success "Asset Scheduler setup completed successfully!"
echo ""

echo -e "${BLUE}📊 Database Information:${NC}"
echo "  Database Name: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  Database Host: $DB_HOST"
echo "  Database Port: $DB_PORT"
echo ""

echo -e "${BLUE}🔐 Sample Users:${NC}"
echo "  Platform Admin: platform.admin@adsaas.com / platform123"
echo "  Apollo CEO: ceo@apollo.com / apollo123"
echo "  TechCorp CEO: ceo@techcorp.com / tech123"
echo ""

echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "  1. Start the backend server: cd backend && npm start"
echo "  2. Start the frontend server: cd frontend && npm start"
echo "  3. Access the application: http://localhost:3000"
echo "  4. Login with any of the sample users above"
echo ""

echo -e "${BLUE}📁 Important Files:${NC}"
echo "  Environment Config: backend/.env"
echo "  Database Config: backend/config/db.js"
echo ""

echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "  Reset database: node backend/scripts/seeds/unifiedSeedScript.js"
echo "  Database shell: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo ""

print_success "Setup completed! Your Asset Scheduler is ready to use."
echo -e "${BLUE}=============================================================================${NC}" 