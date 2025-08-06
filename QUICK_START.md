# 🚀 Asset Scheduler - Quick Start for New Developers

## Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** 
   - **macOS**: Download [Postgres.app](https://postgresapp.com/) or use `brew install postgresql`
   - **Linux**: `sudo apt-get install postgresql postgresql-contrib`
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)

## 🎯 One-Command Setup

**For new developers, simply run:**

```bash
# Clone the repository
git clone <repository-url>
cd asset-scheduler

# Run the simple setup script
./scripts/simple-setup.sh
```

That's it! The script will:
- ✅ Create database and user
- ✅ Install dependencies
- ✅ Set up all tables and sample data
- ✅ Configure environment files
- ✅ Verify everything works

## 📊 What Gets Created

**Database**: `asset_allocation`
- **Host**: localhost
- **Port**: 5435
- **User**: asset_scheduler_user
- **Password**: asset_scheduler_pass

**Sample Data**:
- 4 organizations (Apollo, TechCorp, HealthFirst, EduTech)
- 11 users with different roles
- 56 assets (various types)
- 6 sample campaigns
- RBAC system with permissions and roles

## 🚀 Starting the Application

After setup, start the servers:

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend  
cd frontend
npm start
```

**Access the application**: http://localhost:3000

## 🔐 Sample Login Credentials

- **Platform Admin**: `platform.admin@adsaas.com` / `platform123`
- **Apollo CEO**: `ceo@apollo.com` / `apollo123`
- **TechCorp CEO**: `ceo@techcorp.com` / `tech123`

## 🔧 Useful Commands

```bash
# Reset database with fresh data
node backend/scripts/seeds/unifiedSeedScript.js

# Connect to database
psql -h localhost -p 5435 -U asset_scheduler_user -d asset_allocation

# View logs
tail -f backend/logs/app.log
```

## 🆘 Troubleshooting

**If PostgreSQL is not running:**
- **macOS**: Open Postgres.app from Applications folder
- **Linux**: `sudo systemctl start postgresql`

**If setup fails:**
- Check that PostgreSQL is running on port 5435
- Ensure you have Node.js installed
- Try running the script again

**If you see "port already in use":**
- The backend runs on port 6510
- The frontend runs on port 3000
- Make sure these ports are available

## 📁 Project Structure

```
asset-scheduler/
├── backend/           # Node.js API server
├── frontend/          # React frontend
├── scripts/           # Setup and utility scripts
├── migrations/        # Database migrations
└── docs/             # Documentation
```

## 🎉 You're Ready!

The Asset Scheduler is now set up and ready for development. The system includes:

- **Real-Time Bidding (RTB)** for asset allocation
- **Enhanced Fairness System** for equitable distribution
- **RBAC (Role-Based Access Control)** for user management
- **Comprehensive Analytics** and reporting
- **Asset-specific configuration** capabilities

Happy coding! 🚀 