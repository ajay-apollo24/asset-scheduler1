import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlaceBidModal from '../PlaceBidModal';
import apiClient from '../../api/apiClient';

// Mock the Modal component
jest.mock('../Modal', () => {
  return function MockModal({ children, onClose }) {
    return (
      <div data-testid="modal">
        <button onClick={onClose}>Close Modal</button>
        {children}
      </div>
    );
  };
});

const mockAuction = {
  id: 1,
  title: 'Test Campaign',
  lob: 'Marketing',
  start_date: '2024-01-01',
  end_date: '2024-01-05',
  estimated_cost: 10000
};

describe('PlaceBidModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render auction information correctly', () => {
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={jest.fn()}
      />
    );
    
    expect(screen.getByText('Place Bid')).toBeInTheDocument();
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('1/1/2024 - 1/5/2024')).toBeInTheDocument();
    expect(screen.getByText('₹10,000.00')).toBeInTheDocument();
  });

  it('should render form fields correctly', () => {
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={jest.fn()}
      />
    );
    
    expect(screen.getByLabelText('Bid Amount (₹)')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum Bid (₹)')).toBeInTheDocument();
    expect(screen.getByLabelText('Bid Reason')).toBeInTheDocument();
    expect(screen.getByText('Place Bid')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should handle form input changes', () => {
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={jest.fn()}
      />
    );
    
    const bidAmountInput = screen.getByLabelText('Bid Amount (₹)');
    const maxBidInput = screen.getByLabelText('Maximum Bid (₹)');
    const reasonInput = screen.getByLabelText('Bid Reason');
    
    fireEvent.change(bidAmountInput, { target: { value: '12000' } });
    fireEvent.change(maxBidInput, { target: { value: '15000' } });
    fireEvent.change(reasonInput, { target: { value: 'High priority campaign' } });
    
    expect(bidAmountInput.value).toBe('12000');
    expect(maxBidInput.value).toBe('15000');
    expect(reasonInput.value).toBe('High priority campaign');
  });

  it('should submit bid successfully', async () => {
    const onBidSubmitted = jest.fn();
    apiClient.post.mockResolvedValue({ data: { id: 1, bid_amount: 12000 } });
    
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={onBidSubmitted}
      />
    );
    
    const bidAmountInput = screen.getByLabelText('Bid Amount (₹)');
    const submitButton = screen.getByText('Place Bid');
    
    fireEvent.change(bidAmountInput, { target: { value: '12000' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/bidding/place-bid', {
        booking_id: 1,
        bid_amount: 12000,
        max_bid: null,
        bid_reason: null
      });
    });
    
    expect(onBidSubmitted).toHaveBeenCalled();
  });

  it('should submit bid with optional fields', async () => {
    const onBidSubmitted = jest.fn();
    apiClient.post.mockResolvedValue({ data: { id: 1, bid_amount: 12000 } });
    
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={onBidSubmitted}
      />
    );
    
    const bidAmountInput = screen.getByLabelText('Bid Amount (₹)');
    const maxBidInput = screen.getByLabelText('Maximum Bid (₹)');
    const reasonInput = screen.getByLabelText('Bid Reason');
    const submitButton = screen.getByText('Place Bid');
    
    fireEvent.change(bidAmountInput, { target: { value: '12000' } });
    fireEvent.change(maxBidInput, { target: { value: '15000' } });
    fireEvent.change(reasonInput, { target: { value: 'High priority campaign' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/bidding/place-bid', {
        booking_id: 1,
        bid_amount: 12000,
        max_bid: 15000,
        bid_reason: 'High priority campaign'
      });
    });
  });

  it('should show error for invalid bid amount', async () => {
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={jest.fn()}
      />
    );
    
    const bidAmountInput = screen.getByLabelText('Bid Amount (₹)');
    const submitButton = screen.getByText('Place Bid');
    
    fireEvent.change(bidAmountInput, { target: { value: '-100' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Please enter a valid bid amount')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('should show error for empty bid amount', async () => {
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={jest.fn()}
      />
    );
    
    const submitButton = screen.getByText('Place Bid');
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Please enter a valid bid amount')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('should show error for zero bid amount', async () => {
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={jest.fn()}
      />
    );
    
    const bidAmountInput = screen.getByLabelText('Bid Amount (₹)');
    const submitButton = screen.getByText('Place Bid');
    
    fireEvent.change(bidAmountInput, { target: { value: '0' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Please enter a valid bid amount')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('should handle API error', async () => {
    const errorMessage = 'Bid amount too low';
    apiClient.post.mockRejectedValue({
      response: { data: { message: errorMessage } }
    });
    
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={jest.fn()}
      />
    );
    
    const bidAmountInput = screen.getByLabelText('Bid Amount (₹)');
    const submitButton = screen.getByText('Place Bid');
    
    fireEvent.change(bidAmountInput, { target: { value: '12000' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should handle generic API error', async () => {
    apiClient.post.mockRejectedValue(new Error('Network error'));
    
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={jest.fn()}
      />
    );
    
    const bidAmountInput = screen.getByLabelText('Bid Amount (₹)');
    const submitButton = screen.getByText('Place Bid');
    
    fireEvent.change(bidAmountInput, { target: { value: '12000' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to place bid')).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    apiClient.post.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={jest.fn()}
      />
    );
    
    const bidAmountInput = screen.getByLabelText('Bid Amount (₹)');
    const submitButton = screen.getByText('Place Bid');
    
    fireEvent.change(bidAmountInput, { target: { value: '12000' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Placing Bid...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={onClose}
        onBidSubmitted={jest.fn()}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when modal close button is clicked', () => {
    const onClose = jest.fn();
    
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={onClose}
        onBidSubmitted={jest.fn()}
      />
    );
    
    const modalCloseButton = screen.getByText('Close Modal');
    fireEvent.click(modalCloseButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should disable form inputs during submission', async () => {
    apiClient.post.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(
      <PlaceBidModal
        auction={mockAuction}
        onClose={jest.fn()}
        onBidSubmitted={jest.fn()}
      />
    );
    
    const bidAmountInput = screen.getByLabelText('Bid Amount (₹)');
    const maxBidInput = screen.getByLabelText('Maximum Bid (₹)');
    const reasonInput = screen.getByLabelText('Bid Reason');
    const submitButton = screen.getByText('Place Bid');
    
    fireEvent.change(bidAmountInput, { target: { value: '12000' } });
    fireEvent.click(submitButton);
    
    expect(bidAmountInput).toBeDisabled();
    expect(maxBidInput).toBeDisabled();
    expect(reasonInput).toBeDisabled();
  });
}); 