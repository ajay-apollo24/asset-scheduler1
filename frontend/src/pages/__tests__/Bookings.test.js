import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Bookings from '../Bookings';
import apiClient from '../../api/apiClient';

// Mock the child components
jest.mock('../../components/BookingForm', () => {
  return function MockBookingForm({ onCreated }) {
    return (
      <div data-testid="booking-form">
        <button onClick={() => onCreated()}>Create Booking</button>
      </div>
    );
  };
});

jest.mock('../../components/BookingEditForm', () => {
  return function MockBookingEditForm({ booking, onUpdated, onCancel }) {
    return (
      <div data-testid="booking-edit-form">
        <h3>Edit {booking.title}</h3>
        <button onClick={() => onUpdated()}>Update</button>
        <button onClick={() => onCancel()}>Cancel</button>
      </div>
    );
  };
});

const mockBookings = [
  {
    id: 1,
    title: 'Test Campaign 1',
    asset_name: 'Test Asset 1',
    lob: 'Marketing',
    user_email: 'user1@example.com',
    start_date: '2024-01-01',
    end_date: '2024-01-05',
    status: 'approved',
    auction_status: 'active',
    user_id: 1
  },
  {
    id: 2,
    title: 'Test Campaign 2',
    asset_name: 'Test Asset 2',
    lob: 'Sales',
    user_email: 'user2@example.com',
    start_date: '2024-01-10',
    end_date: '2024-01-15',
    status: 'approved',
    auction_status: null,
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

describe('Bookings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render bookings page with title', () => {
    apiClient.get.mockResolvedValue({ data: mockBookings });
    
    renderWithRouter(<Bookings />);
    
    expect(screen.getByText('Bookings')).toBeInTheDocument();
    expect(screen.getByText('New Booking')).toBeInTheDocument();
  });

  it('should display bookings in table format', async () => {
    apiClient.get.mockResolvedValue({ data: mockBookings });
    
    renderWithRouter(<Bookings />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Campaign 2')).toBeInTheDocument();
    expect(screen.getByText('Test Asset 1')).toBeInTheDocument();
    expect(screen.getByText('Test Asset 2')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
  });

  it('should display auction status column', async () => {
    apiClient.get.mockResolvedValue({ data: mockBookings });
    
    renderWithRouter(<Bookings />);
    
    await waitFor(() => {
      expect(screen.getByText('Auction')).toBeInTheDocument();
    });
    
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // No auction status
  });

  it('should show start auction button for approved bookings without auction', async () => {
    apiClient.get.mockResolvedValue({ data: mockBookings });
    
    renderWithRouter(<Bookings />);
    
    await waitFor(() => {
      expect(screen.getByText('Start Auction')).toBeInTheDocument();
    });
  });

  it('should show end auction button for active auctions', async () => {
    apiClient.get.mockResolvedValue({ data: mockBookings });
    
    renderWithRouter(<Bookings />);
    
    await waitFor(() => {
      expect(screen.getByText('End Auction')).toBeInTheDocument();
    });
  });

  it('should handle start auction successfully', async () => {
    apiClient.get.mockResolvedValue({ data: mockBookings });
    apiClient.put.mockResolvedValue({ data: { message: 'Auction started' } });
    
    renderWithRouter(<Bookings />);
    
    await waitFor(() => {
      expect(screen.getByText('Start Auction')).toBeInTheDocument();
    });
    
    const startAuctionButton = screen.getByText('Start Auction');
    fireEvent.click(startAuctionButton);
    
    expect(apiClient.put).toHaveBeenCalledWith('/api/bidding/2/start');
  });

  it('should handle end auction successfully', async () => {
    apiClient.get.mockResolvedValue({ data: mockBookings });
    apiClient.put.mockResolvedValue({ data: { message: 'Auction ended' } });
    
    renderWithRouter(<Bookings />);
    
    await waitFor(() => {
      expect(screen.getByText('End Auction')).toBeInTheDocument();
    });
    
    const endAuctionButton = screen.getByText('End Auction');
    fireEvent.click(endAuctionButton);
    
    expect(apiClient.put).toHaveBeenCalledWith('/api/bidding/1/end');
  });

  it('should handle start auction error', async () => {
    apiClient.get.mockResolvedValue({ data: mockBookings });
    apiClient.put.mockRejectedValue(new Error('Start auction failed'));
    
    renderWithRouter(<Bookings />);
    
    await waitFor(() => {
      expect(screen.getByText('Start Auction')).toBeInTheDocument();
    });
    
    const startAuctionButton = screen.getByText('Start Auction');
    fireEvent.click(startAuctionButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to start auction')).toBeInTheDocument();
    });
  });

  it('should handle end auction error', async () => {
    apiClient.get.mockResolvedValue({ data: mockBookings });
    apiClient.put.mockRejectedValue(new Error('End auction failed'));
    
    renderWithRouter(<Bookings />);
    
    await waitFor(() => {
      expect(screen.getByText('End Auction')).toBeInTheDocument();
    });
    
    const endAuctionButton = screen.getByText('End Auction');
    fireEvent.click(endAuctionButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to end auction')).toBeInTheDocument();
    });
  });

  it('should handle API error when fetching bookings', async () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));
    
    renderWithRouter(<Bookings />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load bookings')).toBeInTheDocument();
    });
  });
}); 