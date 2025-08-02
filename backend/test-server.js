const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create test app
const app = express();

// Basic middleware for testing
app.use(cors());
app.use(bodyParser.json());

// Mock routes for testing
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Mock analytics routes
app.get('/api/ads/analytics/realtime', (req, res) => {
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

app.get('/api/ads/analytics/campaigns', (req, res) => {
  res.status(200).json({
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
      avg_ctr: 0.05
    }
  });
});

app.get('/api/ads/analytics/creatives', (req, res) => {
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
    ]
  });
});

app.get('/api/ads/analytics/assets/:id', (req, res) => {
  res.status(200).json({
    asset_id: req.params.id,
    performance: {
      impressions: 10000,
      clicks: 500,
      revenue: 1000.00,
      ctr: 0.05,
      avg_cpc: 2.00
    }
  });
});

app.get('/api/ads/analytics/trends', (req, res) => {
  res.status(200).json({
    trends: [
      {
        date: '2024-01-01',
        revenue: 100.00,
        impressions: 1000,
        clicks: 50
      }
    ]
  });
});

app.get('/api/ads/analytics/geographic', (req, res) => {
  res.status(200).json({
    regions: [
      {
        region: 'North America',
        revenue: 500.00,
        impressions: 5000,
        clicks: 250
      }
    ]
  });
});

app.get('/api/ads/analytics/summary', (req, res) => {
  res.status(200).json({
    total_revenue: 1000.00,
    total_impressions: 10000,
    total_clicks: 500,
    avg_ctr: 0.05,
    active_campaigns: 5
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
    }
  });
});

// Add the address method that supertest expects
app.address = () => ({ port: 5000 });

module.exports = app; 