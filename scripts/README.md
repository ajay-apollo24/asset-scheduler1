# Scripts Directory

This directory contains utility scripts for development, debugging, and maintenance of the asset scheduler system.

## Available Scripts

### Database Scripts
- `check-permissions.js` - Check role-permission mappings in the database
- `check-user-role.js` - Verify user role assignments
- `debug-login.js` - Debug login process step by step
- `clear-rate-limits.js` - Clear rate limiting cache

### Migration Scripts
- `run-migrations.sh` - Run all database migrations in order
- `run-audit-migration.sh` - Run audit-specific migrations

## Usage

### Running Database Scripts
```bash
# From project root
node scripts/check-permissions.js
node scripts/check-user-role.js
node scripts/debug-login.js
node scripts/clear-rate-limits.js
```

### Running Migrations
```bash
# Run all migrations
./scripts/run-migrations.sh

# Run audit migration only
./scripts/run-audit-migration.sh
```

## Environment Variables

Make sure to set the following environment variables:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: asset_allocation)
- `DB_USER` - Database user (default: postgres)
- `REDIS_URL` - Redis URL for rate limiting (default: redis://localhost:6379) 