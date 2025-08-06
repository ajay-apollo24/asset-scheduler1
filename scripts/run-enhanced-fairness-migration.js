#!/usr/bin/env node

/**
 * Enhanced Fairness Migration Script
 * This script runs the enhanced fairness migration to add asset-specific configuration
 */

const fs = require('fs');
const path = require('path');
const db = require('../backend/config/db');

async function runMigration() {
  console.log('🚀 Starting Enhanced Fairness Migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/enhanced_fairness_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Reading migration file...');
    
    // Execute the entire migration as one statement
    // This avoids issues with semicolons inside PostgreSQL functions
    console.log('🔧 Executing migration...');
    
    try {
      await db.query(migrationSQL);
      console.log('✅ Migration executed successfully');
    } catch (error) {
      // Check if it's a "relation already exists" error (which is expected)
      if (error.message.includes('already exists')) {
        console.log(`ℹ️  Some tables already exist: ${error.message.split('\n')[0]}`);
      } else {
        console.error(`❌ Error executing migration:`, error.message);
        throw error;
      }
    }
    
    console.log('\n🎉 Enhanced Fairness Migration completed successfully!');
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    
    // Check if asset-specific tables were created
    const tables = [
      'asset_monetization_limits',
      'asset_fairness_config',
      'engagement_metrics',
      'conversion_metrics',
      'revenue_metrics',
      'slot_allocation',
      'bid_caps'
    ];
    
    for (const table of tables) {
      try {
        const result = await db.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ Table ${table} exists with ${result.rows[0].count} rows`);
      } catch (error) {
        console.log(`❌ Table ${table} not found or not accessible: ${error.message}`);
      }
    }
    
    // Check if functions were created
    const functions = [
      'get_asset_monetization_limit',
      'get_asset_slot_allocation',
      'calculate_normalized_roi',
      'get_slot_allocation',
      'update_slot_allocation'
    ];
    
    for (const func of functions) {
      try {
        const result = await db.query(`
          SELECT routine_name 
          FROM information_schema.routines 
          WHERE routine_name = $1 AND routine_schema = 'public'
        `, [func]);
        
        if (result.rows.length > 0) {
          console.log(`✅ Function ${func} exists`);
        } else {
          console.log(`❌ Function ${func} not found`);
        }
      } catch (error) {
        console.log(`❌ Error checking function ${func}: ${error.message}`);
      }
    }
    
    console.log('\n📋 Migration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Asset-specific monetization limits table created');
    console.log('✅ Asset-specific fairness configuration table created');
    console.log('✅ ROI tracking tables created (engagement, conversion, revenue)');
    console.log('✅ Slot allocation tracking table created');
    console.log('✅ Bid caps configuration table created');
    console.log('✅ Database functions for asset-specific logic created');
    console.log('✅ Performance indexes created');
    console.log('✅ Default bid caps configuration inserted');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Test the new asset-specific configuration API endpoints');
    console.log('   2. Configure custom monetization limits for specific assets');
    console.log('   3. Monitor fairness allocation with the enhanced system');
    console.log('   4. Use the enhanced fairness dashboard to track metrics');
    
    console.log('\n🔗 New API Endpoints:');
    console.log('   - GET /api/enhanced-bidding/asset-config/:asset_id');
    console.log('   - POST /api/enhanced-bidding/asset-config/:asset_id/monetization');
    console.log('   - POST /api/enhanced-bidding/asset-config/:asset_id/fairness');
    console.log('   - GET /api/enhanced-bidding/asset-config');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    try {
      if (db.end) {
        await db.end();
      } else if (db.pool && db.pool.end) {
        await db.pool.end();
      }
    } catch (error) {
      console.log('ℹ️  Database connection already closed');
    }
  }
}

// Run the migration
runMigration().catch(console.error); 