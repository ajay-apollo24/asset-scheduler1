# Database Scripts

This directory contains database migration, setup, and maintenance scripts.

## 📁 Scripts Overview

### **RBAC (Role-Based Access Control) Scripts**

- `createRBACTables.js` - Creates RBAC tables (roles, permissions, user_roles, role_permissions)
- `assignRBACPermissions.js` - Assigns permissions to roles
- `migrateToRBAC.js` - Migrates from old role system to RBAC
- `cleanupAndRecreateRBAC.js` - Cleanup and recreate RBAC tables
- `fixRolePermissions.js` - Fix role permission mappings
- `updateRoleConstraints.js` - Update role constraints and validations

## 🚀 Usage

### **For New Contributors**

**⚠️ Warning: These scripts modify the database structure. Run with caution!**

1. **Development Setup**
   ```bash
   # Create RBAC tables
   node scripts/database/createRBACTables.js
   
   # Assign permissions
   node scripts/database/assignRBACPermissions.js
   
   # Migrate existing users
   node scripts/database/migrateToRBAC.js
   ```

2. **Production Migration**
   ```bash
   # Backup database first!
   # Then run migration
   node scripts/database/migrateToRBAC.js
   ```

### **Script Execution Order**

1. `createRBACTables.js` - Create tables first
2. `assignRBACPermissions.js` - Set up permissions
3. `migrateToRBAC.js` - Migrate existing data
4. `fixRolePermissions.js` - Fix any issues
5. `updateRoleConstraints.js` - Update constraints

## 🔧 Script Details

### **createRBACTables.js**
- Creates roles, permissions, user_roles, role_permissions tables
- Sets up proper foreign key constraints
- Adds indexes for performance

### **assignRBACPermissions.js**
- Defines system permissions (read, write, delete, etc.)
- Creates default roles (admin, user, manager, etc.)
- Assigns permissions to roles

### **migrateToRBAC.js**
- Migrates users from old role column to RBAC system
- Preserves existing role assignments
- Removes old role column after migration

### **cleanupAndRecreateRBAC.js**
- Drops existing RBAC tables
- Recreates them with proper structure
- **⚠️ Use only in development!**

## 📋 Best Practices

- **Always backup** before running migration scripts
- **Test in development** first
- **Run scripts in order** as specified above
- **Check for errors** and handle them appropriately
- **Document any custom changes** made to scripts

## 🔍 Troubleshooting

### **Common Issues**

1. **Foreign key constraint errors**
   - Check if referenced tables exist
   - Verify data integrity before migration

2. **Permission assignment failures**
   - Check if roles and permissions exist
   - Verify user permissions

3. **Migration rollback needed**
   - Use database backup to restore
   - Check migration logs for issues

### **Getting Help**

- Check the main project README
- Review database schema documentation
- Look at test files for examples
- Create an issue for database-related problems 