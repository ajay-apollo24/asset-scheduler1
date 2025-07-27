#!/bin/bash

echo "Running audit log enhancement migration..."
echo "Migration SQL commands:"
echo "======================="
cat ../audit_log_enhancement.sql
echo ""
echo "Please run the above SQL commands in your database client."
echo "Or if you have psql installed, run:"
echo "psql -d asset_scheduler -f ../audit_log_enhancement.sql" 