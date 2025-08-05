-- Unified Campaign Migration Script for pgAdmin
-- This script unifies the bookings and campaigns tables into a single system
-- that can handle both internal team bookings and external advertiser campaigns

-- Step 1: Create backup of existing bookings table
CREATE TABLE IF NOT EXISTS bookings_backup AS 
SELECT * FROM bookings;

-- Step 2: Rename existing bookings table
ALTER TABLE bookings RENAME TO bookings_old;

-- Step 3: Add new columns to campaigns table to support internal bookings
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS advertiser_type VARCHAR(20) DEFAULT 'external' CHECK (advertiser_type IN ('internal', 'external')),
ADD COLUMN IF NOT EXISTS lob VARCHAR(100),
ADD COLUMN IF NOT EXISTS purpose TEXT,
ADD COLUMN IF NOT EXISTS creative_url TEXT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auction_status VARCHAR(50) DEFAULT 'none' CHECK (auction_status IN ('none', 'active', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS priority_weight DECIMAL(3,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS bidding_strategy VARCHAR(20) DEFAULT 'manual' CHECK (bidding_strategy IN ('manual', 'rtb', 'auto'));

-- Step 4: Add new columns to campaigns table to support booking-specific fields
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS asset_id INTEGER REFERENCES assets(id);

-- Step 5: Create a view to maintain backward compatibility with existing bookings
CREATE OR REPLACE VIEW bookings AS
SELECT 
    id,
    asset_id,
    advertiser_id as user_id,
    title,
    start_date,
    end_date,
    status,
    created_at,
    lob,
    purpose,
    creative_url,
    is_deleted,
    budget as bid_amount,
    auction_status
FROM campaigns 
WHERE advertiser_type = 'internal' AND is_deleted = FALSE;

-- Step 6: Create a function to migrate existing bookings to campaigns
CREATE OR REPLACE FUNCTION migrate_bookings_to_campaigns()
RETURNS void AS $$
DECLARE
    booking_record RECORD;
BEGIN
    -- Migrate existing bookings to campaigns
    FOR booking_record IN 
        SELECT * FROM bookings_old WHERE is_deleted = FALSE
    LOOP
        INSERT INTO campaigns (
            advertiser_id,
            name,
            title,
            asset_id,
            budget,
            start_date,
            end_date,
            status,
            advertiser_type,
            lob,
            purpose,
            creative_url,
            auction_status,
            bidding_strategy,
            created_at
        ) VALUES (
            booking_record.user_id,
            booking_record.title,
            booking_record.title,
            booking_record.asset_id,
            COALESCE(booking_record.bid_amount, 0),
            booking_record.start_date,
            booking_record.end_date,
            booking_record.status,
            'internal',
            booking_record.lob,
            booking_record.purpose,
            booking_record.creative_url,
            booking_record.auction_status,
            'manual',
            booking_record.created_at
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create indexes for the new unified system
CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_type ON campaigns(advertiser_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_lob ON campaigns(lob);
CREATE INDEX IF NOT EXISTS idx_campaigns_asset_dates ON campaigns(asset_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_auction_status ON campaigns(auction_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_bidding_strategy ON campaigns(bidding_strategy);

-- Step 8: Create a unified allocation function
CREATE OR REPLACE FUNCTION get_unified_asset_availability(
    p_asset_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    date DATE,
    available_slots INTEGER,
    internal_bookings INTEGER,
    external_campaigns INTEGER,
    total_revenue DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date as date
    ),
    daily_allocations AS (
        SELECT 
            ds.date,
            a.max_slots,
            COUNT(CASE WHEN c.advertiser_type = 'internal' THEN 1 END) as internal_count,
            COUNT(CASE WHEN c.advertiser_type = 'external' THEN 1 END) as external_count,
            SUM(CASE WHEN c.advertiser_type = 'external' THEN c.budget ELSE 0 END) as external_revenue
        FROM date_series ds
        CROSS JOIN assets a
        LEFT JOIN campaigns c ON 
            c.asset_id = a.id 
            AND c.is_deleted = FALSE
            AND c.status IN ('pending', 'approved', 'active')
            AND ds.date BETWEEN c.start_date AND c.end_date
        WHERE a.id = p_asset_id
        GROUP BY ds.date, a.max_slots
    )
    SELECT 
        da.date,
        GREATEST(0, da.max_slots - da.internal_count - da.external_count) as available_slots,
        da.internal_count as internal_bookings,
        da.external_count as external_campaigns,
        da.external_revenue as total_revenue
    FROM daily_allocations da
    ORDER BY da.date;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create a unified bidding function
CREATE OR REPLACE FUNCTION process_unified_bid(
    p_campaign_id INTEGER,
    p_asset_id INTEGER,
    p_bid_amount DECIMAL(10,2),
    p_bid_type VARCHAR(20) DEFAULT 'manual'
)
RETURNS JSON AS $$
DECLARE
    campaign_record RECORD;
    asset_record RECORD;
    result JSON;
BEGIN
    -- Get campaign details
    SELECT * INTO campaign_record FROM campaigns WHERE id = p_campaign_id;
    
    -- Get asset details
    SELECT * INTO asset_record FROM assets WHERE id = p_asset_id;
    
    -- Validate bid based on advertiser type
    IF campaign_record.advertiser_type = 'internal' THEN
        -- Apply internal bidding rules (fairness, budget limits, etc.)
        -- This would integrate with existing bidding validation logic
        result := json_build_object(
            'status', 'success',
            'message', 'Internal bid processed',
            'bid_amount', p_bid_amount,
            'fairness_score', 1.0 -- Placeholder for actual fairness calculation
        );
    ELSE
        -- Apply external bidding rules (RTB, performance optimization, etc.)
        result := json_build_object(
            'status', 'success',
            'message', 'External bid processed',
            'bid_amount', p_bid_amount,
            'performance_score', 1.0 -- Placeholder for actual performance calculation
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Add comments for documentation
COMMENT ON TABLE campaigns IS 'Unified table for both internal team bookings and external advertiser campaigns';
COMMENT ON COLUMN campaigns.advertiser_type IS 'Type of advertiser: internal (team) or external (advertiser)';
COMMENT ON COLUMN campaigns.lob IS 'Line of Business (for internal campaigns)';
COMMENT ON COLUMN campaigns.purpose IS 'Purpose of the campaign/booking';
COMMENT ON COLUMN campaigns.priority_weight IS 'Priority weight for internal campaigns (fairness allocation)';
COMMENT ON COLUMN campaigns.bidding_strategy IS 'Bidding strategy: manual, rtb, or auto';

-- Step 11: Create a trigger to maintain data consistency
CREATE OR REPLACE FUNCTION update_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_updated_at();

-- Step 12: Create a function to get unified analytics
CREATE OR REPLACE FUNCTION get_unified_analytics(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    advertiser_type VARCHAR(20),
    total_campaigns INTEGER,
    total_budget DECIMAL(12,2),
    total_revenue DECIMAL(12,2),
    avg_performance_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.advertiser_type,
        COUNT(*) as total_campaigns,
        SUM(c.budget) as total_budget,
        SUM(CASE WHEN c.advertiser_type = 'external' THEN c.budget ELSE 0 END) as total_revenue,
        AVG(CASE WHEN c.advertiser_type = 'internal' THEN c.priority_weight ELSE 1.0 END) as avg_performance_score
    FROM campaigns c
    WHERE c.start_date BETWEEN p_start_date AND p_end_date
    AND c.is_deleted = FALSE
    GROUP BY c.advertiser_type;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Migrate existing bookings to campaigns
SELECT migrate_bookings_to_campaigns();

-- Step 14: Verify migration
-- Check the counts to ensure migration was successful
SELECT 
    'Original bookings' as description,
    COUNT(*) as count
FROM bookings_old 
WHERE is_deleted = FALSE
UNION ALL
SELECT 
    'Migrated internal campaigns' as description,
    COUNT(*) as count
FROM campaigns 
WHERE advertiser_type = 'internal';

-- Step 15: Display migration summary
DO $$
DECLARE
    booking_count INTEGER;
    campaign_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO booking_count FROM bookings_old WHERE is_deleted = FALSE;
    SELECT COUNT(*) INTO campaign_count FROM campaigns WHERE advertiser_type = 'internal';
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE 'Original bookings: %', booking_count;
    RAISE NOTICE 'Migrated campaigns: %', campaign_count;
    
    IF booking_count = campaign_count THEN
        RAISE NOTICE 'Migration verification successful - all bookings migrated';
    ELSE
        RAISE NOTICE 'Warning: Booking count mismatch. Please review manually.';
    END IF;
END $$; 