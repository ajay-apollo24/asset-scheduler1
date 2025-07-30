# 🏗️ Modular Architecture Documentation

## Overview

The Asset Scheduler backend has been refactored into a modular architecture to separate concerns and improve maintainability. The system now consists of three main modules:

1. **Asset Booking Module** - Core asset scheduling and booking functionality
2. **Ad Server Module** - Ad serving and creative management
3. **Shared Module** - Common functionality used across all modules

## 📁 Directory Structure

```
backend/
├── modules/
│   ├── asset-booking/           # Asset booking functionality
│   │   ├── controllers/
│   │   │   ├── assetController.js
│   │   │   ├── bookingController.js
│   │   │   ├── approvalController.js
│   │   │   └── biddingController.js
│   │   ├── models/
│   │   │   ├── Asset.js
│   │   │   ├── Booking.js
│   │   │   ├── Approval.js
│   │   │   └── Bid.js
│   │   ├── routes/
│   │   │   ├── assetRoutes.js
│   │   │   ├── bookingRoutes.js
│   │   │   ├── approvalRoutes.js
│   │   │   └── biddingRoutes.js
│   │   ├── utils/
│   │   │   ├── ruleEngine.js
│   │   │   └── fairAllocation.js
│   │   └── index.js
│   │
│   ├── ad-server/               # Ad server functionality
│   │   ├── controllers/
│   │   │   ├── adController.js
│   │   │   ├── creativeController.js
│   │   │   └── rtbController.js
│   │   ├── models/
│   │   │   ├── Creative.js
│   │   │   ├── Campaign.js
│   │   │   ├── AdRequest.js
│   │   │   ├── Impression.js
│   │   │   └── Auction.js
│   │   ├── routes/
│   │   │   ├── adRoutes.js
│   │   │   ├── creativeRoutes.js
│   │   │   └── rtbRoutes.js
│   │   ├── utils/
│   │   │   ├── adServer.js
│   │   │   ├── analytics.js
│   │   │   └── mlEngine.js
│   │   └── index.js
│   │
│   └── shared/                  # Shared functionality
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── userController.js
│       │   ├── auditController.js
│       │   ├── logController.js
│       │   └── reportController.js
│       ├── models/
│       │   ├── User.js
│       │   ├── AuditLog.js
│       │   └── AssetMetric.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── userRoutes.js
│       │   ├── auditRoutes.js
│       │   ├── logRoutes.js
│       │   └── reportRoutes.js
│       ├── middleware/
│       │   ├── auth.js
│       │   ├── authorize.js
│       │   ├── errorHandler.js
│       │   ├── rateLimit.js
│       │   └── fallback.js
│       ├── utils/
│       │   ├── logger.js
│       │   ├── cache.js
│       │   ├── validators.js
│       │   └── logViewer.js
│       └── index.js
│
├── config/
├── tests/
└── server.js
```

## 🎯 Module Responsibilities

### Asset Booking Module
**Purpose**: Handles core asset scheduling, booking, and approval workflows

**Key Features**:
- Asset management (CRUD operations)
- Booking creation and management
- Approval workflow management
- Bidding system for LOB competition
- Fair allocation algorithms
- Rule engine for booking validation

**API Endpoints**:
- `/api/assets` - Asset management
- `/api/bookings` - Booking management
- `/api/approvals` - Approval workflow
- `/api/bidding` - Bidding system

**Models**:
- `Asset` - Asset inventory
- `Booking` - Asset bookings
- `Approval` - Approval workflow
- `Bid` - Bidding system

**Utils**:
- `ruleEngine` - Booking validation rules
- `fairAllocation` - Fair allocation algorithms

### Ad Server Module
**Purpose**: Handles ad serving, creative management, and analytics

**Key Features**:
- Ad creative management
- Real-time ad serving
- Impression and click tracking
- Campaign management
- Analytics and reporting
- RTB (Real-Time Bidding) system

**API Endpoints**:
- `/api/ads` - Ad serving
- `/api/creatives` - Creative management
- `/api/ads/rtb` - RTB system

**Models**:
- `Creative` - Ad creatives
- `Campaign` - Advertising campaigns
- `AdRequest` - Ad serving requests
- `Impression` - Ad impressions
- `Auction` - RTB auctions

**Utils**:
- `adServer` - Core ad serving logic
- `analytics` - Analytics and reporting
- `mlEngine` - Machine learning integration

### Shared Module
**Purpose**: Common functionality used across all modules

**Key Features**:
- Authentication and authorization
- User management
- Audit logging
- Logging and monitoring
- Error handling
- Rate limiting
- Caching

**API Endpoints**:
- `/api/auth` - Authentication
- `/api/users` - User management
- `/api/audit` - Audit logs
- `/api/logs` - System logs
- `/api/reports` - Reports

**Models**:
- `User` - User accounts
- `AuditLog` - Audit trail
- `AssetMetric` - Asset metrics

**Middleware**:
- `auth` - JWT authentication
- `authorize` - Role-based authorization
- `errorHandler` - Error handling
- `rateLimit` - Rate limiting
- `fallback` - Fallback mechanisms

**Utils**:
- `logger` - Logging system
- `cache` - Caching utilities
- `validators` - Input validation
- `logViewer` - Log viewing utilities

## 🔧 Module Integration

### Importing Modules
```javascript
// Import entire modules
const shared = require('./modules/shared');
const assetBooking = require('./modules/asset-booking');
const adServer = require('./modules/ad-server');

// Import specific components
const { AssetController, BookingController } = require('./modules/asset-booking');
const { AdController, CreativeController } = require('./modules/ad-server');
const { logger, auth } = require('./modules/shared');
```

### Cross-Module Dependencies
Modules can depend on shared functionality but should avoid direct dependencies on other business modules:

```javascript
// ✅ Good - Using shared module
const logger = require('../../shared/utils/logger');
const auth = require('../../shared/middleware/auth');

// ❌ Bad - Direct dependency on another business module
const AssetController = require('../../asset-booking/controllers/assetController');
```

## 🚀 Benefits of Modular Architecture

### 1. **Separation of Concerns**
- Clear boundaries between different functionalities
- Easier to understand and maintain
- Reduced coupling between features

### 2. **Scalability**
- Modules can be developed independently
- Easy to add new modules
- Teams can work on different modules simultaneously

### 3. **Maintainability**
- Changes in one module don't affect others
- Easier to locate and fix issues
- Better code organization

### 4. **Testability**
- Modules can be tested in isolation
- Easier to mock dependencies
- Better test coverage

### 5. **Reusability**
- Shared functionality is centralized
- Modules can be reused in other projects
- Consistent patterns across modules

## 📋 Development Guidelines

### 1. **Module Boundaries**
- Keep modules focused on their core responsibility
- Avoid creating dependencies between business modules
- Use the shared module for common functionality

### 2. **Import Paths**
- Use relative paths for imports within the same module
- Use absolute paths for shared module imports
- Keep import paths consistent

### 3. **API Design**
- Each module should have its own API namespace
- Use consistent naming conventions
- Document module APIs clearly

### 4. **Error Handling**
- Use shared error handling middleware
- Log errors appropriately
- Provide meaningful error messages

### 5. **Testing**
- Test each module independently
- Mock shared dependencies
- Maintain good test coverage

## 🔄 Migration from Monolithic Structure

The refactor involved:

1. **File Organization**: Moving files to appropriate modules
2. **Import Updates**: Updating import paths to use new structure
3. **Server Configuration**: Updating server.js to use modular imports
4. **Index Files**: Creating index.js files for each module

### Migration Scripts
- `update-imports.js` - Updates import paths in moved files
- Automated file movement and organization

## 📊 Module Statistics

| Module | Controllers | Models | Routes | Utils | Total Files |
|--------|-------------|--------|--------|-------|-------------|
| Asset Booking | 4 | 4 | 4 | 2 | 14 |
| Ad Server | 3 | 5 | 3 | 3 | 14 |
| Shared | 5 | 3 | 5 | 4 | 17 |
| **Total** | **12** | **12** | **12** | **9** | **45** |

## 🎯 Next Steps

### 1. **Module-Specific Documentation**
- Create detailed API documentation for each module
- Document module-specific configuration
- Add usage examples

### 2. **Testing Strategy**
- Implement module-specific test suites
- Add integration tests between modules
- Set up CI/CD for modular testing

### 3. **Performance Optimization**
- Implement module-specific caching
- Optimize database queries per module
- Add performance monitoring

### 4. **Deployment Strategy**
- Consider microservices architecture
- Implement module-specific deployment
- Add health checks per module

This modular architecture provides a solid foundation for scaling the Asset Scheduler system while maintaining code quality and developer productivity. 