const Auction = require('../../modules/ad-server/models/Auction');
const db = require('../../config/db');

jest.mock('../../config/db');

describe('Auction model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an auction', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }] });
    const result = await Auction.createAuction(1, {}, {});
    expect(db.query).toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  it('submits a bid', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 2 }] });
    const result = await Auction.submitBid(1, 1, 10, 5);
    expect(db.query).toHaveBeenCalled();
    expect(result.id).toBe(2);
  });

  it('selects a winner', async () => {
    const mockWinner = { id: 3, bid_amount: 9 };
    db.query.mockResolvedValue({ rows: [mockWinner] });
    const result = await Auction.selectWinner(1);
    expect(db.query).toHaveBeenCalled();
    expect(result).toEqual(mockWinner);
  });
});
