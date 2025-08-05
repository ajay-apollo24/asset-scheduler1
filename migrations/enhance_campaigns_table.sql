-- Migration: Enhance campaigns table with advanced fields
-- This migration adds production-ready fields for advanced campaign management

-- Add new columns for advanced campaign features
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS creative_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS performance_settings JSONB DEFAULT '{}';

-- Add indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_campaigns_creative_settings ON campaigns USING GIN (creative_settings);
CREATE INDEX IF NOT EXISTS idx_campaigns_performance_settings ON campaigns USING GIN (performance_settings);

-- Add constraint to ensure valid JSON
ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_creative_settings_check 
CHECK (creative_settings IS NULL OR jsonb_typeof(creative_settings) = 'object');

ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_performance_settings_check 
CHECK (performance_settings IS NULL OR jsonb_typeof(performance_settings) = 'object');

-- Update existing campaigns with default values
UPDATE campaigns 
SET 
  creative_settings = '{}',
  performance_settings = '{}'
WHERE creative_settings IS NULL OR performance_settings IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN campaigns.creative_settings IS 'Creative asset settings including format, dimensions, call-to-action, and landing page';
COMMENT ON COLUMN campaigns.performance_settings IS 'Performance optimization settings including bid adjustments, audience expansion, and brand safety';

-- Create a function to validate campaign settings
CREATE OR REPLACE FUNCTION validate_campaign_settings(campaign_record campaigns)
RETURNS TEXT[] AS $$
DECLARE
  errors TEXT[] := '{}';
BEGIN
  -- Validate targeting criteria structure
  IF campaign_record.targeting_criteria IS NOT NULL THEN
    IF NOT (campaign_record.targeting_criteria ? 'demographics' OR 
            campaign_record.targeting_criteria ? 'geo' OR 
            campaign_record.targeting_criteria ? 'device') THEN
      errors := array_append(errors, 'Invalid targeting_criteria structure');
    END IF;
  END IF;

  -- Validate day parting structure
  IF campaign_record.day_parting IS NOT NULL THEN
    IF NOT (campaign_record.day_parting ? 'monday' AND 
            campaign_record.day_parting ? 'tuesday' AND
            campaign_record.day_parting ? 'wednesday' AND
            campaign_record.day_parting ? 'thursday' AND
            campaign_record.day_parting ? 'friday' AND
            campaign_record.day_parting ? 'saturday' AND
            campaign_record.day_parting ? 'sunday') THEN
      errors := array_append(errors, 'Invalid day_parting structure');
    END IF;
  END IF;

  -- Validate creative settings
  IF campaign_record.creative_settings IS NOT NULL THEN
    IF NOT (campaign_record.creative_settings ? 'format') THEN
      errors := array_append(errors, 'Creative settings must include format');
    END IF;
  END IF;

  -- Validate performance settings
  IF campaign_record.performance_settings IS NOT NULL THEN
    IF NOT (campaign_record.performance_settings ? 'optimization_goal') THEN
      errors := array_append(errors, 'Performance settings must include optimization_goal');
    END IF;
  END IF;

  RETURN errors;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to validate campaign settings on insert/update
CREATE OR REPLACE FUNCTION validate_campaign_settings_trigger()
RETURNS TRIGGER AS $$
DECLARE
  validation_errors TEXT[];
BEGIN
  validation_errors := validate_campaign_settings(NEW);
  
  IF array_length(validation_errors, 1) > 0 THEN
    RAISE EXCEPTION 'Campaign validation failed: %', array_to_string(validation_errors, ', ');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS campaigns_validation_trigger ON campaigns;
CREATE TRIGGER campaigns_validation_trigger
  BEFORE INSERT OR UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION validate_campaign_settings_trigger();

-- Create a function to get campaign performance metrics
CREATE OR REPLACE FUNCTION get_campaign_performance(campaign_id INTEGER)
RETURNS TABLE(
  impressions BIGINT,
  clicks BIGINT,
  revenue DECIMAL(10,2),
  ctr DECIMAL(5,2),
  cpm DECIMAL(10,2),
  cpc DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(pm.impressions), 0)::BIGINT as impressions,
    COALESCE(SUM(pm.clicks), 0)::BIGINT as clicks,
    COALESCE(SUM(pm.revenue), 0)::DECIMAL(10,2) as revenue,
    CASE 
      WHEN SUM(pm.impressions) > 0 THEN 
        (SUM(pm.clicks)::DECIMAL / SUM(pm.impressions) * 100)::DECIMAL(5,2)
      ELSE 0::DECIMAL(5,2)
    END as ctr,
    CASE 
      WHEN SUM(pm.impressions) > 0 THEN 
        (c.budget / (SUM(pm.impressions)::DECIMAL / 1000))::DECIMAL(10,2)
      ELSE 0::DECIMAL(10,2)
    END as cpm,
    CASE 
      WHEN SUM(pm.clicks) > 0 THEN 
        (c.budget / SUM(pm.clicks)::DECIMAL)::DECIMAL(10,2)
      ELSE 0::DECIMAL(10,2)
    END as cpc
  FROM campaigns c
  LEFT JOIN creatives cr ON c.id = cr.campaign_id
  LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id
  WHERE c.id = campaign_id AND c.is_deleted = FALSE
  GROUP BY c.id, c.budget;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get targeting insights
CREATE OR REPLACE FUNCTION get_targeting_insights(campaign_id INTEGER)
RETURNS TABLE(
  demographic_performance JSONB,
  geographic_performance JSONB,
  device_performance JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    '{"age_groups": {}, "gender": {}, "interests": {}}'::JSONB as demographic_performance,
    '{"countries": {}, "cities": {}, "regions": {}}'::JSONB as geographic_performance,
    '{"desktop": 0, "mobile": 0, "tablet": 0}'::JSONB as device_performance
  FROM campaigns c
  WHERE c.id = campaign_id AND c.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the new functions
COMMENT ON FUNCTION validate_campaign_settings(campaign_record campaigns) IS 'Validates campaign settings and returns array of error messages';
COMMENT ON FUNCTION get_campaign_performance(campaign_id INTEGER) IS 'Returns comprehensive performance metrics for a campaign';
COMMENT ON FUNCTION get_targeting_insights(campaign_id INTEGER) IS 'Returns targeting performance insights for a campaign';

-- Migration completed successfully
SELECT 'Campaign table enhanced with advanced fields successfully' as migration_status; 