# Ad Server Test Suite

This sub-project provides tools for stress testing and validating the Ad Server module.

## Components

### Demo Website
* Located in `demo-website/`.
* Simple HTML page that requests ads via `/api/ads/request` and reports impressions and clicks.
* Form fields allow overriding `page_context` and `user_context` so targeting rules can be exercised.
* **Note**: Make sure the backend server is running on port 6510 before testing.

### Creative and Campaign Simulator
* `scripts/sample-data.js` can create mock campaigns and creatives through the existing API.
* Run it with Node to populate sample data for load tests.
* **Note**: Requires authentication token. Set `API_TOKEN` environment variable.

### Traffic Generator
* `scripts/traffic-generator.js` issues many ad requests and tracks latency and failures.
* Metrics correspond to those defined in the main README:
  - `ad_serve_latency_p95`
  - `fill_rate`
  - `error_rate`
* Use it to verify alerting rules described in the documentation.

## Setup
1. Run `npm install` inside this folder to install dependencies.
2. Start the backend server from the repository root (should be running on port 6510).
3. Ensure you have sample creatives in the database (run the backend's sample data scripts if needed).
4. Open `demo-website/index.html` in a browser or run the scripts from the command line.

## Testing
1. **Demo Website**: Open `demo-website/index.html` in a browser and click "Request Ad"
2. **Traffic Generator**: Run `node scripts/traffic-generator.js` to test performance
3. **Sample Data**: Run `API_TOKEN=your_token node scripts/sample-data.js` to create test campaigns

## Troubleshooting
- If you get "No ad available", check that there are approved creatives in the database
- If you get validation errors, ensure the user agent is at least 10 characters long
- If you get fraud detection errors, use public IP addresses (not 192.168.x.x or 127.0.0.1)
