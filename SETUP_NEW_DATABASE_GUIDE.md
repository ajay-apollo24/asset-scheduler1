# Complete Database Setup Guide

## 🎯 **Overview**

This guide provides the exact sequence to set up a completely new database for the Asset Scheduler system. Follow these steps in order to create a fresh database environment.

## 📋 **Prerequisites**

### **1. PostgreSQL Installation**
Make sure PostgreSQL is installed and running:

```bash
# macOS - Option 1: Postgres.app (Recommended)
# Download from https://postgresapp.com/
# Open Postgres.app from Applications folder
open /Applications/Postgres.app

# macOS - Option 2: Homebrew
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# CentOS/RHEL
sudo yum install postgresql postgresql-server
sudo systemctl start postgresql
```

**For Postgres.app users**: Make sure Postgres.app is running (you should see the elephant icon in your menu bar).

### **2. Node.js Installation**
Make sure Node.js is installed:

```bash
# Check Node.js version
node --version
npm --version
```

## 🚀 **Setup Sequence**

### **Step 1: Create Database and User**

```bash
# For Postgres.app users: Add to PATH first
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

# Connect to PostgreSQL as superuser
psql -U postgres

# Create database user
CREATE USER asset_allocation WITH PASSWORD 'asset_allocation_password';

# Create database
CREATE DATABASE asset_allocation OWNER asset_allocation;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE asset_allocation TO asset_allocation;
GRANT ALL ON SCHEMA public TO asset_allocation;

# Exit psql
\q
```

### **Step 2: Set Up Environment Variables**

Create `backend/.env` file:

```bash
# Create .env file
cat > backend/.env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asset_allocation
DB_USER=asset_allocation
DB_PASSWORD=asset_allocation_password

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
EOF
```

### **Step 3: Install Dependencies**

```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### **Step 4: Run Database Migrations**

```bash
# Run enhanced fairness migration
node scripts/run-enhanced-fairness-migration.js
```

### **Step 5: Seed Database with Sample Data**

```bash
# Run unified seed script
node backend/scripts/seeds/unifiedSeedScript.js
```

### **Step 6: Verify Database Setup**

```bash
# Connect to database and check tables
psql -h localhost -p 5432 -U asset_allocation -d asset_allocation

# Check core tables
SELECT 'organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'assets', COUNT(*) FROM assets
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL
SELECT 'creatives', COUNT(*) FROM creatives;

# Check RBAC tables
SELECT 'permissions' as table_name, COUNT(*) as count FROM permissions
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles;

# Check enhanced fairness tables
SELECT 'slot_allocation' as table_name, COUNT(*) as count FROM slot_allocation
UNION ALL
SELECT 'fairness_scores', COUNT(*) FROM fairness_scores
UNION ALL
SELECT 'engagement_metrics', COUNT(*) FROM engagement_metrics
UNION ALL
SELECT 'conversion_metrics', COUNT(*) FROM conversion_metrics
UNION ALL
SELECT 'revenue_metrics', COUNT(*) FROM revenue_metrics;

# Exit psql
\q
```

### **Step 7: Test Application**

```bash
# Start backend server
cd backend
npm start

# In another terminal, test endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/organizations
curl http://localhost:3001/api/assets
```

### **Step 8: Start Frontend (Optional)**

```bash
# Start frontend server
cd frontend
npm start
```

## 📊 **Expected Results**

### **Database Tables Created:**
- ✅ `organizations` - 4 organizations (Apollo, TechCorp, HealthFirst, EduTech)
- ✅ `users` - 11 users with proper roles
- ✅ `assets` - 7 assets (primary, secondary, tertiary)
- ✅ `campaigns` - 6 campaigns (internal and external)
- ✅ `creatives` - 3 creatives with content
- ✅ `permissions` - 28 system permissions
- ✅ `roles` - 10 user roles
- ✅ `role_permissions` - Role-permission mappings
- ✅ `user_roles` - User-role assignments
- ✅ `slot_allocation` - Internal/external/monetization splits
- ✅ `fairness_scores` - Calculated fairness scores
- ✅ `engagement_metrics` - User interaction data
- ✅ `conversion_metrics` - Booking conversion data
- ✅ `revenue_metrics` - Revenue tracking data

### **Sample Users Created:**
- **Platform Admin**: `platform.admin@adsaas.com` / `platform123`
- **Support**: `support@adsaas.com` / `support123`
- **Apollo CEO**: `ceo@apollo.com` / `apollo123`
- **Apollo Marketing**: `marketing@apollo.com` / `apollo123`
- **Apollo Pharmacy**: `pharmacy@apollo.com` / `apollo123`
- **Apollo Diagnostics**: `diagnostics@apollo.com` / `apollo123`
- **TechCorp CEO**: `ceo@techcorp.com` / `tech123`
- **TechCorp Marketing**: `marketing@techcorp.com` / `tech123`
- **HealthFirst Director**: `director@healthfirst.com` / `health123`
- **HealthFirst Campaigns**: `campaigns@healthfirst.com` / `health123`
- **EduTech Admin**: `admin@edutech.edu` / `edu123`

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **1. PostgreSQL Connection Error**
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL if needed
# macOS: brew services start postgresql
# Ubuntu: sudo systemctl start postgresql
# CentOS: sudo systemctl start postgresql
```

#### **2. Permission Denied**
```bash
# Make sure you're using the correct user
psql -U postgres -c "ALTER USER asset_allocation CREATEDB;"
```

#### **3. Database Already Exists**
```bash
# Drop and recreate if needed
psql -U postgres -c "DROP DATABASE IF EXISTS asset_allocation;"
psql -U postgres -c "CREATE DATABASE asset_allocation OWNER asset_allocation;"
```

#### **4. Migration Errors**
```bash
# Check if tables already exist
psql -h localhost -p 5432 -U asset_allocation -d asset_allocation -c "\dt"

# Drop and recreate if needed
psql -h localhost -p 5432 -U asset_allocation -d asset_allocation -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

#### **5. Seed Script Errors**
```bash
# Clear existing data and reseed
node backend/scripts/seeds/unifiedSeedScript.js
```

## 🎯 **Quick Setup Script**

If you prefer to use the automated setup script:

```bash
# Make script executable
chmod +x scripts/setup-new-database.sh

# Run setup script
./scripts/setup-new-database.sh
```

## 🚀 **Next Steps After Setup**

1. **Start Backend Server:**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend Server:**
   ```bash
   cd frontend
   npm start
   ```

3. **Access Application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

4. **Login with Sample Users:**
   - Use any of the sample users listed above
   - Platform Admin has full system access

## 📁 **Important Files**

- **Environment Config**: `backend/.env`
- **Database Config**: `backend/config/db.js`
- **Unified Seed Script**: `backend/scripts/seeds/unifiedSeedScript.js`
- **Enhanced Fairness Config**: `backend/config/enhancedFairnessConfig.json`
- **Migration Script**: `scripts/run-enhanced-fairness-migration.js`

## 🔧 **Useful Commands**

```bash
# Reset database
node backend/scripts/seeds/unifiedSeedScript.js

# View logs
tail -f backend/logs/app.log

# Database shell
psql -h localhost -p 5432 -U asset_allocation -d asset_allocation

# Check database size
psql -h localhost -p 5432 -U asset_allocation -d asset_allocation -c "SELECT pg_size_pretty(pg_database_size('asset_allocation'));"

# List all tables
psql -h localhost -p 5432 -U asset_allocation -d asset_allocation -c "\dt"
```

## ✅ **Verification Checklist**

- [ ] PostgreSQL is running
- [ ] Database `asset_allocation` exists
- [ ] User `asset_allocation` has proper permissions
- [ ] Environment file `backend/.env` is created
- [ ] Dependencies are installed
- [ ] Migrations are completed
- [ ] Seed script runs successfully
- [ ] All tables have data
- [ ] Backend server starts without errors
- [ ] API endpoints respond correctly
- [ ] Frontend server starts (optional)

## 🎉 **Success!**

Once you've completed all steps, you'll have a fully functional Asset Scheduler database with:

- ✅ Complete RBAC system with permissions and roles
- ✅ Sample organizations and users
- ✅ Assets with different levels (primary, secondary, tertiary)
- ✅ Internal and external campaigns
- ✅ Enhanced fairness system with slot allocation
- ✅ ROI tracking with engagement, conversion, and revenue metrics
- ✅ Proper foreign key relationships and constraints

Your database is ready for development and testing! 🚀 