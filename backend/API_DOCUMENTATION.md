# 📚 Ad Server API Documentation

## Overview

The Ad Server API provides comprehensive endpoints for ad serving, creative management, campaign management, and analytics. This API follows RESTful principles and uses JSON for data exchange.

**Base URL:** `https://api.example.com/v1`

---

## 🔐 Authentication

All endpoints (except ad serving) require authentication using JWT tokens.

```http
Authorization: Bearer <your-jwt-token>
```

---

## 📊 Ad Serving Endpoints

### **Serve Ad**
Serves an ad for a specific asset based on user and page context.

```http
POST /api/ads/request
```

**Request Body:**
```json
{
  "asset_id": 123,
  "user_context": {
    "ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "location": {
      "country": "US",
      "region": "CA",
      "city": "San Francisco"
    },
    "demographics": {
      "age": 28,
      "gender": "male"
    },
    "interests": ["technology", "sports"],
    "device": {
      "type": "desktop",
      "os": "Windows",
      "browser": "Chrome"
    }
  },
  "page_context": {
    "url": "https://example.com/article",
    "referrer": "https://google.com",
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "keywords": ["health", "fitness"],
    "category": "healthcare"
  }
}
```

**Response:**
```json
{
  "ad_id": "ad_12345",
  "creative": {
    "id": 456,
    "type": "image",
    "content": {
      "image_url": "https://cdn.example.com/ads/creative_456.jpg",
      "click_url": "https://example.com/landing",
      "alt_text": "Amazing Product Offer"
    },
    "dimensions": {
      "width": 728,
      "height": 90
    }
  },
  "tracking": {
    "impression_url": "https://tracking.example.com/impression/ad_12345?creative=456",
    "click_url": "https://tracking.example.com/click/ad_12345?creative=456",
    "viewability_url": "https://tracking.example.com/viewability/ad_12345?creative=456"
  },
  "bid": {
    "bid_amount": 2.50,
    "currency": "USD",
    "pricing_model": "cpm"
  },
  "metadata": {
    "campaign_id": "camp_789",
    "asset_id": 123,
    "expires_at": "2024-01-15T10:30:00Z"
  }
}
```

### **Track Impression**
Tracks an ad impression and returns a 1x1 pixel.

```http
POST /api/ads/impression
```

**Request Body:**
```json
{
  "ad_id": "ad_12345",
  "creative_id": 456,
  "user_id": "user_789",
  "metadata": {
    "viewport_visible": true,
    "time_on_screen": 2.5,
    "scroll_depth": 75
  }
}
```

**Response:** 1x1 transparent GIF pixel

### **Track Click**
Tracks an ad click and redirects to the destination URL.

```http
POST /api/ads/click
```

**Request Body:**
```json
{
  "ad_id": "ad_12345",
  "creative_id": 456,
  "user_id": "user_789",
  "metadata": {
    "click_position": { "x": 150, "y": 45 },
    "time_to_click": 1.2
  }
}
```

**Response:** HTTP 302 redirect to destination URL

---

## 🎨 Creative Management Endpoints

### **Create Creative**
Creates a new ad creative.

```http
POST /api/creatives
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "asset_id": 123,
  "name": "Summer Sale Banner",
  "type": "image",
  "content": {
    "image_url": "https://cdn.example.com/ads/summer_sale.jpg",
    "click_url": "https://example.com/summer-sale",
    "alt_text": "Summer Sale - Up to 50% Off"
  },
  "dimensions": {
    "width": 728,
    "height": 90
  },
  "file_size": 45000,
  "status": "draft"
}
```

**Response:**
```json
{
  "id": 456,
  "asset_id": 123,
  "name": "Summer Sale Banner",
  "type": "image",
  "content": {
    "image_url": "https://cdn.example.com/ads/summer_sale.jpg",
    "click_url": "https://example.com/summer-sale",
    "alt_text": "Summer Sale - Up to 50% Off"
  },
  "dimensions": {
    "width": 728,
    "height": 90
  },
  "file_size": 45000,
  "status": "draft",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

### **Get Creatives**
Retrieves creatives with optional filtering.

```http
GET /api/creatives?asset_id=123&status=approved&type=image
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 456,
    "asset_id": 123,
    "name": "Summer Sale Banner",
    "type": "image",
    "status": "approved",
    "created_at": "2024-01-15T10:00:00Z"
  },
  {
    "id": 457,
    "asset_id": 123,
    "name": "Winter Collection",
    "type": "video",
    "status": "pending",
    "created_at": "2024-01-15T11:00:00Z"
  }
]
```

### **Get Creative by ID**
Retrieves a specific creative.

```http
GET /api/creatives/456
Authorization: Bearer <token>
```

### **Update Creative**
Updates an existing creative.

```http
PUT /api/creatives/456
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "approved",
  "content": {
    "image_url": "https://cdn.example.com/ads/summer_sale_v2.jpg",
    "click_url": "https://example.com/summer-sale-v2"
  }
}
```

### **Get Creative Performance**
Retrieves performance metrics for a creative.

```http
GET /api/creatives/456/performance?timeRange=7d
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_impressions": 15000,
  "total_clicks": 225,
  "total_revenue": 37.50,
  "ctr": 1.5
}
```

---

## 📈 Analytics Endpoints

### **Get Ad Analytics**
Retrieves analytics data for ads.

```http
GET /api/ads/analytics?asset_id=123&timeRange=24h
Authorization: Bearer <token>
```

**Response:**
```json
{
  "asset_id": 123,
  "timeRange": "24h",
  "request_stats": {
    "total_requests": 1000,
    "unique_users": 500,
    "fill_rate": 0.92,
    "avg_response_time": 45
  },
  "creative_performance": [
    {
      "creative_id": 456,
      "name": "Summer Sale Banner",
      "type": "image",
      "total_impressions": 5000,
      "total_clicks": 75,
      "total_revenue": 12.50,
      "ctr": 1.5
    }
  ]
}
```

### **Get Real-time Analytics**
Retrieves real-time analytics dashboard data.

```http
GET /api/ads/analytics/realtime
Authorization: Bearer <token>
```

**Response:**
```json
{
  "impressions_per_minute": 1250,
  "revenue_per_hour": 45.50,
  "fill_rate": 0.92,
  "avg_response_time": 45,
  "active_campaigns": 15,
  "total_assets": 25
}
```

---

## 🎯 Campaign Management Endpoints

### **Create Campaign**
Creates a new advertising campaign.

```http
POST /api/campaigns
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "advertiser_id": 789,
  "name": "Summer Sale 2024",
  "budget": 5000.00,
  "start_date": "2024-06-01",
  "end_date": "2024-08-31",
  "status": "draft",
  "targeting_criteria": {
    "geolocation": ["US", "CA"],
    "demographics": {
      "age_range": [18, 45],
      "gender": ["male", "female"]
    },
    "interests": ["fashion", "shopping"],
    "devices": ["desktop", "mobile"]
  }
}
```

### **Get Campaign Performance**
Retrieves performance metrics for a campaign.

```http
GET /api/campaigns/123/performance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "impressions": 100000,
  "clicks": 1500,
  "ctr": 0.015,
  "spend": 250.00,
  "revenue": 500.00,
  "roas": 2.0
}
```

---

## 🔧 Error Handling

All endpoints return appropriate HTTP status codes and error messages.

### **Error Response Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      "asset_id is required",
      "user_context is required"
    ]
  }
}
```

### **Common Error Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource already exists)
- `422` - Unprocessable Entity (business rule violations)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## 📊 Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **Ad Serving:** 1000 requests per minute per IP
- **Impression Tracking:** 5000 requests per minute per IP
- **Click Tracking:** 100 requests per minute per IP
- **Analytics:** 100 requests per minute per user
- **Creative Management:** 60 requests per minute per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642234567
```

---

## 🔒 Security Considerations

### **Data Privacy:**
- All user data is anonymized in analytics
- PII is never logged or stored
- GDPR compliance built-in

### **Fraud Prevention:**
- Bot detection and blocking
- Click fraud prevention
- Geographic fraud patterns detection
- Device fingerprinting

### **API Security:**
- JWT token authentication
- Rate limiting per client
- Input validation and sanitization
- CORS configuration
- HTTPS enforcement

---

## 📝 SDKs and Libraries

### **JavaScript SDK:**
```javascript
import { AdServerClient } from '@example/ad-server-sdk';

const client = new AdServerClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com/v1'
});

// Serve an ad
const ad = await client.serveAd({
  asset_id: 123,
  user_context: { /* ... */ },
  page_context: { /* ... */ }
});

// Track impression
await client.trackImpression({
  ad_id: ad.ad_id,
  creative_id: ad.creative.id
});
```

### **Python SDK:**
```python
from ad_server_sdk import AdServerClient

client = AdServerClient(
    api_key="your-api-key",
    base_url="https://api.example.com/v1"
)

# Serve an ad
ad = client.serve_ad(
    asset_id=123,
    user_context={...},
    page_context={...}
)
```

---

## 🚀 Getting Started

1. **Get API Key:** Contact support to get your API key
2. **Set up Authentication:** Include your API key in all requests
3. **Create Assets:** Set up your ad inventory
4. **Upload Creatives:** Add your ad creatives
5. **Create Campaigns:** Set up your advertising campaigns
6. **Start Serving:** Begin serving ads through the API

For more information, visit our [Developer Portal](https://developers.example.com) or contact support at api-support@example.com. 