const Campaign = require('../../modules/ad-server/models/Campaign');
const db = require('../../config/db');

jest.mock('../../config/db');

describe('Campaign model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a campaign with extended fields', async () => {
    const mockRow = { id: 1 };
    db.query.mockResolvedValue({ rows: [mockRow] });

    const result = await Campaign.create({
      advertiser_id: 1,
      name: 'Test Campaign',
      budget: 1000,
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      goal_type: 'impressions',
      goal_value: 10000,
      pacing: 'even',
      pricing_model: 'cpm',
      frequency_cap: 5,
      day_parting: { days: [1,2], start: '09:00', end: '17:00' }
    });

    expect(db.query).toHaveBeenCalled();
    const query = db.query.mock.calls[0][0];
    expect(query).toMatch(/goal_type/);
    const params = db.query.mock.calls[0][1];
    expect(params).toContain('impressions');
    expect(result).toEqual(mockRow);
  });

  it('updates a campaign with new fields', async () => {
    const mockRow = { id: 1, pacing: 'asap' };
    db.query.mockResolvedValue({ rows: [mockRow] });

    const result = await Campaign.update(1, { pacing: 'asap' });
    expect(db.query).toHaveBeenCalled();
    expect(result).toHaveProperty('pacing', 'asap');
  });
});
