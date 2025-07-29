import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Bidding from '../Bidding';
import apiClient from '../../api/apiClient';

// Mock the child components
jest.mock('../../components/BiddingCard', () => {
  return function MockBiddingCard({ auction, onPlaceBid, onStartAuction, onEndAuction }) {
    return (
      <div data-testid={`auction-${auction.id}`}>
        <h3>{auction.title}</h3>
        <span>{auction.auction_status}</span>
        <button onClick={() => onPlaceBid(auction)}>Place Bid</button>
        <button onClick={() => onStartAuction(auction.id)}>Start Auction</button>
        <button onClick={() => onEndAuction(auction.id)}>End Auction</button>
      </div>
    );
  };
});

jest.mock('../../components/PlaceBidModal', () => {
  return function MockPlaceBidModal({ auction, onClose, onBidSubmitted }) {
    return (
      <div data-testid="bid-modal">
        <h2>Place Bid for {auction.title}</h2>
        <button onClick={onClose}>Close</button>
        <button onClick={onBidSubmitted}>Submit Bid</button>
      </div>
    );
  };
});

const mockAuctions = [
  {
    id: 1,
    title: 'Test Auction 1',
    lob: 'Marketing',
    start_date: '2024-01-01',
    end_date: '2024-01-05',
    auction_status: 'active',
    estimated_cost: 10000,
    user_id: 1
  },
  {
    id: 2,
    title: 'Test Auction 2',
    lob: 'Sales',
    start_date: '2024-01-10',
    end_date: '2024-01-15',
    auction_status: 'pending',
    estimated_cost: 15000,
    user_id: 2
  }
];

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Bidding Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    apiClient.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithRouter(<Bidding />);
    
    expect(screen.getByText('Bidding & Auctions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('should display auctions when loaded successfully', async () => {
    apiClient.get.mockResolvedValue({ data: mockAuctions });
    
    renderWithRouter(<Bidding />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Auction 1')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Auction 2')).toBeInTheDocument();
  });

  it('should display no auctions message when empty', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    
    renderWithRouter(<Bidding />);
    
    await waitFor(() => {
      expect(screen.getByText('No Active Auctions')).toBeInTheDocument();
    });
    
    expect(screen.getByText('There are currently no active auctions for bidding.')).toBeInTheDocument();
  });

  it('should handle API error gracefully', async () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));
    
    renderWithRouter(<Bidding />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch auctions')).toBeInTheDocument();
    });
  });

  it('should refresh auctions when refresh button is clicked', async () => {
    apiClient.get.mockResolvedValue({ data: mockAuctions });
    
    renderWithRouter(<Bidding />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Auction 1')).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    fireEvent.click(refreshButton);
    
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it('should open bid modal when place bid is clicked', async () => {
    apiClient.get.mockResolvedValue({ data: mockAuctions });
    
    renderWithRouter(<Bidding />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Auction 1')).toBeInTheDocument();
    });
    
    const placeBidButton = screen.getByText('Place Bid');
    fireEvent.click(placeBidButton);
    
    expect(screen.getByTestId('bid-modal')).toBeInTheDocument();
    expect(screen.getByText('Place Bid for Test Auction 1')).toBeInTheDocument();
  });

  it('should close bid modal when close is clicked', async () => {
    apiClient.get.mockResolvedValue({ data: mockAuctions });
    
    renderWithRouter(<Bidding />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Auction 1')).toBeInTheDocument();
    });
    
    const placeBidButton = screen.getByText('Place Bid');
    fireEvent.click(placeBidButton);
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('bid-modal')).not.toBeInTheDocument();
  });

  it('should refresh auctions after successful bid submission', async () => {
    apiClient.get.mockResolvedValue({ data: mockAuctions });
    
    renderWithRouter(<Bidding />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Auction 1')).toBeInTheDocument();
    });
    
    const placeBidButton = screen.getByText('Place Bid');
    fireEvent.click(placeBidButton);
    
    const submitButton = screen.getByText('Submit Bid');
    fireEvent.click(submitButton);
    
    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('bid-modal')).not.toBeInTheDocument();
  });

  it('should handle start auction error', async () => {
    apiClient.get.mockResolvedValue({ data: mockAuctions });
    apiClient.put.mockRejectedValue(new Error('Start auction failed'));
    
    renderWithRouter(<Bidding />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Auction 2')).toBeInTheDocument();
    });
    
    const startAuctionButton = screen.getByText('Start Auction');
    fireEvent.click(startAuctionButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to start auction')).toBeInTheDocument();
    });
  });

  it('should handle end auction error', async () => {
    apiClient.get.mockResolvedValue({ data: mockAuctions });
    apiClient.put.mockRejectedValue(new Error('End auction failed'));
    
    renderWithRouter(<Bidding />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Auction 1')).toBeInTheDocument();
    });
    
    const endAuctionButton = screen.getByText('End Auction');
    fireEvent.click(endAuctionButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to end auction')).toBeInTheDocument();
    });
  });
}); 