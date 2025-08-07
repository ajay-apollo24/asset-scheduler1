# Development

## API
The backend exposes REST endpoints for campaigns, assets, and analytics. Example:
```http
GET /api/campaigns
```

## Testing
Install dependencies and run the backend test suite:
```bash
cd backend
npm install
npm test
```

## Configuration
Key configuration files live in `backend/config`:
- `db.js` – database connection
- `ruleConfig.json` – booking and allocation rules
- `biddingConfig.json` – bidding limits
- `enhancedFairnessConfig.json` – fairness parameters

## Scripts
Utility scripts are in `scripts/`:
- `check-permissions.js`, `check-user-role.js`, `debug-login.js`, `clear-rate-limits.js`
- `run-migrations.sh`, `run-audit-migration.sh`

For sample data, run the unified seed script:
```bash
node backend/scripts/seeds/unifiedSeedScript.js
```

## Publishing documentation
You can publish these markdown files using [MkDocs](https://www.mkdocs.org/):
```bash
pip install mkdocs mkdocs-material
mkdocs new docs-site
cp -r docs/* docs-site/docs/
cd docs-site
mkdocs build
# deploy the generated "site" directory to docs.adserver.ai
```
