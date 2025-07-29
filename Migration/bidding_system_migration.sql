-- ================================================
-- 1. Create bids table
-- ================================================

CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  lob VARCHAR(100) NOT NULL,
  bid_amount DECIMAL(10,2) NOT NULL,
  max_bid DECIMAL(10,2),
  bid_reason TEXT,
  user_id INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'won', 'lost')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bids_booking_id ON bids(booking_id);
CREATE INDEX IF NOT EXISTS idx_bids_lob ON bids(lob);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(bid_amount DESC);

-- ================================================
-- 2. Add columns to bookings table
-- ================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bid_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auction_status VARCHAR(50) DEFAULT 'none' CHECK (auction_status IN ('none', 'active', 'completed', 'cancelled'));

-- ================================================
-- 3. Create fairness_scores table
-- ================================================

CREATE TABLE IF NOT EXISTS fairness_scores (
  id SERIAL PRIMARY KEY,
  lob VARCHAR(100) NOT NULL,
  asset_id INTEGER REFERENCES assets(id),
  score DECIMAL(10,4) NOT NULL,
  factors JSONB,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enforce uniqueness for ON CONFLICT clause
ALTER TABLE fairness_scores ADD CONSTRAINT uniq_lob_asset UNIQUE (lob, asset_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fairness_scores_lob ON fairness_scores(lob);
CREATE INDEX IF NOT EXISTS idx_fairness_scores_asset_id ON fairness_scores(asset_id);
CREATE INDEX IF NOT EXISTS idx_fairness_scores_calculated_at ON fairness_scores(calculated_at);

-- ================================================
-- 4. Create lob_quotas table
-- ================================================

CREATE TABLE IF NOT EXISTS lob_quotas (
  id SERIAL PRIMARY KEY,
  lob VARCHAR(100) NOT NULL UNIQUE,
  monthly_quota INTEGER DEFAULT 30,
  quarterly_quota INTEGER DEFAULT 90,
  strategic_weight DECIMAL(3,2) DEFAULT 1.0,
  revenue_multiplier DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 5. Insert default LOB quotas
-- ================================================

INSERT INTO lob_quotas (lob, monthly_quota, quarterly_quota, strategic_weight, revenue_multiplier)
VALUES 
  ('Monetization', 45, 135, 1.5, 2.0),
  ('Pharmacy', 30, 90, 1.3, 1.5),
  ('Diagnostics', 25, 75, 1.2, 1.3),
  ('Insurance', 20, 60, 1.1, 1.2),
  ('Consult', 15, 45, 1.0, 1.0),
  ('Credit Card', 15, 45, 1.0, 1.0),
  ('Ask Apollo Circle', 10, 30, 0.9, 0.8)
ON CONFLICT (lob) DO NOTHING;

-- ================================================
-- 6. Function: update_fairness_score
-- ================================================

CREATE OR REPLACE FUNCTION update_fairness_score(
  p_lob VARCHAR,
  p_asset_id INTEGER,
  p_score DECIMAL,
  p_factors JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO fairness_scores (lob, asset_id, score, factors)
  VALUES (p_lob, p_asset_id, p_score, p_factors)
  ON CONFLICT (lob, asset_id)
  DO UPDATE SET
    score = p_score,
    factors = p_factors,
    calculated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 7. View: fairness_status (1-day snapshot)
-- ================================================

CREATE OR REPLACE VIEW fairness_status AS
SELECT 
  lob,
  asset_id,
  score,
  factors,
  calculated_at,
  ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY score DESC) AS rank
FROM fairness_scores
WHERE calculated_at >= NOW() - INTERVAL '1 day';

-- ================================================
-- 8. Function: get_lob_allocation_summary
-- ================================================

CREATE OR REPLACE FUNCTION get_lob_allocation_summary(
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  lob VARCHAR,
  total_days INTEGER,
  quota_days INTEGER,
  quota_percentage DECIMAL,
  total_bids INTEGER,
  total_bid_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.lob,
    COUNT(*)::INTEGER AS total_days,
    lq.monthly_quota AS quota_days,
    ROUND((COUNT(*)::DECIMAL / NULLIF(lq.monthly_quota, 0)) * 100, 2) AS quota_percentage,
    COALESCE(bs.bid_count, 0)::INTEGER AS total_bids,
    COALESCE(bs.total_amount, 0) AS total_bid_amount
  FROM bookings b
  LEFT JOIN lob_quotas lq ON b.lob = lq.lob
  LEFT JOIN (
    SELECT 
      lob,
      COUNT(*) AS bid_count,
      SUM(bid_amount) AS total_amount
    FROM bids 
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY lob
  ) bs ON b.lob = bs.lob
  WHERE b.start_date >= p_start_date 
    AND b.end_date <= p_end_date
    AND b.is_deleted = FALSE
  GROUP BY b.lob, lq.monthly_quota, bs.bid_count, bs.total_amount
  ORDER BY total_days DESC;
END;
$$ LANGUAGE plpgsql;