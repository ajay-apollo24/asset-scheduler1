# Unified Campaign System - Launch Guide

## 🚀 Quick Start

### 1. Verify Migration
The database migration should have completed successfully. You can verify by running:

```sql
-- Check campaign distribution
SELECT advertiser_type, COUNT(*) FROM campaigns GROUP BY advertiser_type;

-- Check that the bookings view works
SELECT COUNT(*) FROM bookings;
```

### 2. Start the Backend Server
```bash
cd backend
npm start
```

The server should start on `http://localhost:5000`

### 3. Start the Frontend Application
```bash
cd frontend
npm start
```

The application should open on `http://localhost:3000`

### 4. Access the Unified Interface
Navigate to: `http://localhost:3000/campaigns`

## 🧪 Testing the System

### Manual Testing Checklist

#### Backend API Tests
- [ ] `GET /api/campaigns` - List all campaigns
- [ ] `GET /api/campaigns?advertiser_type=internal` - List internal campaigns
- [ ] `GET /api/campaigns?advertiser_type=external` - List external campaigns
- [ ] `GET /api/campaigns/availability/asset` - Check asset availability
- [ ] `GET /api/campaigns/analytics/summary` - Get analytics

#### Frontend Tests
- [ ] Navigate to `/campaigns` - Unified dashboard loads
- [ ] Switch between "All", "Internal", "External" tabs
- [ ] Click "Create Campaign" - Form loads
- [ ] Test creating internal campaign
- [ ] Test creating external campaign
- [ ] Verify statistics display correctly

### Automated Testing
Run the test script (after getting a valid JWT token):
```bash
node scripts/test-unified-system.js
```

## 📊 What You Should See

### Unified Dashboard (`/campaigns`)
- **Stats Cards**: Total campaigns, active campaigns, total budget, revenue potential
- **Tabs**: All Campaigns, Internal, External
- **Table**: Shows campaigns with type badges, status, dates, budget
- **Actions**: Activate, Delete buttons

### Create Campaign Form (`/campaigns/create`)
- **Campaign Type Selection**: Radio buttons for Internal/External
- **Dynamic Form**: Fields change based on selected type
- **Internal Fields**: Asset, LOB, Purpose, Priority Weight
- **External Fields**: Targeting, Goals, Performance settings

## 🔧 Troubleshooting

### Common Issues

#### 1. "No campaigns found"
- Check if migration completed successfully
- Verify database connection
- Check if you're logged in with proper permissions

#### 2. "Authentication failed"
- Ensure you're logged in
- Check JWT token in browser dev tools
- Verify token hasn't expired

#### 3. "Asset not found"
- Check if assets exist in the database
- Verify asset IDs are correct

#### 4. "Permission denied"
- Check user roles and permissions
- Ensure user has `campaign:read` permission

### Database Verification Queries

```sql
-- Check if migration worked
SELECT COUNT(*) as total_campaigns FROM campaigns;
SELECT advertiser_type, COUNT(*) FROM campaigns GROUP BY advertiser_type;

-- Check backward compatibility
SELECT COUNT(*) as bookings_view_count FROM bookings;

-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('advertiser_type', 'lob', 'purpose', 'priority_weight');
```

## 🎯 Next Steps

### Immediate Actions
1. **Test the system** thoroughly
2. **Create sample campaigns** of both types
3. **Verify analytics** are working
4. **Test bidding functionality**

### Future Enhancements
1. **Performance Optimization**: Monitor query performance
2. **Advanced Analytics**: Add more detailed reporting
3. **Bidding Automation**: Implement auto-bidding strategies
4. **Integration**: Connect with external ad platforms

### Monitoring
- **Database Performance**: Monitor query execution times
- **API Response Times**: Check endpoint performance
- **User Adoption**: Track usage of unified interface
- **Error Rates**: Monitor for any issues

## 📞 Support

If you encounter issues:

1. **Check the logs**: Backend logs in `backend/logs/`
2. **Database queries**: Use the verification queries above
3. **API testing**: Use the test script or Postman
4. **Documentation**: Refer to `docs/UNIFIED_CAMPAIGN_SYSTEM.md`

## 🎉 Success Indicators

The system is working correctly if:

- ✅ You can see both internal and external campaigns in the unified dashboard
- ✅ The create form adapts to campaign type
- ✅ Analytics show data for both advertiser types
- ✅ Asset availability works correctly
- ✅ Backward compatibility is maintained (old booking endpoints still work)
- ✅ No errors in browser console or server logs

---

**Congratulations! 🎊 You now have a unified campaign system that balances internal fairness with external revenue optimization.** 