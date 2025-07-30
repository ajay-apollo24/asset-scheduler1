const MLEngine = require('../../utils/mlEngine');

describe('MLEngine', () => {
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

  describe('optimizeCreativeSelection', () => {
    it('returns creative with highest score', async () => {
      const creatives = [
        { id: 1, performance: { ctr: 0.01 } },
        { id: 2, performance: { ctr: 0.03 } }
      ];
      const user_context = { location: { country: 'US' } };
      const best = await MLEngine.optimizeCreativeSelection(creatives, user_context);
      expect(best.id).toBe(2);
    });
  });
});
