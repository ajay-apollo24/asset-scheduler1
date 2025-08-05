#!/bin/bash

# Unified Campaign Migration Script
# This script runs the database migration to unify bookings and campaigns

set -e

echo "🚀 Starting Unified Campaign Migration..."

# Check if database connection is available
if ! psql -d asset_allocation -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Database connection failed. Please ensure PostgreSQL is running and asset_allocation database exists."
    exit 1
fi

echo "✅ Database connection verified"

# Backup existing bookings table
echo "📦 Creating backup of existing bookings table..."
psql -d asset_allocation -c "
CREATE TABLE IF NOT EXISTS bookings_backup AS 
SELECT * FROM bookings;
"

echo "✅ Backup created: bookings_backup"

# Rename existing bookings table
echo "🔄 Renaming existing bookings table..."
psql -d asset_allocation -c "
ALTER TABLE bookings RENAME TO bookings_old;
"

echo "✅ Original bookings table renamed to bookings_old"

# Run the unified migration
echo "🔧 Running unified campaign migration..."
psql -d asset_allocation -f migrations/unified_campaign_migration.sql

echo "✅ Migration completed successfully"

# Migrate existing bookings to campaigns
echo "🔄 Migrating existing bookings to campaigns..."
psql -d asset_allocation -c "SELECT migrate_bookings_to_campaigns();"

echo "✅ Existing bookings migrated to campaigns"

# Verify migration
echo "🔍 Verifying migration..."
BOOKING_COUNT=$(psql -d asset_allocation -t -c "SELECT COUNT(*) FROM bookings_old WHERE is_deleted = FALSE;")
CAMPAIGN_COUNT=$(psql -d asset_allocation -t -c "SELECT COUNT(*) FROM campaigns WHERE advertiser_type = 'internal';")

echo "📊 Migration Summary:"
echo "   - Original bookings: $BOOKING_COUNT"
echo "   - Migrated campaigns: $CAMPAIGN_COUNT"

if [ "$BOOKING_COUNT" -eq "$CAMPAIGN_COUNT" ]; then
    echo "✅ Migration verification successful - all bookings migrated"
else
    echo "⚠️  Warning: Booking count mismatch. Please review manually."
fi

echo ""
echo "🎉 Unified Campaign Migration Complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Test the new unified API endpoints"
echo "   2. Update frontend to use the new unified interface"
echo "   3. Monitor system performance"
echo "   4. Remove old booking endpoints after testing"
echo ""
echo "🔗 New API Endpoints:"
echo "   - POST /api/campaigns (create internal/external campaigns)"
echo "   - GET /api/campaigns (list campaigns by type)"
echo "   - POST /api/campaigns/bid (unified bidding)"
echo "   - POST /api/campaigns/allocate (asset allocation)"
echo "   - GET /api/campaigns/analytics/summary (unified analytics)" 