# Migrations Directory

This directory contains all database migrations for the asset scheduler system.

## Migration Files

- `all_migrations.sql` - Complete database schema
- `ad_server_migration.sql` - Ad server tables
- `bidding_system_migration.sql` - Bidding system tables
- `audit_log_enhancement.sql` - Audit logging enhancements
- `asset_level_migration.sql` - Asset level management
- `seed_setup.sql` - Initial data seeding

## Running Migrations

```bash
# Run all migrations
./scripts/run-migrations.sh

# Run audit migration only
./scripts/run-audit-migration.sh
```

## Manual Execution

1. Ensure PostgreSQL is running
2. Create database if it doesn't exist: `createdb asset_allocation`
3. Run migrations in order
4. Verify tables are created: `\dt` in psql

## Environment Variables

Set the following environment variables for database connection:

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: asset_allocation)
- `DB_USER` - Database user (default: postgres) 