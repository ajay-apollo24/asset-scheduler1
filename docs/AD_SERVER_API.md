# Ad Server API & Functional Documentation

This document provides a detailed overview of the Ad Server module included in this repository. It describes the available API endpoints, data models, and functional behavior.

---

## Overview

The Ad Server module handles real-time ad serving, creative management, campaign tracking, and analytics. It exposes RESTful endpoints under the `/api` namespace and relies on JWT authentication for all management operations. Ad serving endpoints can be accessed publicly.

## Base URL

All examples below assume the server is running locally.

```
http://localhost:5000
```

---

## Authentication

Management endpoints require a valid JWT token. Include the token in the `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Endpoints

### Ad Serving

- `POST /api/ads/request` – Serve an ad for a specified asset.
- `POST /api/ads/impression` – Track an ad impression.
- `POST /api/ads/click` – Track an ad click and redirect the user.

### Creative Management

- `POST /api/creatives` – Create a new creative (requires auth).
- `GET  /api/creatives` – List all creatives.
- `GET  /api/creatives/:id` – Retrieve a creative by ID.
- `PUT  /api/creatives/:id` – Update a creative.
- `GET  /api/creatives/:id/performance` – Retrieve performance metrics.

### Campaign Management

- `POST /api/campaigns` – Create a new campaign.
- `GET  /api/campaigns/:id/performance` – Get campaign performance metrics.

### Analytics

- `GET /api/ads/analytics` – Historical analytics for ads.
- `GET /api/ads/analytics/realtime` – Real-time analytics dashboard.

### Real-Time Bidding (RTB)

- `POST /api/ads/rtb/request` – Start an RTB auction.
- `POST /api/ads/rtb/bid` – Submit a bid to an active auction.
- `GET  /api/ads/rtb/auction` – View auction results.

---

## Request & Response Examples

### Serve Ad

```
POST /api/ads/request
Content-Type: application/json

{
  "asset_id": 1,
  "user_context": {
    "ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0",
    "location": { "country": "US" }
  },
  "page_context": {
    "url": "https://example.com",
    "viewport": { "width": 1920, "height": 1080 }
  }
}
```

**Response**

```json
{
  "ad_id": "ad_12345",
  "creative": {
    "id": 10,
    "type": "image",
    "content": {
      "image_url": "https://cdn.example.com/ad.jpg",
      "click_url": "https://example.com/landing"
    },
    "dimensions": { "width": 728, "height": 90 }
  },
  "tracking": {
    "impression_url": "https://tracking.example.com/impression/ad_12345",
    "click_url": "https://tracking.example.com/click/ad_12345"
  }
}
```

### Track Impression

```
POST /api/ads/impression
Content-Type: application/json

{
  "ad_id": "ad_12345",
  "creative_id": 10,
  "user_id": "user_789"
}
```

### Track Click

```
POST /api/ads/click
Content-Type: application/json

{
  "ad_id": "ad_12345",
  "creative_id": 10,
  "user_id": "user_789"
}
```

### Create Creative

```
POST /api/creatives
Authorization: Bearer <token>
Content-Type: application/json

{
  "asset_id": 1,
  "name": "Summer Sale",
  "type": "image",
  "content": {
    "image_url": "https://cdn.example.com/sale.jpg",
    "click_url": "https://example.com/sale"
  },
  "dimensions": { "width": 728, "height": 90 }
}
```

---

## Data Models

### Creative

| Field       | Type    | Description                      |
|-------------|---------|----------------------------------|
| id          | integer | Primary key                      |
| asset_id    | integer | Related asset                    |
| name        | string  | Creative name                    |
| type        | string  | `image`, `video`, etc.           |
| content     | json    | Creative content (URL, markup)   |
| dimensions  | json    | Width and height                 |
| status      | string  | `draft`, `approved`, `archived`  |
| created_at  | date    | Creation timestamp               |
| updated_at  | date    | Last update timestamp            |

### Campaign

| Field       | Type    | Description                      |
|-------------|---------|----------------------------------|
| id          | integer | Primary key                      |
| advertiser_id | integer | Owning advertiser               |
| name        | string  | Campaign name                    |
| budget      | number  | Total budget                     |
| start_date  | date    | Start date                       |
| end_date    | date    | End date                         |
| status      | string  | `draft`, `active`, `paused`      |

### AdRequest

Tracks each ad request and the creative served.

| Field      | Type    | Description                |
|------------|---------|----------------------------|
| id         | integer | Primary key                |
| asset_id   | integer | Asset requested            |
| creative_id | integer | Creative served           |
| user_context | json  | User information           |
| page_context | json  | Page information           |
| timestamp  | date    | Request time               |

---

## Functional Behavior

1. **Creative Approval** – Creatives start in `draft` status. Only approved creatives are eligible for serving.
2. **Ad Serving** – When `/api/ads/request` is called, the server selects the best creative for the asset using targeting rules and optional RTB logic.
3. **Tracking** – Impressions and clicks are recorded via dedicated endpoints. Each request is logged for analytics and billing.
4. **Campaign Performance** – Campaign endpoints provide aggregated stats such as impressions, clicks, and spend.
5. **Analytics** – Real-time and historical analytics endpoints return performance metrics for dashboards or reports.
6. **Rate Limiting** – The server enforces rate limits on ad requests, impressions, and clicks to prevent abuse.
7. **Authentication** – Management APIs require a JWT. Token validation is handled by middleware in the shared module.

---

## Further Reading

For roadmap and implementation details see:
- `backend/QUICK_START_GUIDE.md`
- `backend/REFACTOR_SUMMARY.md`
- `backend/MODULAR_ARCHITECTURE.md`

