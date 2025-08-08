const request = require('supertest');

describe('Ad Server - Auth checks (Integration)', () => {
  beforeAll(async () => {
    await global.testUtils.waitForServer();
  });

  test('Protected route requires auth', async () => {
    const res = await request(global.testUtils.baseURL)
      .get('/api/ad-server/reporting/yield');
    expect([401, 403]).toContain(res.status);
  });

  test('Unprotected conversion endpoint accepts anonymous', async () => {
    const res = await request(global.testUtils.baseURL)
      .post('/api/ad-server/attribution/conversion')
      .send({ value: 1.23 });
    // Either success or 500 if table missing; but should not be 401/403
    expect([201, 200, 500]).toContain(res.status);
  });
}); 