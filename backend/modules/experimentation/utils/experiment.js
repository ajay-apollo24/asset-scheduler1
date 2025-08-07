class Experiment {
  constructor(name, { baselineByCohort = {}, variants = {} } = {}) {
    this.name = name;
    this.baselineByCohort = baselineByCohort;
    this.variants = variants;
    this.metrics = {};

    const register = (variant) => {
      if (!this.metrics[variant]) {
        this.metrics[variant] = {
          impressions: 0,
          revenue: 0,
          clicks: 0,
          conversions: 0
        };
      }
    };

    Object.keys(variants).forEach(register);
    Object.values(baselineByCohort).forEach(register);
  }

  assign(cohort) {
    if (cohort && this.baselineByCohort[cohort]) {
      return this.baselineByCohort[cohort];
    }
    const names = Object.keys(this.variants);
    if (names.length === 0) return null;
    const index = Math.floor(Math.random() * names.length);
    return names[index];
  }

  _ensure(variant) {
    if (!this.metrics[variant]) {
      this.metrics[variant] = {
        impressions: 0,
        revenue: 0,
        clicks: 0,
        conversions: 0
      };
    }
  }

  recordImpression(variant, revenue = 0) {
    this._ensure(variant);
    this.metrics[variant].impressions += 1;
    this.metrics[variant].revenue += revenue;
  }

  recordClick(variant) {
    this._ensure(variant);
    this.metrics[variant].clicks += 1;
  }

  recordConversion(variant) {
    this._ensure(variant);
    this.metrics[variant].conversions += 1;
  }

  getMetrics(variant) {
    this._ensure(variant);
    const data = this.metrics[variant];
    const revenuePerImpression = data.impressions ? data.revenue / data.impressions : 0;
    const ctr = data.impressions ? data.clicks / data.impressions : 0;
    const conversionRate = data.clicks ? data.conversions / data.clicks : 0;
    return {
      revenuePerImpression,
      ctr,
      conversionRate
    };
  }

  getVariantConfig(variant) {
    return this.variants[variant];
  }

  setVariantConfig(variant, config) {
    this.variants[variant] = { ...(this.variants[variant] || {}), ...config };
  }
}

module.exports = Experiment;
