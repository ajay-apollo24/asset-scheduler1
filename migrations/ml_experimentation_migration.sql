-- ML/Experimentation System Migration
-- This migration adds tables for CTR prediction, bandit algorithms, and experimentation

-- User Features Table
CREATE TABLE IF NOT EXISTS user_features (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort VARCHAR(50),
    recency_days INTEGER,
    frequency INTEGER,
    monetary_value DECIMAL(10,2),
    purchase_history JSONB,
    device_type VARCHAR(20),
    location VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset Features Table
CREATE TABLE IF NOT EXISTS asset_features (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    historical_ctr DECIMAL(5,4),
    revenue_per_view DECIMAL(10,4),
    avg_bid_price DECIMAL(10,2),
    category VARCHAR(50),
    size VARCHAR(20),
    position VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CTR Models Table
CREATE TABLE IF NOT EXISTS ctr_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL UNIQUE,
    model_type VARCHAR(50) NOT NULL, -- 'logistic_regression', 'gbdt', 'neural_network'
    version VARCHAR(20) NOT NULL,
    features JSONB NOT NULL, -- Array of feature names
    hyperparameters JSONB, -- Model hyperparameters
    performance_metrics JSONB, -- AUC, accuracy, etc.
    model_path VARCHAR(255), -- Path to saved model file
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bandit Arms Table
CREATE TABLE IF NOT EXISTS bandit_arms (
    id SERIAL PRIMARY KEY,
    arm_name VARCHAR(100) NOT NULL UNIQUE,
    arm_type VARCHAR(50) NOT NULL, -- 'thompson_sampling', 'ucb', 'epsilon_greedy'
    parameters JSONB NOT NULL, -- Arm-specific parameters
    current_reward DECIMAL(10,4) DEFAULT 0.0,
    total_pulls INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Experiments Table
CREATE TABLE IF NOT EXISTS experiments (
    id SERIAL PRIMARY KEY,
    experiment_name VARCHAR(100) NOT NULL UNIQUE,
    experiment_type VARCHAR(50) NOT NULL, -- 'ab_test', 'bandit', 'ml_model'
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
    traffic_split JSONB, -- Traffic allocation percentages
    metrics JSONB, -- Metrics to track
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model Predictions Table
CREATE TABLE IF NOT EXISTS model_predictions (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES ctr_models(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
    predicted_ctr DECIMAL(5,4),
    predicted_cvr DECIMAL(5,4), -- Conversion rate
    confidence_score DECIMAL(3,2),
    features_used JSONB, -- Features used for prediction
    context JSONB, -- Context information (time, device, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Experiment Results Table
CREATE TABLE IF NOT EXISTS experiment_results (
    id SERIAL PRIMARY KEY,
    experiment_id INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    variant_name VARCHAR(50) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,4),
    sample_size INTEGER,
    confidence_interval JSONB, -- Lower and upper bounds
    p_value DECIMAL(10,6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bandit Pulls Table (for tracking bandit algorithm decisions)
CREATE TABLE IF NOT EXISTS bandit_pulls (
    id SERIAL PRIMARY KEY,
    arm_id INTEGER NOT NULL REFERENCES bandit_arms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
    reward DECIMAL(10,4),
    context JSONB, -- Context when arm was pulled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_features_user_id ON user_features(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_features_asset_id ON asset_features(asset_id);
CREATE INDEX IF NOT EXISTS idx_ctr_models_active ON ctr_models(is_active);
CREATE INDEX IF NOT EXISTS idx_bandit_arms_active ON bandit_arms(is_active);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_model_predictions_created_at ON model_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_bandit_pulls_arm_id ON bandit_pulls(arm_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_features_updated_at BEFORE UPDATE ON user_features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asset_features_updated_at BEFORE UPDATE ON asset_features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ctr_models_updated_at BEFORE UPDATE ON ctr_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bandit_arms_updated_at BEFORE UPDATE ON bandit_arms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON experiments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default ML models
INSERT INTO ctr_models (model_name, model_type, version, features, hyperparameters, performance_metrics, is_active) VALUES
('Default CTR Model', 'logistic_regression', '1.0.0', 
 '["user_cohort", "asset_ctr", "device_type", "time_of_day", "location"]',
 '{"learning_rate": 0.01, "max_iterations": 1000}',
 '{"auc": 0.75, "accuracy": 0.70}',
 true)
ON CONFLICT (model_name) DO NOTHING;

-- Insert default bandit arms
INSERT INTO bandit_arms (arm_name, arm_type, parameters, is_active) VALUES
('Thompson Sampling', 'thompson_sampling', '{"alpha": 1.0, "beta": 1.0}', true),
('UCB1', 'ucb', '{"exploration_factor": 2.0}', true),
('Epsilon Greedy', 'epsilon_greedy', '{"epsilon": 0.1}', true)
ON CONFLICT (arm_name) DO NOTHING;

-- Create views for easy querying
CREATE OR REPLACE VIEW ml_dashboard AS
SELECT 
    m.model_name,
    m.model_type,
    m.version,
    m.performance_metrics,
    COUNT(mp.id) as total_predictions,
    AVG(mp.predicted_ctr) as avg_predicted_ctr,
    AVG(mp.confidence_score) as avg_confidence
FROM ctr_models m
LEFT JOIN model_predictions mp ON m.id = mp.model_id
WHERE m.is_active = true
GROUP BY m.id, m.model_name, m.model_type, m.version, m.performance_metrics;

CREATE OR REPLACE VIEW bandit_performance AS
SELECT 
    ba.arm_name,
    ba.arm_type,
    ba.current_reward,
    ba.total_pulls,
    CASE 
        WHEN ba.total_pulls > 0 THEN ba.current_reward / ba.total_pulls 
        ELSE 0 
    END as avg_reward
FROM bandit_arms ba
WHERE ba.is_active = true
ORDER BY avg_reward DESC;

-- Grant permissions to test user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO asset_allocation;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO asset_allocation; 