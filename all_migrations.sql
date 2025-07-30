-- ===== Start of Migration/seed_setup.sql =====
--
-- PostgreSQL database dump
--

-- Dumped from database version 13.21 (Postgres.app)
-- Dumped by pg_dump version 17.0

-- Started on 2025-07-25 16:38:22 IST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE asset_allocation;
--
-- TOC entry 3327 (class 1262 OID 16412)
-- Name: asset_allocation; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE asset_allocation WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';


ALTER DATABASE asset_allocation OWNER TO postgres;

\connect asset_allocation

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 211 (class 1259 OID 16526)
-- Name: approvals; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.approvals (
    id integer NOT NULL,
    booking_id integer,
    step_order integer NOT NULL,
    role text NOT NULL,
    status text NOT NULL,
    decided_by integer,
    comment text,
    decided_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.approvals OWNER TO asset_allocation;

--
-- TOC entry 210 (class 1259 OID 16524)
-- Name: approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approvals_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3329 (class 0 OID 0)
-- Dependencies: 210
-- Name: approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.approvals_id_seq OWNED BY public.approvals.id;


--
-- TOC entry 209 (class 1259 OID 16492)
-- Name: asset_metrics; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.asset_metrics (
    id integer NOT NULL,
    asset_id integer,
    lob text NOT NULL,
    date date NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    clicks integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.asset_metrics OWNER TO asset_allocation;

--
-- TOC entry 208 (class 1259 OID 16490)
-- Name: asset_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.asset_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_metrics_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3330 (class 0 OID 0)
-- Dependencies: 208
-- Name: asset_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.asset_metrics_id_seq OWNED BY public.asset_metrics.id;


--
-- TOC entry 203 (class 1259 OID 16432)
-- Name: assets; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    location character varying(255) NOT NULL,
    type character varying(100) NOT NULL,
    max_slots integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    importance integer DEFAULT 1 NOT NULL,
    impressions_per_day integer DEFAULT 0 NOT NULL,
    value_per_day numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT assets_max_slots_check CHECK ((max_slots >= 1))
);


ALTER TABLE public.assets OWNER TO asset_allocation;

--
-- TOC entry 202 (class 1259 OID 16430)
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assets_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3331 (class 0 OID 0)
-- Dependencies: 202
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- TOC entry 207 (class 1259 OID 16466)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO asset_allocation;

--
-- TOC entry 206 (class 1259 OID 16464)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3332 (class 0 OID 0)
-- Dependencies: 206
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 205 (class 1259 OID 16446)
-- Name: bookings; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    lob text NOT NULL,
    purpose text NOT NULL,
    creative_url text,
    is_deleted boolean DEFAULT false NOT NULL,
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.bookings OWNER TO asset_allocation;

--
-- TOC entry 204 (class 1259 OID 16444)
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3333 (class 0 OID 0)
-- Dependencies: 204
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- TOC entry 201 (class 1259 OID 16417)
-- Name: users; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'requestor'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO asset_allocation;

--
-- TOC entry 200 (class 1259 OID 16415)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3334 (class 0 OID 0)
-- Dependencies: 200
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3163 (class 2604 OID 16529)
-- Name: approvals id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.approvals ALTER COLUMN id SET DEFAULT nextval('public.approvals_id_seq'::regclass);


--
-- TOC entry 3160 (class 2604 OID 16495)
-- Name: asset_metrics id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.asset_metrics ALTER COLUMN id SET DEFAULT nextval('public.asset_metrics_id_seq'::regclass);


--
-- TOC entry 3148 (class 2604 OID 16435)
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- TOC entry 3158 (class 2604 OID 16469)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 3154 (class 2604 OID 16449)
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- TOC entry 3146 (class 2604 OID 16420)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3184 (class 2606 OID 16535)
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- TOC entry 3180 (class 2606 OID 16504)
-- Name: asset_metrics asset_metrics_asset_id_lob_date_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.asset_metrics
    ADD CONSTRAINT asset_metrics_asset_id_lob_date_key UNIQUE (asset_id, lob, date);


--
-- TOC entry 3182 (class 2606 OID 16502)
-- Name: asset_metrics asset_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.asset_metrics
    ADD CONSTRAINT asset_metrics_pkey PRIMARY KEY (id);


--
-- TOC entry 3173 (class 2606 OID 16443)
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- TOC entry 3178 (class 2606 OID 16475)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3175 (class 2606 OID 16453)
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- TOC entry 3169 (class 2606 OID 16429)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3171 (class 2606 OID 16427)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3185 (class 1259 OID 16546)
-- Name: idx_approvals_booking; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_approvals_booking ON public.approvals USING btree (booking_id);


--
-- TOC entry 3176 (class 1259 OID 16489)
-- Name: idx_bookings_asset_lob_dates; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_bookings_asset_lob_dates ON public.bookings USING btree (asset_id, lob, start_date, end_date);


--
-- TOC entry 3190 (class 2606 OID 16536)
-- Name: approvals approvals_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- TOC entry 3191 (class 2606 OID 16541)
-- Name: approvals approvals_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- TOC entry 3189 (class 2606 OID 16505)
-- Name: asset_metrics asset_metrics_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.asset_metrics
    ADD CONSTRAINT asset_metrics_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- TOC entry 3188 (class 2606 OID 16476)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3186 (class 2606 OID 16454)
-- Name: bookings bookings_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- TOC entry 3187 (class 2606 OID 16459)
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3328 (class 0 OID 0)
-- Dependencies: 3327
-- Name: DATABASE asset_allocation; Type: ACL; Schema: -; Owner: postgres
--

GRANT CONNECT ON DATABASE asset_allocation TO asset_allocation;


-- Completed on 2025-07-25 16:38:22 IST

--
-- PostgreSQL database dump complete
--


-- ===== End of Migration/seed_setup.sql =====

-- ===== Start of Migration/asset_level_migration.sql =====
-- Add asset level column
ALTER TABLE assets ADD COLUMN level TEXT NOT NULL DEFAULT 'secondary' CHECK (level IN ('primary', 'secondary', 'tertiary'));

-- Create index for level-based queries
CREATE INDEX IF NOT EXISTS idx_assets_level ON assets(level);

-- Update existing assets with appropriate levels (example)
-- UPDATE assets SET level = 'primary' WHERE name LIKE '%home%' OR name LIKE '%app%';
-- UPDATE assets SET level = 'tertiary' WHERE name LIKE '%post%' OR name LIKE '%success%'; 
-- ===== End of Migration/asset_level_migration.sql =====

-- ===== Start of Migration/audit_log_enhancement.sql =====
-- Enhance audit_logs table with additional fields
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id); 
-- ===== End of Migration/audit_log_enhancement.sql =====

-- ===== Start of backend/ad_server_migration.sql =====
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
-- ===== End of backend/ad_server_migration.sql =====

-- ===== Start of backend/bidding_system_migration.sql =====
-- Bidding System Migration
-- This migration adds bidding capabilities for LOBs competing for slots

-- Create bids table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bids_booking_id ON bids(booking_id);
CREATE INDEX IF NOT EXISTS idx_bids_lob ON bids(lob);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(bid_amount DESC);

-- Add bid_amount column to bookings table for tracking winning bids
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bid_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auction_status VARCHAR(50) DEFAULT 'none' CHECK (auction_status IN ('none', 'active', 'completed', 'cancelled'));

-- Create fairness tracking table
CREATE TABLE IF NOT EXISTS fairness_scores (
  id SERIAL PRIMARY KEY,
  lob VARCHAR(100) NOT NULL,
  asset_id INTEGER REFERENCES assets(id),
  score DECIMAL(10,4) NOT NULL,
  factors JSONB, -- Store individual fairness factors
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fairness tracking
CREATE INDEX IF NOT EXISTS idx_fairness_scores_lob ON fairness_scores(lob);
CREATE INDEX IF NOT EXISTS idx_fairness_scores_asset_id ON fairness_scores(asset_id);
CREATE INDEX IF NOT EXISTS idx_fairness_scores_calculated_at ON fairness_scores(calculated_at);

-- Create LOB allocation quotas table
CREATE TABLE IF NOT EXISTS lob_quotas (
  id SERIAL PRIMARY KEY,
  lob VARCHAR(100) NOT NULL UNIQUE,
  monthly_quota INTEGER DEFAULT 30, -- Days per month
  quarterly_quota INTEGER DEFAULT 90, -- Days per quarter
  strategic_weight DECIMAL(3,2) DEFAULT 1.0,
  revenue_multiplier DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default quotas for existing LOBs
INSERT INTO lob_quotas (lob, monthly_quota, quarterly_quota, strategic_weight, revenue_multiplier) VALUES
  ('Monetization', 45, 135, 1.5, 2.0),
  ('Pharmacy', 30, 90, 1.3, 1.5),
  ('Diagnostics', 25, 75, 1.2, 1.3),
  ('Insurance', 20, 60, 1.1, 1.2),
  ('Consult', 15, 45, 1.0, 1.0),
  ('Credit Card', 15, 45, 1.0, 1.0),
  ('Ask Apollo Circle', 10, 30, 0.9, 0.8)
ON CONFLICT (lob) DO NOTHING;

-- Create function to update fairness scores
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

-- Create view for current fairness status
CREATE OR REPLACE VIEW fairness_status AS
SELECT 
  lob,
  asset_id,
  score,
  factors,
  calculated_at,
  ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY score DESC) as rank
FROM fairness_scores
WHERE calculated_at >= NOW() - INTERVAL '1 day';

-- Create function to get LOB allocation summary
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
    COUNT(*)::INTEGER as total_days,
    lq.monthly_quota as quota_days,
    ROUND((COUNT(*)::DECIMAL / lq.monthly_quota) * 100, 2) as quota_percentage,
    COALESCE(bid_stats.bid_count, 0)::INTEGER as total_bids,
    COALESCE(bid_stats.total_amount, 0) as total_bid_amount
  FROM bookings b
  LEFT JOIN lob_quotas lq ON b.lob = lq.lob
  LEFT JOIN (
    SELECT 
      lob,
      COUNT(*) as bid_count,
      SUM(bid_amount) as total_amount
    FROM bids 
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY lob
  ) bid_stats ON b.lob = bid_stats.lob
  WHERE b.start_date >= p_start_date 
    AND b.end_date <= p_end_date
    AND b.is_deleted = false
  GROUP BY b.lob, lq.monthly_quota, bid_stats.bid_count, bid_stats.total_amount
  ORDER BY total_days DESC;
END;
$$ LANGUAGE plpgsql; 
-- ===== End of backend/bidding_system_migration.sql =====
