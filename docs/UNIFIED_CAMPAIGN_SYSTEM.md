# Unified Campaign System

## Overview

The Unified Campaign System consolidates internal team bookings and external advertiser campaigns into a single, cohesive platform. This system provides a unified interface for managing all asset allocation while maintaining the distinct business rules and requirements for each campaign type.

## Architecture

### Database Schema

The system uses a unified `campaigns` table with the following key fields:

- `advertiser_type`: 'internal' or 'external'
- `lob`: Line of Business (for internal campaigns)
- `purpose`: Campaign purpose (for internal campaigns)
- `targeting_criteria`: JSON field for external campaign targeting
- `priority_weight`: Fairness weight for internal campaigns
- `bidding_strategy`: 'manual', 'rtb', or 'auto'

### Backend Components

1. **Unified Campaign Model** (`backend/modules/unified-campaign/models/UnifiedCampaign.js`)
   - Single model handling both campaign types
   - Type-specific validation and business logic
   - Unified analytics and reporting

2. **Unified Campaign Controller** (`backend/modules/unified-campaign/controllers/unifiedCampaignController.js`)
   - RESTful API endpoints for campaign management
   - Type-specific validation and processing
   - Integration with existing rule engine and bidding validation

3. **Unified Bidding Engine** (`backend/modules/unified-campaign/utils/unifiedBiddingEngine.js`)
   - Hybrid allocation algorithm (60% internal, 40% external)
   - Fairness scoring for internal campaigns
   - Performance scoring for external campaigns
   - Conflict resolution and optimization

### Frontend Components

1. **Unified Campaign API** (`frontend/src/api/unifiedCampaignApi.js`)
   - Centralized API client for all campaign operations
   - Type-specific endpoints for backward compatibility

2. **Unified Campaign Dashboard** (`frontend/src/components/UnifiedCampaign/UnifiedCampaignDashboard.js`)
   - Single interface for viewing all campaigns
   - Tabbed view for internal/external campaigns
   - Unified analytics and statistics

3. **Unified Campaign Form** (`frontend/src/components/UnifiedCampaign/UnifiedCampaignForm.js`)
   - Dynamic form adapting to campaign type
   - Type-specific validation and field requirements
   - Asset selection and availability checking

## API Endpoints

### Campaign Management

- `POST /api/campaigns` - Create internal/external campaign
- `GET /api/campaigns` - List campaigns (with type filtering)
- `GET /api/campaigns/:id` - Get specific campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Asset Management

- `GET /api/campaigns/availability/asset` - Check asset availability
- `POST /api/campaigns/allocate` - Allocate asset slots

### Bidding

- `POST /api/campaigns/bid` - Process unified bid

### Analytics

- `GET /api/campaigns/analytics/summary` - Get unified analytics

## Usage Examples

### Creating an Internal Campaign

```javascript
const internalCampaign = {
  advertiser_type: 'internal',
  title: 'Credit Card Q4 Campaign',
  asset_id: 1,
  budget: 50000,
  start_date: '2024-10-01',
  end_date: '2024-10-31',
  lob: 'Credit Card',
  purpose: 'Q4 promotional campaign',
  creative_url: 'https://example.com/creative.jpg',
  priority_weight: 1.2,
  bidding_strategy: 'manual'
};

await unifiedCampaignApi.createCampaign(internalCampaign);
```

### Creating an External Campaign

```javascript
const externalCampaign = {
  advertiser_type: 'external',
  name: 'Brand Awareness Campaign',
  budget: 100000,
  start_date: '2024-10-01',
  end_date: '2024-10-31',
  targeting_criteria: {
    geographic: { countries: ['US', 'CA'] },
    device: { type: 'mobile' }
  },
  goal_type: 'impressions',
  goal_value: 1000000,
  bidding_strategy: 'rtb'
};

await unifiedCampaignApi.createCampaign(externalCampaign);
```

### Processing a Bid

```javascript
const bidData = {
  campaign_id: 1,
  asset_id: 1,
  bid_amount: 5000,
  bid_type: 'manual',
  context: {
    user_context: {
      location: { country: 'US' },
      user_agent: 'Mozilla/5.0...'
    }
  }
};

const result = await unifiedCampaignApi.processBid(bidData);
```

### Asset Allocation

```javascript
const allocationData = {
  asset_id: 1,
  start_date: '2024-10-01',
  end_date: '2024-10-31'
};

const allocation = await unifiedCampaignApi.allocateAsset(allocationData);
```

## Business Rules

### Internal Campaigns

1. **Fairness Allocation**: Uses fairness scoring based on historical allocation
2. **Budget Limits**: Enforced per LOB and user
3. **Asset Requirements**: Must specify asset and purpose
4. **Priority Weighting**: Can set priority weights for fairness calculation

### External Campaigns

1. **Revenue Optimization**: Prioritized based on bid amount and performance
2. **Targeting**: Supports geographic, device, and behavioral targeting
3. **Performance Scoring**: Based on historical performance and targeting match
4. **RTB Support**: Real-time bidding capabilities

### Hybrid Allocation

1. **60/40 Split**: 60% of slots reserved for internal campaigns
2. **Fairness First**: Internal campaigns allocated by fairness score
3. **Revenue Second**: External campaigns allocated by revenue potential
4. **Conflict Resolution**: Automatic resolution of competing bids

## Migration Guide

### Database Migration

1. Run the migration script:
   ```bash
   ./scripts/run-unified-migration.sh
   ```

2. Verify migration:
   ```sql
   SELECT COUNT(*) FROM campaigns WHERE advertiser_type = 'internal';
   SELECT COUNT(*) FROM bookings_old WHERE is_deleted = FALSE;
   ```

### Frontend Migration

1. Update navigation to include "Unified Campaigns"
2. Replace old booking forms with unified campaign form
3. Update API calls to use unified endpoints
4. Test both internal and external campaign flows

## Benefits

1. **Single Source of Truth**: All campaigns in one system
2. **Unified Analytics**: Combined reporting and insights
3. **Optimized Allocation**: Balance fairness and revenue
4. **Simplified Management**: One interface for all campaigns
5. **Future-Proof**: Ready for internal teams as advertisers

## Monitoring

### Key Metrics

- Total campaigns by type
- Allocation efficiency (internal vs external)
- Revenue generation from external campaigns
- Fairness scores for internal campaigns
- Asset utilization rates

### Alerts

- Low fairness scores for internal campaigns
- High conflict rates
- Revenue targets not met
- Asset underutilization

## Troubleshooting

### Common Issues

1. **Migration Failures**: Check database connectivity and permissions
2. **API Errors**: Verify authentication and authorization
3. **Allocation Conflicts**: Review fairness and revenue weights
4. **Performance Issues**: Monitor database indexes and query performance

### Debug Commands

```sql
-- Check campaign distribution
SELECT advertiser_type, COUNT(*) FROM campaigns GROUP BY advertiser_type;

-- Check allocation conflicts
SELECT asset_id, COUNT(*) FROM campaigns 
WHERE status IN ('active', 'approved') 
GROUP BY asset_id HAVING COUNT(*) > 1;

-- Check fairness scores
SELECT lob, AVG(priority_weight) FROM campaigns 
WHERE advertiser_type = 'internal' 
GROUP BY lob;
``` 