const Experiment = require('../utils/experiment');

describe('Experiment', () => {
  test('tracks metrics for a variant', () => {
    const exp = new Experiment('ab', {
      baselineByCohort: { default: 'control' },
      variants: {
        control: {
          ranking: 'baseline',
          biddingStrategy: 'standard',
          modelVersion: 'v1'
        },
        variantA: {
          ranking: 'new',
          biddingStrategy: 'aggressive',
          modelVersion: 'v2'
        }
      }
    });

    // record events
    exp.recordImpression('variantA', 2);
    exp.recordImpression('variantA', 3);
    exp.recordClick('variantA');
    exp.recordConversion('variantA');

    const metrics = exp.getMetrics('variantA');
    expect(metrics.revenuePerImpression).toBeCloseTo(2.5);
    expect(metrics.ctr).toBeCloseTo(0.5);
    expect(metrics.conversionRate).toBeCloseTo(1);
  });

  test('allows updating variant configuration', () => {
    const exp = new Experiment('ab', {
      variants: {
        B: { ranking: 'alt', biddingStrategy: 'balanced', modelVersion: 'v1' }
      }
    });

    expect(exp.getVariantConfig('B').modelVersion).toBe('v1');
    exp.setVariantConfig('B', { modelVersion: 'v2' });
    expect(exp.getVariantConfig('B').modelVersion).toBe('v2');
  });
});
