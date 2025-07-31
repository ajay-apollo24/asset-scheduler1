# Ad Server Test Suite

This document describes the tools provided in `ad-server-test-suite/`.

## Demo Website
The demo website (`demo-website/index.html`) displays ads by calling `/api/ads/request` on the running backend. It accepts JSON input for `user_context` and `page_context` to test targeting rules. Impressions are automatically reported using `/api/ads/impression`.

## Creative and Campaign Simulator
`scripts/sample-data.js` generates sample campaigns and creatives through the API. Use the environment variables `API_BASE` and `API_TOKEN` to point to the backend and provide authentication.

## Traffic Generator
`scripts/traffic-generator.js` issues repeated ad requests and reports statistics:
- number of successes and failures
- 95th percentile response latency

These results map to metrics such as `ad_serve_latency_p95`, `fill_rate` and `error_rate` defined in the main README.
