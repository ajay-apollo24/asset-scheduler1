# Ad Server Test Suite

This sub-project provides tools for stress testing and validating the Ad Server module.

## Components

### Demo Website
* Located in `demo-website/`.
* Simple HTML page that requests ads via `/api/ads/request` and reports impressions and clicks.
* Form fields allow overriding `page_context` and `user_context` so targeting rules can be exercised.

### Creative and Campaign Simulator
* `scripts/sample-data.js` can create mock campaigns and creatives through the existing API.
* Run it with Node to populate sample data for load tests.

### Traffic Generator
* `scripts/traffic-generator.js` issues many ad requests and tracks latency and failures.
* Metrics correspond to those defined in the main README:
  - `ad_serve_latency_p95`
  - `fill_rate`
  - `error_rate`
* Use it to verify alerting rules described in the documentation.

## Setup
1. Run `npm install` inside this folder to install dependencies.
2. Start the backend server from the repository root.
3. Open `demo-website/index.html` in a browser or run the scripts from the command line.
