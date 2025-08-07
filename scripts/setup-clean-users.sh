#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database Configuration
DB_HOST="localhost"
DB_PORT="5435"
DB_NAME="asset_allocation"
DB_USER="asset_allocation"
DB_PASSWORD="asset_allocation"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo ""
    echo -e "${BLUE}📋 Step $1: $2${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

echo "============================================================================="
echo "🚀 Asset Scheduler - Clean User Setup"
echo "============================================================================="

# Step 1: Check PostgreSQL connection
print_step "1" "Checking Database Connection"

export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_error "Cannot connect to database. Please check your database setup."
    exit 1
fi

# Step 2: Clear existing data
print_step "2" "Clearing Existing Users and Roles"

print_info "Clearing existing user data..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "DELETE FROM user_roles; DELETE FROM users; DELETE FROM roles;" > /dev/null 2>&1
print_success "Existing users and roles cleared"
print_info "Note: Keeping existing organizations to avoid domain conflicts"

# Step 3: Create organizations
print_step "3" "Creating Organizations"

print_info "Creating organizations (skipping existing domains)..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
INSERT INTO organizations (name, domain, created_at) VALUES 
('Asset Scheduler Platform', 'assetscheduler.com', CURRENT_TIMESTAMP)
ON CONFLICT (domain) DO NOTHING;
"
print_success "Created organizations (skipped existing domains)"

# Step 4: Create roles
print_step "4" "Creating Roles"

print_info "Creating roles..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
INSERT INTO roles (name, description, created_at) VALUES 
('admin', 'Platform Administrator with full access', CURRENT_TIMESTAMP),
('manager', 'Asset Manager with booking and approval rights', CURRENT_TIMESTAMP),
('user', 'Regular user with basic booking rights', CURRENT_TIMESTAMP);
"
print_success "Created 3 roles"

# Step 5: Get organization IDs and create users
print_step "5" "Creating Users"

print_info "Getting organization IDs and creating users..."

# Get organization IDs (use existing organizations for apollo and techcorp)
PLATFORM_ORG_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM organizations WHERE name = 'Asset Scheduler Platform';" | xargs)
APOLLO_ORG_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM organizations WHERE domain = 'apollo.com';" | xargs)
TECHCORP_ORG_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM organizations WHERE domain = 'techcorp.com';" | xargs)

print_info "Organization IDs: Platform=$PLATFORM_ORG_ID, Apollo=$APOLLO_ORG_ID, TechCorp=$TECHCORP_ORG_ID"

# Check if we have valid organization IDs
if [ -z "$PLATFORM_ORG_ID" ] || [ -z "$APOLLO_ORG_ID" ] || [ -z "$TECHCORP_ORG_ID" ]; then
    print_error "Missing organization IDs. Cannot create users."
    print_info "Platform ID: $PLATFORM_ORG_ID"
    print_info "Apollo ID: $APOLLO_ORG_ID" 
    print_info "TechCorp ID: $TECHCORP_ORG_ID"
    exit 1
fi

# Create users with proper bcrypt hashed passwords (password123)
# Generate a proper bcryptjs hash for "password123"
print_info "Generating proper bcryptjs hash for password123..."

# Create a temporary Node.js script to generate the hash in backend directory
TEMP_HASH_SCRIPT="backend/temp_hash.js"
cat > "$TEMP_HASH_SCRIPT" << 'EOF'
const bcrypt = require('bcryptjs');
bcrypt.hash('password123', 10).then(hash => {
    console.log(hash);
    process.exit(0);
}).catch(err => {
    console.error('Error generating hash:', err);
    process.exit(1);
});
EOF

# Generate the hash using Node.js from backend directory
BCRYPT_HASH=$(cd backend && node temp_hash.js)
rm -f "$TEMP_HASH_SCRIPT"

print_info "Generated hash: ${BCRYPT_HASH:0:30}..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
INSERT INTO users (email, password_hash, organization_id, created_at) VALUES 
('admin@assetscheduler.com', '$BCRYPT_HASH', $PLATFORM_ORG_ID, CURRENT_TIMESTAMP),
('manager@apollo.com', '$BCRYPT_HASH', $APOLLO_ORG_ID, CURRENT_TIMESTAMP),
('user@techcorp.com', '$BCRYPT_HASH', $TECHCORP_ORG_ID, CURRENT_TIMESTAMP);
"
print_success "Created 3 users"

# Step 6: Assign roles to users
print_step "6" "Assigning Roles to Users"

print_info "Getting user and role IDs and assigning roles..."

# Get user IDs
ADMIN_USER_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM users WHERE email = 'admin@assetscheduler.com';" | xargs)
MANAGER_USER_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM users WHERE email = 'manager@apollo.com';" | xargs)
USER_USER_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM users WHERE email = 'user@techcorp.com';" | xargs)

# Get role IDs (take the first one if multiple exist)
ADMIN_ROLE_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM roles WHERE name = 'admin' LIMIT 1;" | xargs)
MANAGER_ROLE_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM roles WHERE name = 'manager' LIMIT 1;" | xargs)
USER_ROLE_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM roles WHERE name = 'user' LIMIT 1;" | xargs)

print_info "User IDs: Admin=$ADMIN_USER_ID, Manager=$MANAGER_USER_ID, User=$USER_USER_ID"
print_info "Role IDs: Admin=$ADMIN_ROLE_ID, Manager=$MANAGER_ROLE_ID, User=$USER_ROLE_ID"

# Check if we have valid role IDs
if [ -z "$ADMIN_ROLE_ID" ] || [ -z "$MANAGER_ROLE_ID" ] || [ -z "$USER_ROLE_ID" ]; then
    print_error "Missing role IDs. Cannot assign roles."
    print_info "Admin Role ID: $ADMIN_ROLE_ID"
    print_info "Manager Role ID: $MANAGER_ROLE_ID"
    print_info "User Role ID: $USER_ROLE_ID"
    exit 1
fi

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
INSERT INTO user_roles (user_id, role_id, created_at) VALUES 
($ADMIN_USER_ID, $ADMIN_ROLE_ID, CURRENT_TIMESTAMP),
($MANAGER_USER_ID, $MANAGER_ROLE_ID, CURRENT_TIMESTAMP),
($USER_USER_ID, $USER_ROLE_ID, CURRENT_TIMESTAMP);
"
print_success "Roles assigned to users"

# Step 7: Verify setup
print_step "7" "Verifying Setup"

print_info "Checking created data..."
USER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" | xargs)
ORG_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM organizations;" | xargs)
ROLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM roles;" | xargs)

print_success "Setup verification complete:"
echo "  - Users: $USER_COUNT"
echo "  - Organizations: $ORG_COUNT"
echo "  - Roles: $ROLE_COUNT"

# Step 8: Display login credentials
print_step "8" "Login Credentials"

echo ""
echo -e "${GREEN}✅ Clean user setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}🔐 Login Credentials:${NC}"
echo "  Platform Admin: admin@assetscheduler.com / password123"
echo "  Apollo Manager: manager@apollo.com / password123"
echo "  TechCorp User: user@techcorp.com / password123"
echo ""
echo -e "${BLUE}📊 User Roles:${NC}"
echo "  - admin@assetscheduler.com: Platform Administrator (full access)"
echo "  - manager@apollo.com: Asset Manager (booking & approval rights)"
echo "  - user@techcorp.com: Regular User (basic booking rights)"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "  1. Start the backend server: cd backend && npm start"
echo "  2. Start the frontend server: cd frontend && npm start"
echo "  3. Access the application: http://localhost:3000"
echo "  4. Login with any of the users above"
echo ""
echo "=============================================================================" 