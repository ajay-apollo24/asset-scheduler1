# Seed Script Cleanup and Unification

## 🎯 **Problem Solved**

The `backend/scripts/seeds/` directory had **6 obsolete seed scripts** that were:
- ❌ **Outdated** - Didn't match current database schema
- ❌ **Incomplete** - Missing enhanced fairness tables and ROI metrics
- ❌ **Confusing** - Multiple scripts with overlapping functionality
- ❌ **Error-prone** - Referenced deprecated fields and tables

## ✅ **Solution Implemented**

### **Before (Obsolete Scripts)**
```
backend/scripts/seeds/
├── seed.js                    # ❌ Old asset-only seeding
├── seedCampaigns.js           # ❌ Old campaign structure
├── seedSaaSCampaigns.js       # ❌ Old SaaS campaign structure
├── seedSaaSUsers.js           # ❌ Old user structure
├── seedTestCampaigns.js       # ❌ Old test data
└── seedSampleUser.js          # ❌ Old user seeding
```

### **After (Unified Solution)**
```
backend/scripts/seeds/
├── README.md                  # 📖 Updated documentation
├── unifiedSeedScript.js       # ✅ NEW: Complete unified seeding
├── seed.js                    # ❌ OBSOLETE (kept for reference)
├── seedCampaigns.js           # ❌ OBSOLETE (kept for reference)
├── seedSaaSCampaigns.js       # ❌ OBSOLETE (kept for reference)
├── seedSaaSUsers.js           # ❌ OBSOLETE (kept for reference)
├── seedTestCampaigns.js       # ❌ OBSOLETE (kept for reference)
└── seedSampleUser.js          # ❌ OBSOLETE (kept for reference)
```

## 🚀 **New Unified Seed Script**

### **`unifiedSeedScript.js` - Complete Database Seeding**

#### **Features:**
- ✅ **Comprehensive** - Seeds all 30+ database tables
- ✅ **Current Schema** - Matches latest database structure
- ✅ **Enhanced Features** - Includes fairness system and ROI metrics
- ✅ **Proper Relationships** - Handles foreign key dependencies correctly
- ✅ **Well Documented** - Clear comments and structure

#### **What It Seeds:**
```javascript
// Complete seeding in dependency order
await this.seedOrganizations();    // 4 organizations (Apollo, TechCorp, etc.)
await this.seedUsers();            // 10 users with proper roles
await this.seedAssets();           // 7 assets (primary/secondary/tertiary)
await this.seedCampaigns();        // 6 campaigns (internal/external)
await this.seedCreatives();        // 3 creatives with content
await this.seedBids();             // 3 bids for internal campaigns
await this.seedEnhancedFairnessData(); // Slot allocation & fairness scores
await this.seedROIMetrics();       // ROI tracking (engagement, conversion, revenue)
```

## 📊 **Database Schema Coverage**

### **Tables Seeded by Unified Script:**

#### **Core Tables**
- ✅ `organizations` - Multi-tenant SaaS structure
- ✅ `users` - Platform and organization users
- ✅ `assets` - Primary, secondary, tertiary assets
- ✅ `campaigns` - Internal bookings and external campaigns
- ✅ `creatives` - Ad creatives with content
- ✅ `bids` - Bidding data for auctions

#### **Enhanced Fairness System**
- ✅ `slot_allocation` - Internal/external/monetization splits
- ✅ `fairness_scores` - Calculated fairness for internal campaigns
- ✅ `asset_monetization_limits` - Asset-specific monetization caps
- ✅ `asset_fairness_config` - Asset-specific fairness settings

#### **ROI Tracking System**
- ✅ `engagement_metrics` - User interactions and engagement
- ✅ `conversion_metrics` - Booking conversions and rates
- ✅ `revenue_metrics` - Daily revenue and ROI ratios
- ✅ `performance_metrics` - Creative performance data

#### **RBAC System**
- ✅ `permissions` - System permissions
- ✅ `roles` - User roles
- ✅ `role_permissions` - Role-permission mappings
- ✅ `user_roles` - User-role assignments

## 🔧 **Usage**

### **For New Contributors**
```bash
# Run the unified seed script (recommended)
node backend/scripts/seeds/unifiedSeedScript.js
```

### **What You Get:**
- 🏢 **4 Organizations** - Apollo Healthcare, TechCorp, HealthFirst, EduTech
- 👥 **10 Users** - Platform admins and organization users
- 🏗️ **7 Assets** - Primary, secondary, tertiary with proper levels
- 📢 **6 Campaigns** - Internal (Apollo) and external (SaaS customers)
- 🎨 **3 Creatives** - Ad creatives with proper content
- 💰 **3 Bids** - Bidding data for internal campaigns
- ⚖️ **Enhanced Fairness** - Slot allocation and fairness scores
- 📊 **ROI Metrics** - 30 days of engagement, conversion, revenue data

## 📋 **Sample Data Overview**

### **Organizations by Plan Type**
- **Apollo Healthcare** (Enterprise) - Internal healthcare campaigns
- **TechCorp Solutions** (Pro) - External tech campaigns  
- **HealthFirst Medical** (Pro) - External healthcare campaigns
- **EduTech Academy** (Basic) - External education campaigns

### **Assets by Level**
- **Primary Assets** (20% monetization cap)
  - Homepage Hero Banner (100k impressions/day, ₹5000 value)
  - App Launch Bottom Sheet (80k impressions/day, ₹4000 value)

- **Secondary Assets** (15% monetization cap)
  - Order Confirmation Banner (40k impressions/day, ₹2000 value)
  - Cart Promo Strip (30k impressions/day, ₹1500 value)
  - Sidebar Ad Space (25k impressions/day, ₹1200 value)

- **Tertiary Assets** (10% monetization cap)
  - Footer Newsletter Signup (15k impressions/day, ₹800 value)
  - Email Template Header (10k impressions/day, ₹600 value)

### **Campaign Types**
- **Internal Campaigns** (Apollo Healthcare)
  - Apollo Q4 Brand Awareness (₹10L budget)
  - Apollo Pharmacy Promotion (₹5L budget)
  - Apollo Diagnostics Campaign (₹3L budget)

- **External Campaigns** (SaaS Customers)
  - TechCorp Q4 Product Launch (₹25L budget)
  - HealthFirst Telemedicine (₹5L budget)
  - EduTech Spring Admissions (₹1.5L budget)

## 🎉 **Benefits**

### **For New Contributors**
- ✅ **Single Script** - No confusion about which script to run
- ✅ **Complete Data** - All features work with sample data
- ✅ **Current Schema** - No errors from outdated references
- ✅ **Well Documented** - Clear understanding of what's seeded

### **For Development**
- ✅ **Comprehensive Testing** - All features have sample data
- ✅ **Enhanced Features** - Fairness system and ROI tracking work
- ✅ **Proper Relationships** - Foreign keys and constraints work
- ✅ **Realistic Data** - Representative of production scenarios

### **For Maintenance**
- ✅ **Single Source** - One script to maintain
- ✅ **Clear Structure** - Easy to modify and extend
- ✅ **Dependency Management** - Proper seeding order
- ✅ **Error Handling** - Graceful handling of issues

## 🔍 **Migration from Old Scripts**

### **If You Were Using Old Scripts:**

1. **Stop using old scripts** - They're obsolete and may cause errors
2. **Use unified script** - `node backend/scripts/seeds/unifiedSeedScript.js`
3. **Update documentation** - Reference the unified script
4. **Test thoroughly** - Ensure all features work with new data

### **Why Old Scripts Are Obsolete:**

#### **Schema Mismatches**
- ❌ Old scripts reference `advertisers` table (doesn't exist)
- ❌ Old scripts use `bookings` table (now unified with `campaigns`)
- ❌ Old scripts missing enhanced fairness tables
- ❌ Old scripts missing ROI tracking tables

#### **Missing Features**
- ❌ No enhanced fairness system data
- ❌ No ROI metrics (engagement, conversion, revenue)
- ❌ No asset-specific monetization limits
- ❌ No proper RBAC system data

#### **Incomplete Data**
- ❌ Missing relationships between tables
- ❌ Missing foreign key data
- ❌ Missing required fields
- ❌ Inconsistent data structure

## 📝 **Best Practices Going Forward**

### **Adding New Seed Data**
```javascript
// Add to the appropriate method in unifiedSeedScript.js
async seedNewFeature() {
  console.log('🆕 Seeding new feature...');
  
  const newData = [
    // Your new data here
  ];
  
  for (const item of newData) {
    await db.query(
      'INSERT INTO new_table (field1, field2) VALUES ($1, $2)',
      [item.field1, item.field2]
    );
  }
  
  console.log('   ✅ Created new feature data');
}
```

### **Modifying Existing Data**
```javascript
// Modify the arrays in the appropriate method
const organizations = [
  // Add your custom organizations here
  {
    name: 'Custom Corp',
    domain: 'custom.com',
    plan_type: 'pro',
    // ... other fields
  }
];
```

### **Environment-Specific Seeding**
```javascript
// Add environment checks if needed
if (process.env.NODE_ENV === 'development') {
  // Run full seeding
} else if (process.env.NODE_ENV === 'staging') {
  // Run minimal seeding
}
```

## 🎯 **Result**

The seed script cleanup provides:

- ✅ **Single, comprehensive seed script** that matches current schema
- ✅ **Complete sample data** for all features including enhanced fairness
- ✅ **Clear documentation** for new contributors
- ✅ **Proper relationships** and foreign key handling
- ✅ **Realistic data** for development and testing
- ✅ **Easy maintenance** with single source of truth

New contributors can now run one command and get a fully functional system with comprehensive sample data! 