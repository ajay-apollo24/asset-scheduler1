-- Ad Server Database Migration
-- This file contains the SQL schema for ad server functionality

-- Creatives table
CREATE TABLE IF NOT EXISTS creatives (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('image', 'video', 'html5', 'native')),
  content JSONB NOT NULL,
  dimensions JSONB,
  file_size INTEGER,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  advertiser_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  budget DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  targeting_criteria JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad Requests table
CREATE TABLE IF NOT EXISTS ad_requests (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  user_context JSONB,
  page_context JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Impressions table
CREATE TABLE IF NOT EXISTS impressions (
  id SERIAL PRIMARY KEY,
  ad_request_id INTEGER REFERENCES ad_requests(id) ON DELETE CASCADE,
  creative_id INTEGER REFERENCES creatives(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clicks table
CREATE TABLE IF NOT EXISTS clicks (
  id SERIAL PRIMARY KEY,
  impression_id INTEGER REFERENCES impressions(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  destination_url TEXT,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  creative_id INTEGER REFERENCES creatives(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(creative_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_creatives_asset_id ON creatives(asset_id);
CREATE INDEX IF NOT EXISTS idx_creatives_status ON creatives(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_id ON campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_requests_asset_id ON ad_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_ad_requests_timestamp ON ad_requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_impressions_creative_id ON impressions(creative_id);
CREATE INDEX IF NOT EXISTS idx_impressions_timestamp ON impressions(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_creative_date ON performance_metrics(creative_id, date);

-- Comments
COMMENT ON TABLE creatives IS 'Stores ad creatives for assets';
COMMENT ON TABLE campaigns IS 'Stores advertising campaigns';
COMMENT ON TABLE ad_requests IS 'Stores ad serving requests';
COMMENT ON TABLE impressions IS 'Stores ad impressions';
COMMENT ON TABLE clicks IS 'Stores ad clicks';
COMMENT ON TABLE performance_metrics IS 'Stores daily performance metrics for creatives'; 