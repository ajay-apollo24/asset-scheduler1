# Configuration Files

This directory contains the core configuration files for the Asset Scheduler system.

## 📁 Essential Configuration Files

### **Database Configuration**
- `db.js` - Database connection configuration and pool setup

### **Business Rules Configuration**
- `ruleConfig.json` - Business rules for asset booking and allocation
  - Booking limits and restrictions
  - Asset type exclusivity rules
  - Level-specific rules (primary, secondary, tertiary assets)

### **Bidding Configuration**
- `biddingConfig.json` - Bidding system configuration
  - Global and user-specific bid limits
  - LOB-specific budget limits
  - Asset level bid multipliers
  - Fair bidding rules and cooldowns

### **Enhanced Fairness Configuration**
- `enhancedFairnessConfig.json` - Advanced fairness allocation system
  - Strategic weights for different LOBs
  - ROI metrics configuration for different campaign types
  - Slot allocation rules (internal vs external)
  - Bidding rules and restrictions
  - Fairness factors and time-based considerations

## 🔧 How to Use

### **For New Contributors**

1. **Start with `db.js`** - Understand the database connection
2. **Review `ruleConfig.json`** - Learn the business rules
3. **Check `biddingConfig.json`** - Understand bidding limits
4. **Explore `enhancedFairnessConfig.json`** - Learn about the fairness system

### **Modifying Configuration**

```javascript
// Example: Update bidding limits
const biddingConfig = require('./biddingConfig.json');
biddingConfig.biddingLimits.globalLimits.maxBidAmount = 2000000;
```

### **Environment-Specific Configuration**

Configuration files can be overridden based on environment:
- Development: Use default values
- Staging: Override with staging-specific values
- Production: Use production-optimized settings

## 📋 Related Scripts

### **Database Scripts** (`../scripts/database/`)
- RBAC migration and setup scripts
- Role permission management
- Database cleanup utilities

### **Seed Scripts** (`../scripts/seeds/`)
- Sample data generation
- Test campaign creation
- User and organization seeding

## 🚀 Quick Start

1. **Set up database connection** in `db.js`
2. **Configure business rules** in `ruleConfig.json`
3. **Set bidding limits** in `biddingConfig.json`
4. **Customize fairness rules** in `enhancedFairnessConfig.json`
5. **Run seed scripts** to populate sample data

## 📝 Best Practices

- **Never commit sensitive data** (passwords, API keys)
- **Use environment variables** for environment-specific values
- **Document changes** in configuration files
- **Test configuration changes** in development first
- **Version control** all configuration changes

## 🔍 Troubleshooting

### **Common Issues**

1. **Database connection fails**
   - Check `db.js` connection string
   - Verify database is running
   - Check network connectivity

2. **Bidding rules not working**
   - Verify `biddingConfig.json` syntax
   - Check LOB-specific limits
   - Review asset level multipliers

3. **Fairness allocation issues**
   - Review `enhancedFairnessConfig.json`
   - Check strategic weights
   - Verify slot allocation rules

### **Getting Help**

- Check the main project README
- Review the API documentation
- Look at test files for examples
- Ask in the team chat or create an issue 