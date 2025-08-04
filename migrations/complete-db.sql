--
-- PostgreSQL database dump
--

-- Dumped from database version 13.21 (Postgres.app)
-- Dumped by pg_dump version 17.0

-- Started on 2025-08-02 15:59:47 IST

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
-- TOC entry 3587 (class 1262 OID 16412)
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

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 242 (class 1255 OID 16718)
-- Name: get_lob_allocation_summary(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_lob_allocation_summary(p_start_date date, p_end_date date) RETURNS TABLE(lob character varying, total_days integer, quota_days integer, quota_percentage numeric, total_bids integer, total_bid_amount numeric)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.get_lob_allocation_summary(p_start_date date, p_end_date date) OWNER TO postgres;

--
-- TOC entry 241 (class 1255 OID 16713)
-- Name: update_fairness_score(character varying, integer, numeric, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_fairness_score(p_lob character varying, p_asset_id integer, p_score numeric, p_factors jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO fairness_scores (lob, asset_id, score, factors)
  VALUES (p_lob, p_asset_id, p_score, p_factors)
  ON CONFLICT (lob, asset_id)
  DO UPDATE SET
    score = p_score,
    factors = p_factors,
    calculated_at = CURRENT_TIMESTAMP;
END;
$$;


ALTER FUNCTION public.update_fairness_score(p_lob character varying, p_asset_id integer, p_score numeric, p_factors jsonb) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 21128)
-- Name: ad_requests; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.ad_requests (
    id integer NOT NULL,
    asset_id integer,
    user_context jsonb,
    page_context jsonb,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ad_requests OWNER TO asset_allocation;

--
-- TOC entry 3590 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE ad_requests; Type: COMMENT; Schema: public; Owner: asset_allocation
--

COMMENT ON TABLE public.ad_requests IS 'Stores ad serving requests';


--
-- TOC entry 223 (class 1259 OID 21126)
-- Name: ad_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.ad_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ad_requests_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3591 (class 0 OID 0)
-- Dependencies: 223
-- Name: ad_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.ad_requests_id_seq OWNED BY public.ad_requests.id;


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
-- TOC entry 3592 (class 0 OID 0)
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
-- TOC entry 3593 (class 0 OID 0)
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
    level text DEFAULT 'secondary'::text NOT NULL,
    CONSTRAINT assets_level_check CHECK ((level = ANY (ARRAY['primary'::text, 'secondary'::text, 'tertiary'::text]))),
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
-- TOC entry 3594 (class 0 OID 0)
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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address inet,
    user_agent text
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
-- TOC entry 3595 (class 0 OID 0)
-- Dependencies: 206
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 213 (class 1259 OID 16644)
-- Name: bids; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.bids (
    id integer NOT NULL,
    booking_id integer,
    lob character varying(100) NOT NULL,
    bid_amount numeric(10,2) NOT NULL,
    max_bid numeric(10,2),
    bid_reason text,
    user_id integer,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bids_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'cancelled'::character varying, 'won'::character varying, 'lost'::character varying])::text[])))
);


ALTER TABLE public.bids OWNER TO asset_allocation;

--
-- TOC entry 212 (class 1259 OID 16642)
-- Name: bids_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.bids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bids_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3596 (class 0 OID 0)
-- Dependencies: 212
-- Name: bids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.bids_id_seq OWNED BY public.bids.id;


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
    bid_amount numeric(10,2) DEFAULT 0,
    auction_status character varying(50) DEFAULT 'none'::character varying,
    CONSTRAINT bookings_auction_status_check CHECK (((auction_status)::text = ANY ((ARRAY['none'::character varying, 'active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
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
-- TOC entry 3597 (class 0 OID 0)
-- Dependencies: 204
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- TOC entry 222 (class 1259 OID 21108)
-- Name: campaigns; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    advertiser_id integer,
    name character varying(255) NOT NULL,
    budget numeric(10,2),
    start_date date,
    end_date date,
    status character varying(50) DEFAULT 'draft'::character varying,
    targeting_criteria jsonb,
    goal_type character varying(50),
    goal_value numeric(10,2),
    pacing character varying(50) DEFAULT 'even'::character varying,
    pricing_model character varying(50) DEFAULT 'cpm'::character varying,
    frequency_cap integer,
    day_parting jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    organization_id integer,
    CONSTRAINT campaigns_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'paused'::character varying, 'completed'::character varying])::text[])))
);


ALTER TABLE public.campaigns OWNER TO asset_allocation;

--
-- TOC entry 3598 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE campaigns; Type: COMMENT; Schema: public; Owner: asset_allocation
--

COMMENT ON TABLE public.campaigns IS 'Stores advertising campaigns';


--
-- TOC entry 221 (class 1259 OID 21106)
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaigns_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3599 (class 0 OID 0)
-- Dependencies: 221
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- TOC entry 228 (class 1259 OID 21167)
-- Name: clicks; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.clicks (
    id integer NOT NULL,
    impression_id integer,
    user_id character varying(255),
    destination_url text,
    metadata jsonb,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clicks OWNER TO asset_allocation;

--
-- TOC entry 3600 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE clicks; Type: COMMENT; Schema: public; Owner: asset_allocation
--

COMMENT ON TABLE public.clicks IS 'Stores ad clicks';


--
-- TOC entry 227 (class 1259 OID 21165)
-- Name: clicks_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.clicks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clicks_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3601 (class 0 OID 0)
-- Dependencies: 227
-- Name: clicks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.clicks_id_seq OWNED BY public.clicks.id;


--
-- TOC entry 220 (class 1259 OID 21087)
-- Name: creatives; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.creatives (
    id integer NOT NULL,
    asset_id integer,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    content jsonb NOT NULL,
    dimensions jsonb,
    file_size integer,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    campaign_id integer,
    CONSTRAINT creatives_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT creatives_type_check CHECK (((type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'html5'::character varying, 'native'::character varying])::text[])))
);


ALTER TABLE public.creatives OWNER TO asset_allocation;

--
-- TOC entry 3602 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE creatives; Type: COMMENT; Schema: public; Owner: asset_allocation
--

COMMENT ON TABLE public.creatives IS 'Stores ad creatives for assets';


--
-- TOC entry 219 (class 1259 OID 21085)
-- Name: creatives_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.creatives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.creatives_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3603 (class 0 OID 0)
-- Dependencies: 219
-- Name: creatives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.creatives_id_seq OWNED BY public.creatives.id;


--
-- TOC entry 215 (class 1259 OID 16677)
-- Name: fairness_scores; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.fairness_scores (
    id integer NOT NULL,
    lob character varying(100) NOT NULL,
    asset_id integer,
    score numeric(10,4) NOT NULL,
    factors jsonb,
    calculated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.fairness_scores OWNER TO asset_allocation;

--
-- TOC entry 214 (class 1259 OID 16675)
-- Name: fairness_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.fairness_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fairness_scores_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3604 (class 0 OID 0)
-- Dependencies: 214
-- Name: fairness_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.fairness_scores_id_seq OWNED BY public.fairness_scores.id;


--
-- TOC entry 218 (class 1259 OID 16714)
-- Name: fairness_status; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.fairness_status AS
 SELECT fairness_scores.lob,
    fairness_scores.asset_id,
    fairness_scores.score,
    fairness_scores.factors,
    fairness_scores.calculated_at,
    row_number() OVER (PARTITION BY fairness_scores.asset_id ORDER BY fairness_scores.score DESC) AS rank
   FROM public.fairness_scores
  WHERE (fairness_scores.calculated_at >= (now() - '1 day'::interval));


ALTER VIEW public.fairness_status OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 21145)
-- Name: impressions; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.impressions (
    id integer NOT NULL,
    ad_request_id integer,
    creative_id integer,
    user_id character varying(255),
    metadata jsonb,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.impressions OWNER TO asset_allocation;

--
-- TOC entry 3606 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE impressions; Type: COMMENT; Schema: public; Owner: asset_allocation
--

COMMENT ON TABLE public.impressions IS 'Stores ad impressions';


--
-- TOC entry 225 (class 1259 OID 21143)
-- Name: impressions_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.impressions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.impressions_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3607 (class 0 OID 0)
-- Dependencies: 225
-- Name: impressions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.impressions_id_seq OWNED BY public.impressions.id;


--
-- TOC entry 217 (class 1259 OID 16699)
-- Name: lob_quotas; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.lob_quotas (
    id integer NOT NULL,
    lob character varying(100) NOT NULL,
    monthly_quota integer DEFAULT 30,
    quarterly_quota integer DEFAULT 90,
    strategic_weight numeric(3,2) DEFAULT 1.0,
    revenue_multiplier numeric(3,2) DEFAULT 1.0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.lob_quotas OWNER TO asset_allocation;

--
-- TOC entry 216 (class 1259 OID 16697)
-- Name: lob_quotas_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.lob_quotas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lob_quotas_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3608 (class 0 OID 0)
-- Dependencies: 216
-- Name: lob_quotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.lob_quotas_id_seq OWNED BY public.lob_quotas.id;


--
-- TOC entry 232 (class 1259 OID 21214)
-- Name: organizations; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    domain character varying(255),
    plan_type character varying(50) DEFAULT 'basic'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    max_campaigns integer DEFAULT 10,
    max_users integer DEFAULT 5,
    billing_email character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT organizations_plan_type_check CHECK (((plan_type)::text = ANY ((ARRAY['basic'::character varying, 'pro'::character varying, 'enterprise'::character varying])::text[]))),
    CONSTRAINT organizations_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.organizations OWNER TO asset_allocation;

--
-- TOC entry 231 (class 1259 OID 21212)
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3609 (class 0 OID 0)
-- Dependencies: 231
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- TOC entry 230 (class 1259 OID 21184)
-- Name: performance_metrics; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.performance_metrics (
    id integer NOT NULL,
    creative_id integer,
    date date NOT NULL,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    revenue numeric(10,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.performance_metrics OWNER TO asset_allocation;

--
-- TOC entry 3610 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE performance_metrics; Type: COMMENT; Schema: public; Owner: asset_allocation
--

COMMENT ON TABLE public.performance_metrics IS 'Stores daily performance metrics for creatives';


--
-- TOC entry 229 (class 1259 OID 21182)
-- Name: performance_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.performance_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.performance_metrics_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3611 (class 0 OID 0)
-- Dependencies: 229
-- Name: performance_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.performance_metrics_id_seq OWNED BY public.performance_metrics.id;


--
-- TOC entry 234 (class 1259 OID 21336)
-- Name: permissions; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    resource character varying(100) NOT NULL,
    action character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions OWNER TO asset_allocation;

--
-- TOC entry 233 (class 1259 OID 21334)
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3612 (class 0 OID 0)
-- Dependencies: 233
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- TOC entry 238 (class 1259 OID 21372)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer,
    permission_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO asset_allocation;

--
-- TOC entry 237 (class 1259 OID 21370)
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3613 (class 0 OID 0)
-- Dependencies: 237
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- TOC entry 236 (class 1259 OID 21351)
-- Name: roles; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    organization_id integer,
    is_system_role boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO asset_allocation;

--
-- TOC entry 235 (class 1259 OID 21349)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3614 (class 0 OID 0)
-- Dependencies: 235
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 240 (class 1259 OID 21393)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer,
    role_id integer,
    organization_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_roles OWNER TO asset_allocation;

--
-- TOC entry 239 (class 1259 OID 21391)
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: asset_allocation
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO asset_allocation;

--
-- TOC entry 3615 (class 0 OID 0)
-- Dependencies: 239
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- TOC entry 201 (class 1259 OID 16417)
-- Name: users; Type: TABLE; Schema: public; Owner: asset_allocation
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    organization_id integer
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
-- TOC entry 3616 (class 0 OID 0)
-- Dependencies: 200
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: asset_allocation
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3295 (class 2604 OID 21131)
-- Name: ad_requests id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.ad_requests ALTER COLUMN id SET DEFAULT nextval('public.ad_requests_id_seq'::regclass);


--
-- TOC entry 3272 (class 2604 OID 16529)
-- Name: approvals id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.approvals ALTER COLUMN id SET DEFAULT nextval('public.approvals_id_seq'::regclass);


--
-- TOC entry 3269 (class 2604 OID 16495)
-- Name: asset_metrics id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.asset_metrics ALTER COLUMN id SET DEFAULT nextval('public.asset_metrics_id_seq'::regclass);


--
-- TOC entry 3254 (class 2604 OID 16435)
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- TOC entry 3267 (class 2604 OID 16469)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 3274 (class 2604 OID 16647)
-- Name: bids id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bids ALTER COLUMN id SET DEFAULT nextval('public.bids_id_seq'::regclass);


--
-- TOC entry 3261 (class 2604 OID 16449)
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- TOC entry 3291 (class 2604 OID 21111)
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- TOC entry 3299 (class 2604 OID 21170)
-- Name: clicks id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.clicks ALTER COLUMN id SET DEFAULT nextval('public.clicks_id_seq'::regclass);


--
-- TOC entry 3287 (class 2604 OID 21090)
-- Name: creatives id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.creatives ALTER COLUMN id SET DEFAULT nextval('public.creatives_id_seq'::regclass);


--
-- TOC entry 3278 (class 2604 OID 16680)
-- Name: fairness_scores id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.fairness_scores ALTER COLUMN id SET DEFAULT nextval('public.fairness_scores_id_seq'::regclass);


--
-- TOC entry 3297 (class 2604 OID 21148)
-- Name: impressions id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.impressions ALTER COLUMN id SET DEFAULT nextval('public.impressions_id_seq'::regclass);


--
-- TOC entry 3280 (class 2604 OID 16702)
-- Name: lob_quotas id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.lob_quotas ALTER COLUMN id SET DEFAULT nextval('public.lob_quotas_id_seq'::regclass);


--
-- TOC entry 3307 (class 2604 OID 21217)
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- TOC entry 3301 (class 2604 OID 21187)
-- Name: performance_metrics id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.performance_metrics ALTER COLUMN id SET DEFAULT nextval('public.performance_metrics_id_seq'::regclass);


--
-- TOC entry 3314 (class 2604 OID 21339)
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- TOC entry 3321 (class 2604 OID 21375)
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- TOC entry 3317 (class 2604 OID 21354)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3323 (class 2604 OID 21396)
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- TOC entry 3252 (class 2604 OID 16420)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3385 (class 2606 OID 21137)
-- Name: ad_requests ad_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.ad_requests
    ADD CONSTRAINT ad_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 3356 (class 2606 OID 16535)
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- TOC entry 3352 (class 2606 OID 16504)
-- Name: asset_metrics asset_metrics_asset_id_lob_date_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.asset_metrics
    ADD CONSTRAINT asset_metrics_asset_id_lob_date_key UNIQUE (asset_id, lob, date);


--
-- TOC entry 3354 (class 2606 OID 16502)
-- Name: asset_metrics asset_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.asset_metrics
    ADD CONSTRAINT asset_metrics_pkey PRIMARY KEY (id);


--
-- TOC entry 3340 (class 2606 OID 16443)
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- TOC entry 3346 (class 2606 OID 16475)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3359 (class 2606 OID 16656)
-- Name: bids bids_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_pkey PRIMARY KEY (id);


--
-- TOC entry 3343 (class 2606 OID 16453)
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- TOC entry 3381 (class 2606 OID 21120)
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- TOC entry 3393 (class 2606 OID 21176)
-- Name: clicks clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.clicks
    ADD CONSTRAINT clicks_pkey PRIMARY KEY (id);


--
-- TOC entry 3377 (class 2606 OID 21100)
-- Name: creatives creatives_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.creatives
    ADD CONSTRAINT creatives_pkey PRIMARY KEY (id);


--
-- TOC entry 3366 (class 2606 OID 16686)
-- Name: fairness_scores fairness_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.fairness_scores
    ADD CONSTRAINT fairness_scores_pkey PRIMARY KEY (id);


--
-- TOC entry 3391 (class 2606 OID 21154)
-- Name: impressions impressions_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.impressions
    ADD CONSTRAINT impressions_pkey PRIMARY KEY (id);


--
-- TOC entry 3373 (class 2606 OID 16712)
-- Name: lob_quotas lob_quotas_lob_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.lob_quotas
    ADD CONSTRAINT lob_quotas_lob_key UNIQUE (lob);


--
-- TOC entry 3375 (class 2606 OID 16710)
-- Name: lob_quotas lob_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.lob_quotas
    ADD CONSTRAINT lob_quotas_pkey PRIMARY KEY (id);


--
-- TOC entry 3400 (class 2606 OID 21232)
-- Name: organizations organizations_domain_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_domain_key UNIQUE (domain);


--
-- TOC entry 3402 (class 2606 OID 21230)
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- TOC entry 3396 (class 2606 OID 21196)
-- Name: performance_metrics performance_metrics_creative_id_date_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_creative_id_date_key UNIQUE (creative_id, date);


--
-- TOC entry 3398 (class 2606 OID 21194)
-- Name: performance_metrics performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_pkey PRIMARY KEY (id);


--
-- TOC entry 3405 (class 2606 OID 21348)
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- TOC entry 3407 (class 2606 OID 21346)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3416 (class 2606 OID 21378)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3418 (class 2606 OID 21380)
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- TOC entry 3410 (class 2606 OID 21364)
-- Name: roles roles_name_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_organization_id_key UNIQUE (name, organization_id);


--
-- TOC entry 3412 (class 2606 OID 21362)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3371 (class 2606 OID 16693)
-- Name: fairness_scores uniq_lob_asset; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.fairness_scores
    ADD CONSTRAINT uniq_lob_asset UNIQUE (lob, asset_id);


--
-- TOC entry 3423 (class 2606 OID 21399)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3425 (class 2606 OID 21401)
-- Name: user_roles user_roles_user_id_role_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_organization_id_key UNIQUE (user_id, role_id, organization_id);


--
-- TOC entry 3336 (class 2606 OID 16429)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3338 (class 2606 OID 16427)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3386 (class 1259 OID 21206)
-- Name: idx_ad_requests_asset_id; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_ad_requests_asset_id ON public.ad_requests USING btree (asset_id);


--
-- TOC entry 3387 (class 1259 OID 21207)
-- Name: idx_ad_requests_timestamp; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_ad_requests_timestamp ON public.ad_requests USING btree ("timestamp");


--
-- TOC entry 3357 (class 1259 OID 16546)
-- Name: idx_approvals_booking; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_approvals_booking ON public.approvals USING btree (booking_id);


--
-- TOC entry 3341 (class 1259 OID 16573)
-- Name: idx_assets_level; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_assets_level ON public.assets USING btree (level);


--
-- TOC entry 3347 (class 1259 OID 16574)
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- TOC entry 3348 (class 1259 OID 16576)
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- TOC entry 3349 (class 1259 OID 16575)
-- Name: idx_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- TOC entry 3350 (class 1259 OID 16577)
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- TOC entry 3360 (class 1259 OID 16671)
-- Name: idx_bids_amount; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_bids_amount ON public.bids USING btree (bid_amount DESC);


--
-- TOC entry 3361 (class 1259 OID 16667)
-- Name: idx_bids_booking_id; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_bids_booking_id ON public.bids USING btree (booking_id);


--
-- TOC entry 3362 (class 1259 OID 16668)
-- Name: idx_bids_lob; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_bids_lob ON public.bids USING btree (lob);


--
-- TOC entry 3363 (class 1259 OID 16669)
-- Name: idx_bids_status; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_bids_status ON public.bids USING btree (status);


--
-- TOC entry 3364 (class 1259 OID 16670)
-- Name: idx_bids_user_id; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_bids_user_id ON public.bids USING btree (user_id);


--
-- TOC entry 3344 (class 1259 OID 16489)
-- Name: idx_bookings_asset_lob_dates; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_bookings_asset_lob_dates ON public.bookings USING btree (asset_id, lob, start_date, end_date);


--
-- TOC entry 3382 (class 1259 OID 21204)
-- Name: idx_campaigns_advertiser_id; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_campaigns_advertiser_id ON public.campaigns USING btree (advertiser_id);


--
-- TOC entry 3383 (class 1259 OID 21205)
-- Name: idx_campaigns_status; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_campaigns_status ON public.campaigns USING btree (status);


--
-- TOC entry 3378 (class 1259 OID 21202)
-- Name: idx_creatives_asset_id; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_creatives_asset_id ON public.creatives USING btree (asset_id);


--
-- TOC entry 3379 (class 1259 OID 21203)
-- Name: idx_creatives_status; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_creatives_status ON public.creatives USING btree (status);


--
-- TOC entry 3367 (class 1259 OID 16695)
-- Name: idx_fairness_scores_asset_id; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_fairness_scores_asset_id ON public.fairness_scores USING btree (asset_id);


--
-- TOC entry 3368 (class 1259 OID 16696)
-- Name: idx_fairness_scores_calculated_at; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_fairness_scores_calculated_at ON public.fairness_scores USING btree (calculated_at);


--
-- TOC entry 3369 (class 1259 OID 16694)
-- Name: idx_fairness_scores_lob; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_fairness_scores_lob ON public.fairness_scores USING btree (lob);


--
-- TOC entry 3388 (class 1259 OID 21208)
-- Name: idx_impressions_creative_id; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_impressions_creative_id ON public.impressions USING btree (creative_id);


--
-- TOC entry 3389 (class 1259 OID 21209)
-- Name: idx_impressions_timestamp; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_impressions_timestamp ON public.impressions USING btree ("timestamp");


--
-- TOC entry 3394 (class 1259 OID 21210)
-- Name: idx_performance_metrics_creative_date; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_performance_metrics_creative_date ON public.performance_metrics USING btree (creative_id, date);


--
-- TOC entry 3403 (class 1259 OID 21417)
-- Name: idx_permissions_resource_action; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_permissions_resource_action ON public.permissions USING btree (resource, action);


--
-- TOC entry 3413 (class 1259 OID 21420)
-- Name: idx_role_permissions_permission; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_role_permissions_permission ON public.role_permissions USING btree (permission_id);


--
-- TOC entry 3414 (class 1259 OID 21419)
-- Name: idx_role_permissions_role; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_role_permissions_role ON public.role_permissions USING btree (role_id);


--
-- TOC entry 3408 (class 1259 OID 21418)
-- Name: idx_roles_organization; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_roles_organization ON public.roles USING btree (organization_id);


--
-- TOC entry 3419 (class 1259 OID 21423)
-- Name: idx_user_roles_organization; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_user_roles_organization ON public.user_roles USING btree (organization_id);


--
-- TOC entry 3420 (class 1259 OID 21422)
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- TOC entry 3421 (class 1259 OID 21421)
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: asset_allocation
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- TOC entry 3440 (class 2606 OID 21138)
-- Name: ad_requests ad_requests_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.ad_requests
    ADD CONSTRAINT ad_requests_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- TOC entry 3431 (class 2606 OID 16536)
-- Name: approvals approvals_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- TOC entry 3432 (class 2606 OID 16541)
-- Name: approvals approvals_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- TOC entry 3430 (class 2606 OID 16505)
-- Name: asset_metrics asset_metrics_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.asset_metrics
    ADD CONSTRAINT asset_metrics_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- TOC entry 3429 (class 2606 OID 16476)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3433 (class 2606 OID 16657)
-- Name: bids bids_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- TOC entry 3434 (class 2606 OID 16662)
-- Name: bids bids_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3427 (class 2606 OID 16454)
-- Name: bookings bookings_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- TOC entry 3428 (class 2606 OID 16459)
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3438 (class 2606 OID 21121)
-- Name: campaigns campaigns_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3439 (class 2606 OID 21238)
-- Name: campaigns campaigns_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 3443 (class 2606 OID 21177)
-- Name: clicks clicks_impression_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.clicks
    ADD CONSTRAINT clicks_impression_id_fkey FOREIGN KEY (impression_id) REFERENCES public.impressions(id) ON DELETE CASCADE;


--
-- TOC entry 3436 (class 2606 OID 21101)
-- Name: creatives creatives_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.creatives
    ADD CONSTRAINT creatives_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- TOC entry 3437 (class 2606 OID 21424)
-- Name: creatives creatives_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.creatives
    ADD CONSTRAINT creatives_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 3435 (class 2606 OID 16687)
-- Name: fairness_scores fairness_scores_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.fairness_scores
    ADD CONSTRAINT fairness_scores_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- TOC entry 3441 (class 2606 OID 21155)
-- Name: impressions impressions_ad_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.impressions
    ADD CONSTRAINT impressions_ad_request_id_fkey FOREIGN KEY (ad_request_id) REFERENCES public.ad_requests(id) ON DELETE CASCADE;


--
-- TOC entry 3442 (class 2606 OID 21160)
-- Name: impressions impressions_creative_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.impressions
    ADD CONSTRAINT impressions_creative_id_fkey FOREIGN KEY (creative_id) REFERENCES public.creatives(id) ON DELETE CASCADE;


--
-- TOC entry 3444 (class 2606 OID 21197)
-- Name: performance_metrics performance_metrics_creative_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_creative_id_fkey FOREIGN KEY (creative_id) REFERENCES public.creatives(id) ON DELETE CASCADE;


--
-- TOC entry 3446 (class 2606 OID 21386)
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 3447 (class 2606 OID 21381)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3445 (class 2606 OID 21365)
-- Name: roles roles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 3448 (class 2606 OID 21412)
-- Name: user_roles user_roles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 3449 (class 2606 OID 21407)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3450 (class 2606 OID 21402)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3426 (class 2606 OID 21233)
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asset_allocation
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 3588 (class 0 OID 0)
-- Dependencies: 3587
-- Name: DATABASE asset_allocation; Type: ACL; Schema: -; Owner: postgres
--

GRANT CONNECT ON DATABASE asset_allocation TO asset_allocation;


--
-- TOC entry 3589 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;
GRANT USAGE ON SCHEMA public TO asset_allocation;


--
-- TOC entry 3605 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE fairness_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.fairness_status TO asset_allocation;


--
-- TOC entry 1847 (class 826 OID 16414)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO asset_allocation;


-- Completed on 2025-08-02 15:59:47 IST

--
-- PostgreSQL database dump complete
--

