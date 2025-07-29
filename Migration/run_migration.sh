#!/bin/bash

echo "Running asset level migration..."

# You can run this manually with your database client
# For example, if using psql:
# psql -d asset_scheduler -f asset_level_migration.sql

echo "Migration SQL commands:"
echo "======================="
cat asset_level_migration.sql

echo ""
echo "Please run the above SQL commands in your database client."
echo "Or if you have psql installed, run:"
echo "psql -d asset_scheduler -f asset_level_migration.sql" 