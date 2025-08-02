const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create test app
const app = express();

// Basic middleware for testing
app.use(cors());
app.use(bodyParser.json());

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  if (authHeader === 'Bearer invalid-token') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  if (authHeader === 'Bearer unauthorized-token') {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  
  // Mock user for valid tokens
  req.user = { user_id: 1, role: 'admin' };
  next();
};

// Mock authorization middleware
const mockAuthorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (roles && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Apply authentication to analytics routes
app.use('/api/ads/analytics', mockAuth);

// Mock routes for testing
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Mock analytics routes with proper error handling
app.get('/api/ads/analytics/realtime', mockAuthorize(['admin', 'analyst']), (req, res) => {
  // Check for error simulation
  if (req.query.error === 'true') {
    return res.status(500).json({ message: 'Failed to fetch real-time analytics' });
  }
  
  res.status(200).json({
    impressions_per_minute: 250,
    revenue_per_hour: 45.5,
    fill_rate: 0.92,
    avg_response_time: 45.5,
    active_campaigns: 15,
    total_assets: 25,
    timestamp: '2024-01-01T12:00:00.000Z',
    last_updated: new Date().toISOString()
  });
});

app.get('/api/ads/analytics/campaigns', mockAuthorize(['admin', 'analyst']), (req, res) => {
  // Check for error simulation
  if (req.query.error === 'true') {
    return res.status(500).json({ message: 'Failed to fetch campaign analytics' });
  }
  
  const response = {
    campaigns: [
      {
        id: 1,
        name: 'Test Campaign 1',
        budget: 1000.00,
        status: 'active',
        impressions: 5000,
        clicks: 250,
        revenue: 500.00,
        ctr: 0.05,
        cpc: 2.00
      }
    ],
    summary: {
      total_campaigns: 1,
      total_revenue: 500.00,
      avg_ctr: 0.05,
      total_impressions: 300000,
      total_clicks: 4500,
      total_budget: 3000.00
    },
    time_range: '24h',
    total_count: 2,
    calculated_at: new Date().toISOString()
  };
  
  res.status(200).json(response);
});

app.get('/api/ads/analytics/creatives', mockAuthorize(['admin', 'analyst']), (req, res) => {
  res.status(200).json({
    creatives: [
      {
        id: 1,
        name: 'Test Creative 1',
        type: 'image',
        impressions: 3000,
        clicks: 150,
        revenue: 300.00,
        ctr: 0.05
      }
    ],
    statistics: {
      total_creatives: 1,
      avg_ctr: 0.05
    },
    time_range: '7d',
    limit: 10,
    calculated_at: new Date().toISOString()
  });
});

app.get('/api/ads/analytics/assets/:id', mockAuthorize(['admin', 'analyst']), (req, res) => {
  res.status(200).json({
    asset_id: parseInt(req.params.id),
    creatives: [
      {
        id: 1,
        name: 'Test Creative',
        type: 'image',
        performance: {
          impressions: 5000,
          clicks: 250,
          revenue: 500.00
        }
      }
    ],
    time_range: '30d',
    calculated_at: new Date().toISOString()
  });
});

app.get('/api/ads/analytics/trends', mockAuthorize(['admin', 'analyst']), (req, res) => {
  const response = {
    trends: [
      {
        date: '2024-01-01',
        revenue: 100.00,
        impressions: 1000,
        clicks: 50
      }
    ],
    time_range: '30d',
    calculated_at: new Date().toISOString()
  };
  
  // Add additional metrics for 90d time range
  if (req.query.time_range === '90d') {
    response.additional_metrics = {
      avg_daily_revenue: 95.5,
      growth_rate: 0.15
    };
  }
  
  res.status(200).json(response);
});

app.get('/api/ads/analytics/geographic', mockAuthorize(['admin', 'analyst']), (req, res) => {
  res.status(200).json({
    regions: [
      {
        region: 'North America',
        revenue: 500.00,
        impressions: 5000,
        clicks: 250
      }
    ],
    geographic_performance: {
      top_region: 'North America',
      total_regions: 1
    },
    time_range: '30d',
    calculated_at: new Date().toISOString()
  });
});

app.get('/api/ads/analytics/summary', mockAuthorize(['admin', 'analyst']), (req, res) => {
  res.status(200).json({
    total_revenue: 1000.00,
    total_impressions: 10000,
    total_clicks: 500,
    avg_ctr: 0.05,
    active_campaigns: 5,
    real_time: {
      current_impressions: 150,
      current_revenue: 25.50
    },
    top_campaigns: [
      {
        id: 1,
        name: 'Top Campaign',
        revenue: 500.00
      }
    ],
    top_assets: [
      {
        id: 1,
        name: 'Top Asset',
        revenue: 300.00
      }
    ],
    time_range: '24h',
    calculated_at: new Date().toISOString()
  });
});

// Mock creative routes
app.post('/api/creatives', (req, res) => {
  res.status(201).json({
    id: 1,
    name: req.body.name || 'Test Creative',
    type: req.body.type || 'image',
    status: 'draft'
  });
});

app.get('/api/creatives', (req, res) => {
  res.status(200).json({
    creatives: [
      {
        id: 1,
        name: 'Test Creative',
        type: 'image',
        status: 'approved'
      }
    ]
  });
});

app.get('/api/creatives/:id', (req, res) => {
  res.status(200).json({
    id: parseInt(req.params.id),
    name: 'Test Creative',
    type: 'image',
    status: 'approved'
  });
});

app.put('/api/creatives/:id', (req, res) => {
  res.status(200).json({
    id: parseInt(req.params.id),
    name: req.body.name || 'Updated Creative',
    type: req.body.type || 'image',
    status: req.body.status || 'approved'
  });
});

app.get('/api/creatives/:id/performance', (req, res) => {
  res.status(200).json({
    creative_id: parseInt(req.params.id),
    performance: {
      impressions: 5000,
      clicks: 250,
      revenue: 500.00,
      ctr: 0.05
    },
    time_range: '24h',
    calculated_at: new Date().toISOString()
  });
});

// Add the address method that supertest expects
app.address = () => ({ port: 5000 });

// Mock impression and click tracking endpoints for load testing
app.get('/api/ads/impression', (req, res) => {
  const { ad_id, creative_id } = req.query;
  
  if (!ad_id || !creative_id) {
    return res.status(400).json({ message: 'ad_id and creative_id are required' });
  }
  
  // Return 1x1 pixel for impression tracking
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
});

app.post('/api/ads/impression', (req, res) => {
  const { ad_id, creative_id } = req.query;
  
  if (!ad_id || !creative_id) {
    return res.status(400).json({ message: 'ad_id and creative_id are required' });
  }
  
  // Return 1x1 pixel for impression tracking
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
});

app.get('/api/ads/click', (req, res) => {
  const { ad_id, creative_id } = req.query;
  
  if (!ad_id || !creative_id) {
    return res.status(400).json({ message: 'ad_id and creative_id are required' });
  }
  
  // For load testing, redirect to a test URL
  res.redirect('https://example.com/test-click');
});

app.post('/api/ads/click', (req, res) => {
  const { ad_id, creative_id } = req.query;
  
  if (!ad_id || !creative_id) {
    return res.status(400).json({ message: 'ad_id and creative_id are required' });
  }
  
  // For load testing, redirect to a test URL
  res.redirect('https://example.com/test-click');
});

// Mock ad request endpoint for load testing
app.post('/api/ads/request', (req, res) => {
  const { asset_id, campaign_id, user_context, page_context } = req.body;
  
  if (!asset_id) {
    return res.status(400).json({ message: 'asset_id is required' });
  }
  
  // Generate a mock ad response
  const adResponse = {
    ad_id: Math.floor(Math.random() * 1000000),
    creative: {
      id: Math.floor(Math.random() * 1000),
      type: 'image',
      content: {
        cdn_url: 'https://example.com/test-ad.jpg',
        click_url: 'https://example.com/test-click',
        destination_url: 'https://example.com/test-click'
      },
      dimensions: {
        width: 728,
        height: 90
      }
    },
    tracking: {
      impression_url: `${req.protocol}://${req.get('host')}/api/ads/impression?ad_id=${Math.floor(Math.random() * 1000000)}&creative_id=${Math.floor(Math.random() * 1000)}`,
      click_url: `${req.protocol}://${req.get('host')}/api/ads/click?ad_id=${Math.floor(Math.random() * 1000000)}&creative_id=${Math.floor(Math.random() * 1000)}`,
      viewability_url: `${req.protocol}://${req.get('host')}/api/ads/viewability?ad_id=${Math.floor(Math.random() * 1000000)}&creative_id=${Math.floor(Math.random() * 1000)}`
    },
    bid: {
      amount: Math.random() * 10,
      currency: 'USD'
    },
    metadata: {
      campaign_id: campaign_id || 1,
      asset_id: asset_id,
      expires_at: new Date(Date.now() + 3600000).toISOString()
    }
  };
  
  res.status(200).json(adResponse);
});

module.exports = app; 