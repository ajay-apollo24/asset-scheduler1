-- Ad Server extensions: basic stubs for targeting, attribution, and video analytics

-- Audience segments for first-party audiences
CREATE TABLE IF NOT EXISTS audience_segments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversions table for attribution events
CREATE TABLE IF NOT EXISTS conversions (
  id SERIAL PRIMARY KEY,
  impression_id INTEGER,
  click_id INTEGER,
  value NUMERIC(12,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Video quartile events for video creatives
CREATE TABLE IF NOT EXISTS video_events (
  id SERIAL PRIMARY KEY,
  creative_id INTEGER NOT NULL,
  ad_request_id INTEGER,
  quartile VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_conversions_created_at ON conversions (created_at);
CREATE INDEX IF NOT EXISTS idx_video_events_creative ON video_events (creative_id); 