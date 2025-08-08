const TargetingEngine = require('../utils/targetingEngine');
const BudgetPacing = require('../utils/budgetPacing');
const YieldControls = require('../utils/yieldControls');
const Attribution = require('../utils/attribution');
const VideoEngine = require('../utils/videoEngine');
const Reporting = require('../utils/reporting');

jest.mock('../../../config/db', () => ({
  query: jest.fn(async (sql, params) => {
    if (/FROM audience_segments/i.test(sql)) {
      return { rows: [{ id: 1, name: 'loyalty', description: 'Loyal shoppers' }] };
    }
    if (/FROM performance_metrics/i.test(sql)) {
      return { rows: [{ revenue: 0, impressions: 0 }] };
    }
    if (/INSERT INTO conversions/i.test(sql)) {
      return { rows: [{ id: 123 }] };
    }
    if (/INSERT INTO video_events/i.test(sql)) {
      return { rows: [{ id: 456 }] };
    }
    if (/FROM campaigns/i.test(sql)) {
      return { rows: [{ id: params?.[0] || 1, budget: 100, spend_to_date: 25 }] };
    }
    return { rows: [] };
  })
}));

describe('Ad Server Utilities (Unit)', () => {
  test('TargetingEngine.evaluateTargeting returns combined signals', async () => {
    const result = await TargetingEngine.evaluateTargeting({
      pageContext: { url: 'https://x', keywords: ['k1'] },
      userContext: { user_id: 'u1' },
      storeContext: { store_id: 10 }
    });
    expect(result).toHaveProperty('eligibility_score');
    expect(result.audience.segments.length).toBeGreaterThan(0);
  });

  test('BudgetPacing.computePacing returns recommended_daily_spend', async () => {
    const pacing = await BudgetPacing.computePacing(1);
    expect(pacing).toHaveProperty('recommended_daily_spend');
  });

  test('YieldControls.applyFloorPrices respects floor', async () => {
    const adjusted = await YieldControls.applyFloorPrices(0.2, { display: 0.5 });
    expect(adjusted.adjusted_bid).toBe(0.5);
  });

  test('Attribution.recordConversion returns conversion_id', async () => {
    const res = await Attribution.recordConversion({ impressionId: 1, clickId: 2, value: 10 });
    expect(res).toHaveProperty('conversion_id');
  });

  test('VideoEngine.getVideoConfig returns autoplay muted config', async () => {
    const cfg = await VideoEngine.getVideoConfig({ creativeId: 77 });
    expect(cfg.autoplay).toBe(true);
    expect(cfg.muted).toBe(true);
  });

  test('Reporting.getYieldAnalytics returns rpm', async () => {
    const data = await Reporting.getYieldAnalytics('24h');
    expect(data).toHaveProperty('rpm');
  });
}); 