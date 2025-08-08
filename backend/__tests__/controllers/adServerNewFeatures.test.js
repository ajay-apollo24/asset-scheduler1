const request = require('supertest');

describe('Ad Server - New Features (Integration)', () => {
  let authToken;

  beforeAll(async () => {
    await global.testUtils.waitForServer();
    const testUser = await global.testUtils.createTestUser();
    authToken = `Bearer ${global.testUtils.generateToken({
      id: testUser.id || testUser.user_id || 1,
      email: testUser.email || 'test@example.com',
      organization_id: testUser.organization_id || 1,
      roles: ['admin']
    })}`;
  });

  afterAll(async () => {
    await global.testUtils.cleanup();
  });

  it('POST /api/ad-server/targeting/preview should return eligibility score and signals', async () => {
    const response = await request(global.testUtils.baseURL)
      .post('/api/ad-server/targeting/preview')
      .set('Authorization', authToken)
      .send({
        page_context: { url: 'https://example.com/test', keywords: ['sale','pharmacy'] },
        user_context: { user_id: 'u1' },
        store_context: { store_id: 101, section: 'dairy' }
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('eligibility_score');
    expect(response.body).toHaveProperty('contextual');
    expect(response.body).toHaveProperty('audience');
    expect(response.body).toHaveProperty('geo');
  });

  it('GET /api/ad-server/budget/123/status should return budget pacing status', async () => {
    const response = await request(global.testUtils.baseURL)
      .get('/api/ad-server/budget/123/status')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('campaign_id', '123');
    expect(response.body).toHaveProperty('pacing_status');
  });

  it('POST /api/ad-server/yield/apply-floor should return adjusted bid', async () => {
    const response = await request(global.testUtils.baseURL)
      .post('/api/ad-server/yield/apply-floor')
      .set('Authorization', authToken)
      .send({ bid: 0.2, asset_id: 999 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('adjusted_bid');
    expect(typeof response.body.adjusted_bid).toBe('number');
  });

  it('GET /api/ad-server/attribution/status should return pipeline status', async () => {
    const response = await request(global.testUtils.baseURL)
      .get('/api/ad-server/attribution/status')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ingestion: 'healthy', processing: 'healthy' });
  });

  it('GET /api/ad-server/video/config/1 should return video configuration', async () => {
    const response = await request(global.testUtils.baseURL)
      .get('/api/ad-server/video/config/1')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('autoplay', true);
    expect(response.body).toHaveProperty('muted', true);
    expect(Array.isArray(response.body.sources)).toBe(true);
  });

  it('GET /api/ad-server/reporting/yield should return yield analytics', async () => {
    const response = await request(global.testUtils.baseURL)
      .get('/api/ad-server/reporting/yield')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('revenue');
    expect(response.body).toHaveProperty('impressions');
  });

  it('POST /api/ad-server/activation/123/activate should return channel activation plan', async () => {
    const response = await request(global.testUtils.baseURL)
      .post('/api/ad-server/activation/123/activate')
      .set('Authorization', authToken)
      .send({ channels: ['web','social'] });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('campaign_id', '123');
    expect(Array.isArray(response.body.activated)).toBe(true);
  });
}); 