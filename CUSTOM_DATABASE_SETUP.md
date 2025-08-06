# 🎯 Custom Database Setup Guide

This guide shows you how to set up Asset Scheduler with a custom database name.

## 🚀 Quick Setup (Recommended)

### Step 1: Edit the Setup Script

Open `scripts/simple-setup.sh` and change the database name:

```bash
# Find this line (around line 12):
DB_NAME="asset_allocation"

# Change it to your desired name:
DB_NAME="my_custom_db_name"
```

### Step 2: Run the Setup Script

```bash
./scripts/simple-setup.sh
```

That's it! The script will:
- ✅ Create your custom database
- ✅ Create a user for the database
- ✅ Set up all tables and sample data
- ✅ Configure the environment file
- ✅ Install dependencies

---

## 🔧 Manual Setup (Advanced)

If you prefer to set up everything manually:

### Step 1: Create Database and User

```bash
# Connect to PostgreSQL
psql -h localhost -p 5435

# Create user (replace 'my_custom_db_name' with your desired name)
CREATE USER my_custom_db_user WITH PASSWORD 'my_custom_password';

# Create database
CREATE DATABASE my_custom_db_name OWNER my_custom_db_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE my_custom_db_name TO my_custom_db_user;
GRANT ALL ON SCHEMA public TO my_custom_db_user;

# Exit psql
\q
```

### Step 2: Create Environment File

Create `backend/.env`:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5435
DB_NAME=my_custom_db_name
DB_USER=my_custom_db_user
DB_PASSWORD=my_custom_password

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
DATABASE_URL=postgresql://my_custom_db_user:my_custom_password@localhost:5435/my_custom_db_name
```

### Step 3: Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### Step 4: Run Database Setup

```bash
# Run migrations
cd ..
node scripts/run-enhanced-fairness-migration.js

# Run seed script
node backend/scripts/seeds/unifiedSeedScript.js
```

### Step 5: Verify Setup

```bash
# Check tables
psql -h localhost -p 5435 -U my_custom_db_user -d my_custom_db_name -c "\dt"

# Check sample data
psql -h localhost -p 5435 -U my_custom_db_user -d my_custom_db_name -c "SELECT COUNT(*) FROM organizations;"
```

---

## 📋 Places to Update Database Name

If you change the database name, update these files:

### 1. **Setup Script** (`scripts/simple-setup.sh`)
```bash
DB_NAME="your_new_db_name"
DB_USER="your_new_user"
DB_PASSWORD="your_new_password"
```

### 2. **Environment File** (`backend/.env`)
```bash
DB_NAME=your_new_db_name
DB_USER=your_new_user
DB_PASSWORD=your_new_password
DATABASE_URL=postgresql://your_new_user:your_new_password@localhost:5435/your_new_db_name
```

### 3. **Database Configuration** (`backend/config/db.js`)
This file uses `DATABASE_URL` from the environment, so updating `.env` is sufficient.

---

## 🎯 Example: Using "my_project_db"

### Step 1: Edit Setup Script
```bash
# In scripts/simple-setup.sh, change:
DB_NAME="my_project_db"
DB_USER="my_project_user"
DB_PASSWORD="my_project_pass"
```

### Step 2: Run Setup
```bash
./scripts/simple-setup.sh
```

### Step 3: Verify
```bash
# Check database
psql -h localhost -p 5435 -U my_project_user -d my_project_db -c "\dt"

# Start servers
cd backend && npm start
cd ../frontend && npm start
```

---

## ⚠️ Important Notes

1. **Database Name Rules**:
   - Use lowercase letters, numbers, and underscores only
   - Avoid special characters and spaces
   - Examples: `my_db`, `project_2024`, `asset_scheduler_dev`

2. **User Permissions**:
   - The setup script automatically grants necessary permissions
   - If manual setup, ensure the user has full access to the database

3. **Port Configuration**:
   - Default PostgreSQL port is 5432
   - Postgres.app often uses 5435
   - Update `DB_PORT` in the setup script if needed

4. **Existing Data**:
   - The setup script will create a fresh database
   - Any existing data in the new database will be cleared

---

## 🆘 Troubleshooting

**If you get "database does not exist" errors:**
- Check that the database name is spelled correctly
- Ensure the database was created successfully
- Verify the user has access to the database

**If you get "permission denied" errors:**
- Grant permissions: `GRANT ALL PRIVILEGES ON DATABASE your_db_name TO your_user;`
- Grant schema access: `GRANT ALL ON SCHEMA public TO your_user;`

**If migrations fail:**
- Ensure the database exists and is empty
- Check that the user has full permissions
- Try running migrations manually: `node scripts/run-enhanced-fairness-migration.js`

---

## 🎉 Success!

Once setup is complete, you'll have:
- ✅ Custom database with your chosen name
- ✅ All tables and sample data
- ✅ Working backend and frontend
- ✅ Access to the application at http://localhost:3000

Happy coding! 🚀 