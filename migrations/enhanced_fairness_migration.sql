-- Enhanced Fairness System Migration - Asset-Specific Configuration
-- This migration adds asset-specific monetization limits and fairness configuration
-- It handles existing tables and only adds new functionality

-- ============================================================================
-- ASSET-SPECIFIC CONFIGURATION TABLES
-- ============================================================================

-- Table to store asset-specific monetization slot limits
-- This allows individual assets to have custom monetization caps
CREATE TABLE IF NOT EXISTS asset_monetization_limits (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL UNIQUE,
    monetization_slot_limit DECIMAL(5,2) NOT NULL, -- Percentage (0.0 to 1.0)
    internal_slot_guarantee DECIMAL(5,2) NOT NULL, -- Percentage guaranteed for internal teams
    external_slot_limit DECIMAL(5,2) NOT NULL, -- Percentage for external campaigns
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_asset_monetization_limits_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    CONSTRAINT check_monetization_limit CHECK (monetization_slot_limit >= 0.0 AND monetization_slot_limit <= 1.0),
    CONSTRAINT check_internal_guarantee CHECK (internal_slot_guarantee >= 0.0 AND internal_slot_guarantee <= 1.0),
    CONSTRAINT check_external_limit CHECK (external_slot_limit >= 0.0 AND external_slot_limit <= 1.0),
    CONSTRAINT check_total_allocation CHECK ((internal_slot_guarantee + external_slot_limit) <= 1.0)
);

-- Table to store asset-specific fairness configurations
-- This allows individual assets to have custom fairness rules
CREATE TABLE IF NOT EXISTS asset_fairness_config (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL UNIQUE,
    strategic_weight_override DECIMAL(5,2), -- Override strategic weight for this asset
    time_decay_factor DECIMAL(5,2) DEFAULT 0.1, -- Custom time decay factor
    revenue_floor DECIMAL(5,2) DEFAULT 1.5, -- Custom revenue floor for monetization
    fairness_bonus DECIMAL(5,2) DEFAULT 0.3, -- Custom fairness bonus
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_asset_fairness_config_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    CONSTRAINT check_strategic_weight CHECK (strategic_weight_override IS NULL OR (strategic_weight_override >= 0.1 AND strategic_weight_override <= 5.0)),
    CONSTRAINT check_time_decay CHECK (time_decay_factor >= 0.0 AND time_decay_factor <= 1.0),
    CONSTRAINT check_revenue_floor CHECK (revenue_floor >= 0.5 AND revenue_floor <= 5.0),
    CONSTRAINT check_fairness_bonus CHECK (fairness_bonus >= 0.0 AND fairness_bonus <= 2.0)
);

-- ============================================================================
-- ROI TRACKING TABLES (Only if they don't exist)
-- ============================================================================

-- Table to track engagement metrics for AI Bot and engagement campaigns
CREATE TABLE IF NOT EXISTS engagement_metrics (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    asset_id INTEGER NOT NULL,
    lob VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    user_interactions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_time_spent_seconds INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT fk_engagement_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_engagement_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    UNIQUE(campaign_id, asset_id, date)
);

-- Table to track conversion metrics for Lab Test and conversion campaigns
CREATE TABLE IF NOT EXISTS conversion_metrics (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    asset_id INTEGER NOT NULL,
    lob VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    avg_conversion_value DECIMAL(10,2) DEFAULT 0,
    total_conversion_value DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT fk_conversion_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversion_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    UNIQUE(campaign_id, asset_id, date)
);

-- Table to track revenue metrics for Monetization and revenue campaigns
CREATE TABLE IF NOT EXISTS revenue_metrics (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    asset_id INTEGER NOT NULL,
    lob VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    daily_revenue DECIMAL(10,2) DEFAULT 0,
    revenue_efficiency DECIMAL(5,4) DEFAULT 0,
    cost_per_acquisition DECIMAL(10,2) DEFAULT 0,
    roi_ratio DECIMAL(5,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT fk_revenue_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_revenue_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    UNIQUE(campaign_id, asset_id, date)
);

-- ============================================================================
-- ENHANCED FAIRNESS TABLES (Only if they don't exist)
-- ============================================================================

-- Table to track slot allocation and usage
CREATE TABLE IF NOT EXISTS slot_allocation (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    asset_level VARCHAR(20) NOT NULL, -- 'primary', 'secondary', 'tertiary'
    date DATE NOT NULL,
    total_slots INTEGER NOT NULL,
    internal_slots_allocated INTEGER DEFAULT 0,
    external_slots_allocated INTEGER DEFAULT 0,
    monetization_slots_allocated INTEGER DEFAULT 0,
    internal_percentage DECIMAL(5,2) DEFAULT 0,
    external_percentage DECIMAL(5,2) DEFAULT 0,
    monetization_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT fk_slot_allocation_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    UNIQUE(asset_id, date)
);

-- Table to track bid caps and restrictions
CREATE TABLE IF NOT EXISTS bid_caps (
    id SERIAL PRIMARY KEY,
    lob VARCHAR(50) NOT NULL,
    asset_level VARCHAR(20) NOT NULL,
    max_bid_multiplier DECIMAL(5,2) NOT NULL,
    slot_limit_percentage DECIMAL(5,2) NOT NULL,
    time_restriction VARCHAR(20), -- 'business_hours', 'any_time'
    revenue_floor DECIMAL(5,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    UNIQUE(lob, asset_level)
);

-- ============================================================================
-- FUNCTIONS FOR ASSET-SPECIFIC CONFIGURATION
-- ============================================================================

-- Function to get asset-specific monetization slot limit
CREATE OR REPLACE FUNCTION get_asset_monetization_limit(p_asset_id INTEGER)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    custom_limit DECIMAL(5,2);
    asset_level VARCHAR(20);
    default_limit DECIMAL(5,2);
BEGIN
    -- First check if there's a custom limit for this asset
    SELECT monetization_slot_limit INTO custom_limit
    FROM asset_monetization_limits
    WHERE asset_id = p_asset_id AND is_active = true;
    
    IF custom_limit IS NOT NULL THEN
        RETURN custom_limit;
    END IF;
    
    -- Fall back to asset level defaults
    SELECT level INTO asset_level
    FROM assets
    WHERE id = p_asset_id;
    
    CASE asset_level
        WHEN 'primary' THEN default_limit := 0.2;   -- 20%
        WHEN 'secondary' THEN default_limit := 0.15; -- 15%
        WHEN 'tertiary' THEN default_limit := 0.1;   -- 10%
        ELSE default_limit := 0.15; -- Default to secondary
    END CASE;
    
    RETURN default_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get asset-specific slot allocation
CREATE OR REPLACE FUNCTION get_asset_slot_allocation(p_asset_id INTEGER)
RETURNS TABLE (
    internal_guarantee DECIMAL(5,2),
    external_limit DECIMAL(5,2),
    monetization_limit DECIMAL(5,2)
) AS $$
DECLARE
    custom_config RECORD;
    asset_level VARCHAR(20);
BEGIN
    -- First check if there's a custom configuration for this asset
    SELECT 
        internal_slot_guarantee,
        external_slot_limit,
        monetization_slot_limit
    INTO custom_config
    FROM asset_monetization_limits
    WHERE asset_id = p_asset_id AND is_active = true;
    
    IF custom_config.internal_slot_guarantee IS NOT NULL THEN
        -- Return custom configuration
        RETURN QUERY SELECT 
            custom_config.internal_slot_guarantee,
            custom_config.external_slot_limit,
            custom_config.monetization_slot_limit;
        RETURN;
    END IF;
    
    -- Fall back to asset level defaults
    SELECT level INTO asset_level
    FROM assets
    WHERE id = p_asset_id;
    
    CASE asset_level
        WHEN 'primary' THEN
            RETURN QUERY SELECT 0.6::DECIMAL(5,2), 0.4::DECIMAL(5,2), 0.2::DECIMAL(5,2);
        WHEN 'secondary' THEN
            RETURN QUERY SELECT 0.7::DECIMAL(5,2), 0.3::DECIMAL(5,2), 0.15::DECIMAL(5,2);
        WHEN 'tertiary' THEN
            RETURN QUERY SELECT 0.8::DECIMAL(5,2), 0.2::DECIMAL(5,2), 0.1::DECIMAL(5,2);
        ELSE
            RETURN QUERY SELECT 0.7::DECIMAL(5,2), 0.3::DECIMAL(5,2), 0.15::DECIMAL(5,2);
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate normalized ROI for different campaign types
CREATE OR REPLACE FUNCTION calculate_normalized_roi(
    p_lob VARCHAR(50),
    p_asset_id INTEGER,
    p_campaign_id INTEGER,
    p_days INTEGER DEFAULT 30
)
RETURNS DECIMAL(10,4) AS $$
DECLARE
    roi_value DECIMAL(10,4) := 1.0;
    metric_type VARCHAR(50);
    target_metric VARCHAR(50);
    normalization_factor DECIMAL(10,4);
    target_value INTEGER;
    actual_value DECIMAL(10,2);
BEGIN
    -- Get ROI configuration based on LOB
    CASE p_lob
        WHEN 'Monetization' THEN
            metric_type := 'immediate_revenue';
            target_metric := 'revenue_per_day';
            normalization_factor := 1.0;
            target_value := 1000; -- Target daily revenue
            
            -- Calculate actual revenue
            SELECT COALESCE(SUM(daily_revenue), 0) INTO actual_value
            FROM revenue_metrics
            WHERE campaign_id = p_campaign_id 
              AND asset_id = p_asset_id
              AND date >= CURRENT_DATE - INTERVAL '1 day' * p_days;
            
            roi_value := CASE 
                WHEN target_value > 0 THEN LEAST(actual_value / target_value, 2.0)
                ELSE 1.0
            END;
            
        WHEN 'AI Bot' THEN
            metric_type := 'engagement';
            target_metric := 'user_interactions';
            normalization_factor := 0.1;
            target_value := 1000; -- Target interactions
            
            -- Calculate actual interactions
            SELECT COALESCE(SUM(user_interactions), 0) INTO actual_value
            FROM engagement_metrics
            WHERE campaign_id = p_campaign_id 
              AND asset_id = p_asset_id
              AND date >= CURRENT_DATE - INTERVAL '1 day' * p_days;
            
            roi_value := CASE 
                WHEN target_value > 0 THEN LEAST((actual_value / target_value) * normalization_factor, 1.5)
                ELSE 1.0
            END;
            
        WHEN 'Lab Test' THEN
            metric_type := 'conversion';
            target_metric := 'bookings';
            normalization_factor := 0.05;
            target_value := 50; -- Target conversions
            
            -- Calculate actual conversions
            SELECT COALESCE(SUM(total_conversions), 0) INTO actual_value
            FROM conversion_metrics
            WHERE campaign_id = p_campaign_id 
              AND asset_id = p_asset_id
              AND date >= CURRENT_DATE - INTERVAL '1 day' * p_days;
            
            roi_value := CASE 
                WHEN target_value > 0 THEN LEAST((actual_value / target_value) * normalization_factor, 1.8)
                ELSE 1.0
            END;
            
        WHEN 'Pharmacy' THEN
            metric_type := 'revenue';
            target_metric := 'revenue_per_day';
            normalization_factor := 0.8;
            target_value := 5000; -- Target daily revenue
            
            -- Calculate actual revenue
            SELECT COALESCE(SUM(daily_revenue), 0) INTO actual_value
            FROM revenue_metrics
            WHERE campaign_id = p_campaign_id 
              AND asset_id = p_asset_id
              AND date >= CURRENT_DATE - INTERVAL '1 day' * p_days;
            
            roi_value := CASE 
                WHEN target_value > 0 THEN LEAST((actual_value / target_value) * normalization_factor, 1.6)
                ELSE 1.0
            END;
            
        WHEN 'Diagnostics' THEN
            metric_type := 'conversion';
            target_metric := 'test_bookings';
            normalization_factor := 0.03;
            target_value := 30; -- Target test bookings
            
            -- Calculate actual conversions
            SELECT COALESCE(SUM(total_conversions), 0) INTO actual_value
            FROM conversion_metrics
            WHERE campaign_id = p_campaign_id 
              AND asset_id = p_asset_id
              AND date >= CURRENT_DATE - INTERVAL '1 day' * p_days;
            
            roi_value := CASE 
                WHEN target_value > 0 THEN LEAST((actual_value / target_value) * normalization_factor, 1.7)
                ELSE 1.0
            END;
            
        ELSE
            roi_value := 1.0; -- Default for unknown LOBs
    END CASE;
    
    RETURN roi_value;
END;
$$ LANGUAGE plpgsql;

-- Function to get slot allocation for an asset
CREATE OR REPLACE FUNCTION get_slot_allocation(
    p_asset_id INTEGER,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_slots INTEGER,
    internal_slots_allocated INTEGER,
    external_slots_allocated INTEGER,
    monetization_slots_allocated INTEGER,
    internal_percentage DECIMAL(5,2),
    external_percentage DECIMAL(5,2),
    monetization_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.total_slots,
        sa.internal_slots_allocated,
        sa.external_slots_allocated,
        sa.monetization_slots_allocated,
        sa.internal_percentage,
        sa.external_percentage,
        sa.monetization_percentage
    FROM slot_allocation sa
    WHERE sa.asset_id = p_asset_id AND sa.date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to update slot allocation
CREATE OR REPLACE FUNCTION update_slot_allocation(
    p_asset_id INTEGER,
    p_date DATE,
    p_total_slots INTEGER,
    p_internal_slots INTEGER DEFAULT 0,
    p_external_slots INTEGER DEFAULT 0,
    p_monetization_slots INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO slot_allocation (
        asset_id, date, total_slots, internal_slots_allocated, 
        external_slots_allocated, monetization_slots_allocated,
        internal_percentage, external_percentage, monetization_percentage
    ) VALUES (
        p_asset_id, p_date, p_total_slots, p_internal_slots,
        p_external_slots, p_monetization_slots,
        CASE WHEN p_total_slots > 0 THEN (p_internal_slots::DECIMAL / p_total_slots) * 100 ELSE 0 END,
        CASE WHEN p_total_slots > 0 THEN (p_external_slots::DECIMAL / p_total_slots) * 100 ELSE 0 END,
        CASE WHEN p_total_slots > 0 THEN (p_monetization_slots::DECIMAL / p_total_slots) * 100 ELSE 0 END
    )
    ON CONFLICT (asset_id, date)
    DO UPDATE SET
        total_slots = p_total_slots,
        internal_slots_allocated = p_internal_slots,
        external_slots_allocated = p_external_slots,
        monetization_slots_allocated = p_monetization_slots,
        internal_percentage = CASE WHEN p_total_slots > 0 THEN (p_internal_slots::DECIMAL / p_total_slots) * 100 ELSE 0 END,
        external_percentage = CASE WHEN p_total_slots > 0 THEN (p_external_slots::DECIMAL / p_total_slots) * 100 ELSE 0 END,
        monetization_percentage = CASE WHEN p_total_slots > 0 THEN (p_monetization_slots::DECIMAL / p_total_slots) * 100 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA INSERTION
-- ============================================================================

-- Insert default bid caps configuration
INSERT INTO bid_caps (lob, asset_level, max_bid_multiplier, slot_limit_percentage, time_restriction, revenue_floor) VALUES
('Monetization', 'primary', 1.2, 20.0, 'business_hours', 1.5),
('Monetization', 'secondary', 1.2, 15.0, 'business_hours', 1.5),
('Monetization', 'tertiary', 1.2, 10.0, 'business_hours', 1.5),
('AI Bot', 'primary', 2.0, 0.0, 'any_time', 1.0),
('AI Bot', 'secondary', 2.0, 0.0, 'any_time', 1.0),
('AI Bot', 'tertiary', 2.0, 0.0, 'any_time', 1.0),
('Lab Test', 'primary', 1.8, 0.0, 'any_time', 1.0),
('Lab Test', 'secondary', 1.8, 0.0, 'any_time', 1.0),
('Lab Test', 'tertiary', 1.8, 0.0, 'any_time', 1.0),
('Pharmacy', 'primary', 1.6, 0.0, 'any_time', 1.0),
('Pharmacy', 'secondary', 1.6, 0.0, 'any_time', 1.0),
('Pharmacy', 'tertiary', 1.6, 0.0, 'any_time', 1.0),
('Diagnostics', 'primary', 1.7, 0.0, 'any_time', 1.0),
('Diagnostics', 'secondary', 1.7, 0.0, 'any_time', 1.0),
('Diagnostics', 'tertiary', 1.7, 0.0, 'any_time', 1.0)
ON CONFLICT (lob, asset_level) DO NOTHING;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for engagement_metrics
CREATE INDEX IF NOT EXISTS idx_engagement_campaign_date ON engagement_metrics(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_engagement_asset_lob ON engagement_metrics(asset_id, lob);
CREATE INDEX IF NOT EXISTS idx_engagement_date_range ON engagement_metrics(date);

-- Indexes for conversion_metrics
CREATE INDEX IF NOT EXISTS idx_conversion_campaign_date ON conversion_metrics(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_conversion_asset_lob ON conversion_metrics(asset_id, lob);
CREATE INDEX IF NOT EXISTS idx_conversion_date_range ON conversion_metrics(date);

-- Indexes for revenue_metrics
CREATE INDEX IF NOT EXISTS idx_revenue_campaign_date ON revenue_metrics(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_revenue_asset_lob ON revenue_metrics(asset_id, lob);
CREATE INDEX IF NOT EXISTS idx_revenue_date_range ON revenue_metrics(date);

-- Indexes for slot_allocation
CREATE INDEX IF NOT EXISTS idx_slot_allocation_asset_date ON slot_allocation(asset_id, date);
CREATE INDEX IF NOT EXISTS idx_slot_allocation_date ON slot_allocation(date);

-- Indexes for bid_caps
CREATE INDEX IF NOT EXISTS idx_bid_caps_lob_level ON bid_caps(lob, asset_level);
CREATE INDEX IF NOT EXISTS idx_bid_caps_active ON bid_caps(is_active);

-- Indexes for asset-specific configuration
CREATE INDEX IF NOT EXISTS idx_asset_monetization_limits_asset ON asset_monetization_limits(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_monetization_limits_active ON asset_monetization_limits(is_active);
CREATE INDEX IF NOT EXISTS idx_asset_fairness_config_asset ON asset_fairness_config(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_fairness_config_active ON asset_fairness_config(is_active);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE engagement_metrics IS 'Tracks user engagement metrics for AI Bot and engagement campaigns';
COMMENT ON TABLE conversion_metrics IS 'Tracks conversion metrics for Lab Test and conversion campaigns';
COMMENT ON TABLE revenue_metrics IS 'Tracks revenue metrics for Monetization and revenue campaigns';
COMMENT ON TABLE slot_allocation IS 'Tracks slot allocation and usage to ensure fair distribution';
COMMENT ON TABLE bid_caps IS 'Stores bid caps and restrictions for different LOBs and asset levels';
COMMENT ON TABLE asset_monetization_limits IS 'Stores asset-specific monetization slot limits for per-asset configuration';
COMMENT ON TABLE asset_fairness_config IS 'Stores asset-specific fairness configurations for per-asset customization';

COMMENT ON FUNCTION calculate_normalized_roi IS 'Calculates normalized ROI for different campaign types to enable fair comparison';
COMMENT ON FUNCTION get_asset_monetization_limit IS 'Gets asset-specific monetization slot limit, falling back to asset level defaults';
COMMENT ON FUNCTION get_asset_slot_allocation IS 'Gets asset-specific slot allocation configuration, falling back to asset level defaults';
COMMENT ON FUNCTION get_slot_allocation IS 'Gets current slot allocation for an asset';
COMMENT ON FUNCTION update_slot_allocation IS 'Updates slot allocation for an asset on a specific date'; 