# Database Scripts Cleanup and Consolidation

## 🎯 **Problem Solved**

The `backend/scripts/database/` directory had **6 database scripts** that were:
- ❌ **Redundant** - RBAC setup duplicated in multiple scripts
- ❌ **Confusing** - Multiple ways to do the same thing
- ❌ **Outdated** - Some scripts referenced old database structures
- ❌ **Error-prone** - Could conflict with the unified seed script

## ✅ **Solution Implemented**

### **Before (Redundant Scripts)**
```
backend/scripts/database/
├── createRBACTables.js         # ❌ RBAC table creation
├── assignRBACPermissions.js    # ❌ RBAC permission assignment
├── migrateToRBAC.js            # ❌ RBAC migration (already done)
├── cleanupAndRecreateRBAC.js   # ❌ RBAC cleanup (no longer needed)
├── fixRolePermissions.js       # ❌ Role permission fixes (no longer needed)
└── updateRoleConstraints.js    # ❌ Role constraint updates (no longer needed)
```

### **After (Consolidated Solution)**
```
backend/scripts/database/
├── README.md                   # 📖 Updated documentation (marks scripts as obsolete)
├── createRBACTables.js         # ❌ OBSOLETE (kept for reference)
├── assignRBACPermissions.js    # ❌ OBSOLETE (kept for reference)
├── migrateToRBAC.js            # ❌ OBSOLETE (kept for reference)
├── cleanupAndRecreateRBAC.js   # ❌ OBSOLETE (kept for reference)
├── fixRolePermissions.js       # ❌ OBSOLETE (kept for reference)
└── updateRoleConstraints.js    # ❌ OBSOLETE (kept for reference)

backend/scripts/seeds/
└── unifiedSeedScript.js        # ✅ NEW: Includes RBAC setup
```

## 🚀 **New Unified Approach**

### **`unifiedSeedScript.js` - Complete Database Setup**

#### **Now Includes RBAC System:**
```javascript
// Complete seeding in dependency order
await this.seedOrganizations();    // 4 organizations
await this.seedUsers();            // 11 users with proper roles
await this.seedRBACSystem();       // 🔐 NEW: RBAC permissions, roles, mappings
await this.seedAssets();           // 7 assets
await this.seedCampaigns();        // 6 campaigns
await this.seedCreatives();        // 3 creatives
await this.seedBids();             // Temporarily skipped
await this.seedEnhancedFairnessData(); // Slot allocation & fairness
await this.seedROIMetrics();       // ROI tracking data
```

#### **RBAC System Created:**
- **28 Permissions** - Campaign, creative, user, role, analytics, organization, billing
- **10 Roles** - Platform admin, support, sales, org admin, marketing manager, etc.
- **Role-Permission Mappings** - Proper access control for each role
- **User-Role Assignments** - Users assigned to appropriate roles

## 📊 **Database Schema Coverage**

### **Tables Now Handled by Unified Script:**

#### **Core Tables**
- ✅ `organizations` - Multi-tenant SaaS structure
- ✅ `users` - Platform and organization users
- ✅ `assets` - Primary, secondary, tertiary assets
- ✅ `campaigns` - Internal bookings and external campaigns
- ✅ `creatives` - Ad creatives with content

#### **RBAC System** (NEW)
- ✅ `permissions` - System permissions (28 total)
- ✅ `roles` - User roles (10 total)
- ✅ `role_permissions` - Role-permission mappings
- ✅ `user_roles` - User-role assignments

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

## 🔧 **Usage**

### **For New Contributors**
```bash
# Run the unified seed script (includes RBAC)
node backend/scripts/seeds/unifiedSeedScript.js
```

### **What You Get:**
- 🏢 **4 Organizations** - Apollo Healthcare, TechCorp, HealthFirst, EduTech
- 👥 **11 Users** - Platform admins and organization users
- 🔐 **RBAC System** - 28 permissions, 10 roles, user-role mappings
- 🏗️ **7 Assets** - Primary, secondary, tertiary with proper levels
- 📢 **6 Campaigns** - Internal (Apollo) and external (SaaS customers)
- 🎨 **3 Creatives** - Ad creatives with proper content
- ⚖️ **Enhanced Fairness** - Slot allocation and fairness scores
- 📊 **ROI Metrics** - 30 days of engagement, conversion, revenue data

## 📋 **RBAC Roles Created**

### **Platform Roles (System-wide)**
- **Platform Admin** - Full system access (all permissions)
- **Support** - Customer support access (read-only for help)
- **Sales** - Sales team access (customer data and analytics)

### **Organization Roles (Per organization)**
- **Organization Admin** - Full access within organization
- **Marketing Manager** - Campaign and team management
- **Campaign Manager** - Campaign operations
- **Creative Manager** - Creative asset management
- **Analyst** - Analytics and reporting
- **Data Analyst** - Advanced analytics
- **Digital Manager** - Digital campaign management

## 🎉 **Benefits**

### **For New Contributors**
- ✅ **Single Script** - No confusion about which script to run
- ✅ **Complete Setup** - RBAC + all other data in one command
- ✅ **Current Schema** - No errors from outdated references
- ✅ **Well Documented** - Clear understanding of what's created

### **For Development**
- ✅ **Comprehensive Testing** - All features have sample data
- ✅ **RBAC System** - Proper permissions and roles for testing
- ✅ **Enhanced Features** - Fairness system and ROI tracking work
- ✅ **Proper Relationships** - Foreign keys and constraints work

### **For Maintenance**
- ✅ **Single Source** - One script to maintain
- ✅ **Clear Structure** - Easy to modify and extend
- ✅ **Dependency Management** - Proper seeding order
- ✅ **Error Handling** - Graceful handling of issues

## 🔍 **Migration from Old Scripts**

### **If You Were Using Database Scripts:**

1. **Stop using database scripts** - They're obsolete
2. **Use unified seed script** - `node backend/scripts/seeds/unifiedSeedScript.js`
3. **Update documentation** - Reference the unified script
4. **Test thoroughly** - Ensure RBAC works with new setup

### **Why Old Scripts Are Obsolete:**

#### **Redundancy**
- ❌ **Multiple scripts** doing the same thing
- ❌ **Conflicting approaches** to RBAC setup
- ❌ **Inconsistent data** between different scripts

#### **Outdated References**
- ❌ Some scripts reference old table structures
- ❌ Missing enhanced fairness system
- ❌ Missing ROI tracking system

#### **Maintenance Issues**
- ❌ **Multiple scripts** to maintain
- ❌ **Confusing for new contributors**
- ❌ **Error-prone** when run in wrong order

## 📝 **Best Practices Going Forward**

### **Adding New RBAC Features**
```javascript
// Add to seedRBACSystem() method in unifiedSeedScript.js
const newPermissions = [
  { name: 'new:feature', description: 'New feature access', resource: 'new', action: 'feature' }
];

const newRoles = [
  { name: 'new_role', description: 'New role', organization_id: null, is_system_role: true }
];

// Add to rolePermissionMappings
'new_role': ['new:feature', 'campaign:read']
```

### **Modifying Existing RBAC**
```javascript
// Modify the arrays in seedRBACSystem() method
const permissions = [
  // Add your new permissions here
];

const roles = [
  // Add your new roles here
];

const rolePermissionMappings = {
  // Modify role-permission mappings here
};
```

### **Environment-Specific RBAC**
```javascript
// Add environment checks if needed
if (process.env.NODE_ENV === 'development') {
  // Run full RBAC setup
} else if (process.env.NODE_ENV === 'staging') {
  // Run minimal RBAC setup
}
```

## 🎯 **Result**

The database scripts cleanup provides:

- ✅ **Single, comprehensive script** that includes RBAC setup
- ✅ **Complete RBAC system** with permissions, roles, and mappings
- ✅ **Clear documentation** for new contributors
- ✅ **Proper relationships** and foreign key handling
- ✅ **Realistic data** for development and testing
- ✅ **Easy maintenance** with single source of truth

**New contributors can now run one command and get a fully functional system with complete RBAC setup!** 🚀

The database scripts are now obsolete and should not be used. Everything is consolidated into the unified seed script for simplicity and consistency. 