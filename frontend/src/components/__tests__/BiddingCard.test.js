import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BiddingCard from '../BiddingCard';
import apiClient from '../../api/apiClient';

const mockAuction = {
  id: 1,
  title: 'Test Campaign',
  lob: 'Marketing',
  start_date: '2024-01-01',
  end_date: '2024-01-05',
  auction_status: 'active',
  estimated_cost: 10000,
  user_id: 1
};

const mockBids = [
  {
    id: 1,
    lob: 'Sales',
    bid_amount: 12000
  },
  {
    id: 2,
    lob: 'Marketing',
    bid_amount: 13000
  }
];

const mockCurrentUser = {
  user_id: 1,
  email: 'test@example.com',
  role: 'user'
};

describe('BiddingCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render auction information correctly', () => {
    apiClient.get.mockResolvedValue({ data: mockBids });
    
    render(
      <BiddingCard
        auction={mockAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('1/1/2024 - 1/5/2024')).toBeInTheDocument();
    expect(screen.getByText('5 days')).toBeInTheDocument();
    expect(screen.getByText('₹10,000.00')).toBeInTheDocument();
  });

  it('should display active status badge', () => {
    apiClient.get.mockResolvedValue({ data: mockBids });
    
    render(
      <BiddingCard
        auction={mockAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should display pending status badge', () => {
    const pendingAuction = { ...mockAuction, auction_status: 'pending' };
    apiClient.get.mockResolvedValue({ data: [] });
    
    render(
      <BiddingCard
        auction={pendingAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('should fetch and display bids for active auctions', async () => {
    apiClient.get.mockResolvedValue({ data: mockBids });
    
    render(
      <BiddingCard
        auction={mockAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Current Bids (2)')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('₹12,000.00')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('₹13,000.00')).toBeInTheDocument();
  });

  it('should display no bids message when no bids exist', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    
    render(
      <BiddingCard
        auction={mockAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('No bids yet')).toBeInTheDocument();
    });
  });

  it('should show place bid button for active auctions', async () => {
    apiClient.get.mockResolvedValue({ data: mockBids });
    
    render(
      <BiddingCard
        auction={mockAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Place Bid')).toBeInTheDocument();
    });
  });

  it('should show start auction button for pending auctions (owner)', () => {
    const pendingAuction = { ...mockAuction, auction_status: 'pending' };
    apiClient.get.mockResolvedValue({ data: [] });
    
    render(
      <BiddingCard
        auction={pendingAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    expect(screen.getByText('Start Auction')).toBeInTheDocument();
  });

  it('should show end auction button for active auctions (owner)', async () => {
    apiClient.get.mockResolvedValue({ data: mockBids });
    
    render(
      <BiddingCard
        auction={mockAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('End Auction')).toBeInTheDocument();
    });
  });

  it('should not show start auction button for non-owners', () => {
    const pendingAuction = { ...mockAuction, auction_status: 'pending', user_id: 2 };
    apiClient.get.mockResolvedValue({ data: [] });
    
    render(
      <BiddingCard
        auction={pendingAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    expect(screen.queryByText('Start Auction')).not.toBeInTheDocument();
  });

  it('should show end auction button for admins even if not owner', async () => {
    const adminUser = { ...mockCurrentUser, role: 'admin' };
    const otherUserAuction = { ...mockAuction, user_id: 2 };
    apiClient.get.mockResolvedValue({ data: mockBids });
    
    render(
      <BiddingCard
        auction={otherUserAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={adminUser}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('End Auction')).toBeInTheDocument();
    });
  });

  it('should call onPlaceBid when place bid button is clicked', async () => {
    const onPlaceBid = jest.fn();
    apiClient.get.mockResolvedValue({ data: mockBids });
    
    render(
      <BiddingCard
        auction={mockAuction}
        onPlaceBid={onPlaceBid}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Place Bid')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Place Bid'));
    expect(onPlaceBid).toHaveBeenCalledWith(mockAuction);
  });

  it('should call onStartAuction when start auction button is clicked', () => {
    const onStartAuction = jest.fn();
    const pendingAuction = { ...mockAuction, auction_status: 'pending' };
    apiClient.get.mockResolvedValue({ data: [] });
    
    render(
      <BiddingCard
        auction={pendingAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={onStartAuction}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    fireEvent.click(screen.getByText('Start Auction'));
    expect(onStartAuction).toHaveBeenCalledWith(mockAuction.id);
  });

  it('should call onEndAuction when end auction button is clicked', async () => {
    const onEndAuction = jest.fn();
    apiClient.get.mockResolvedValue({ data: mockBids });
    
    render(
      <BiddingCard
        auction={mockAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={onEndAuction}
        currentUser={mockCurrentUser}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('End Auction')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('End Auction'));
    expect(onEndAuction).toHaveBeenCalledWith(mockAuction.id);
  });

  it('should display winning bid for completed auctions', () => {
    const completedAuction = { 
      ...mockAuction, 
      auction_status: 'completed',
      bid_amount: 15000
    };
    
    render(
      <BiddingCard
        auction={completedAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    expect(screen.getByText('Winning Bid:')).toBeInTheDocument();
    expect(screen.getByText('₹15,000.00')).toBeInTheDocument();
  });

  it('should handle API error when fetching bids', async () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));
    
    render(
      <BiddingCard
        auction={mockAuction}
        onPlaceBid={jest.fn()}
        onStartAuction={jest.fn()}
        onEndAuction={jest.fn()}
        currentUser={mockCurrentUser}
      />
    );
    
    // Should still render the card without crashing
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
  });
}); 