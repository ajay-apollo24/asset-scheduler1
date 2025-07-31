#!/bin/bash

echo "Running all migrations..."
# For example, if using psql:
# psql -d asset_scheduler -f ../all_migrations.sql

echo "Migration SQL commands:"
echo "======================="
cat ../all_migrations.sql

echo ""
echo "Please run the above SQL commands in your database client."
echo "Or if you have psql installed, run:"
echo "psql -d asset_scheduler -f ../all_migrations.sql"
