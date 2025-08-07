const MLEngine = require('../../modules/ad-server/utils/mlEngine');

describe('MLEngine', () => {
  beforeEach(() => {
    // Reset model between tests to ensure isolation
    MLEngine.ctrModel = null;
  });

  describe('predictCTR', () => {
    it('boosts CTR for premium location', async () => {
      const creative = { performance: { ctr: 0.02 } };
      const user_context = { location: { country: 'US' } };
      const page_context = { category: 'news' };

      const ctr = await MLEngine.predictCTR(creative, user_context, page_context);
      expect(ctr).toBeGreaterThan(0.02);
    });

    it('caps predicted CTR at 5%', async () => {
      const creative = { performance: { ctr: 0.06 } };
      const ctr = await MLEngine.predictCTR(creative, {}, {});
      expect(ctr).toBeLessThanOrEqual(0.05);
    });
  });

  describe('trainCTRModel', () => {
    it('learns to prefer higher performing creatives', async () => {
      const data = [
        { creative: { performance: { ctr: 0.01 } }, user: {}, context: {}, label: 0 },
        { creative: { performance: { ctr: 0.05 } }, user: {}, context: {}, label: 1 }
      ];
      MLEngine.trainCTRModel(data);

      const low = await MLEngine.predictCTR({ performance: { ctr: 0.01 } }, {}, {});
      const high = await MLEngine.predictCTR({ performance: { ctr: 0.05 } }, {}, {});
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('optimizeCreativeSelection', () => {
    it('uses Thompson Sampling to select creative', async () => {
      // Deterministic sampling
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const creatives = [
        { id: 1, performance: { ctr: 0.01, clicks: 5, impressions: 50 } },
        { id: 2, performance: { ctr: 0.03, clicks: 15, impressions: 50 } }
      ];

      const best = await MLEngine.optimizeCreativeSelection(creatives, {}, {});
      expect(best.id).toBe(2);

      Math.random.mockRestore();
    });
  });
});
