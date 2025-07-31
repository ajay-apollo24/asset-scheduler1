// src/components/PlaceBidModal.js
import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import Modal from './Modal';

const PlaceBidModal = ({ auction, onClose, onBidSubmitted }) => {
  const [formData, setFormData] = useState({
    bid_amount: '',
    max_bid: '',
    bid_reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [budgetInfo, setBudgetInfo] = useState(null);

  // Fetch budget info when modal opens
  useEffect(() => {
    const fetchBudgetInfo = async () => {
      try {
        const response = await apiClient.get(`/bidding/budget-info?lob=${auction.lob}`);
        setBudgetInfo(response.data.budgetInfo);
      } catch (err) {
        console.error('Failed to fetch budget info:', err);
      }
    };

    if (auction.lob) {
      fetchBudgetInfo();
    }
  }, [auction.lob]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.bid_amount || parseFloat(formData.bid_amount) <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await apiClient.post('/bidding/bids', {
        booking_id: auction.id,
        bid_amount: parseFloat(formData.bid_amount),
        max_bid: formData.max_bid ? parseFloat(formData.max_bid) : null,
        bid_reason: formData.bid_reason || null
      });

      onBidSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place bid');
      console.error('Error placing bid:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Place Bid</h2>
        
        <div className="mb-6 p-4 bg-base-200 rounded-lg">
          <h3 className="font-semibold mb-2">{auction.title}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>LOB:</span>
              <span>{auction.lob}</span>
            </div>
            <div className="flex justify-between">
              <span>Dates:</span>
              <span>{formatDate(auction.start_date)} - {formatDate(auction.end_date)}</span>
            </div>
            {auction.estimated_cost && (
              <div className="flex justify-between">
                <span>Estimated Cost:</span>
                <span>{formatCurrency(auction.estimated_cost)}</span>
              </div>
            )}
          </div>

          {/* Budget Information */}
          {budgetInfo && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2 text-blue-800">Budget Limits</h4>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="flex justify-between">
                  <span>Max bid for {auction.lob}:</span>
                  <span className="font-medium">{formatCurrency(budgetInfo.lob.maxBidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily budget remaining:</span>
                  <span className="font-medium">{formatCurrency(budgetInfo.lob.dailyRemaining)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your daily budget remaining:</span>
                  <span className="font-medium">{formatCurrency(budgetInfo.user.dailyRemaining)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Bid Amount (₹)</span>
              <span className="label-text-alt text-error">*</span>
            </label>
            <input
              type="number"
              name="bid_amount"
              value={formData.bid_amount}
              onChange={handleInputChange}
              placeholder="Enter your bid amount"
              className="input input-bordered w-full"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Maximum Bid (₹)</span>
              <span className="label-text-alt text-gray-500">Optional</span>
            </label>
            <input
              type="number"
              name="max_bid"
              value={formData.max_bid}
              onChange={handleInputChange}
              placeholder="Your maximum bid limit"
              className="input input-bordered w-full"
              min="0"
              step="0.01"
            />
            <div className="label">
              <span className="label-text-alt text-gray-500">
                Auto-bid up to this amount if outbid
              </span>
            </div>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Bid Reason</span>
              <span className="label-text-alt text-gray-500">Optional</span>
            </label>
            <textarea
              name="bid_reason"
              value={formData.bid_reason}
              onChange={handleInputChange}
              placeholder="Why are you bidding on this booking?"
              className="textarea textarea-bordered w-full"
              rows="3"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Placing Bid...
                </>
              ) : (
                'Place Bid'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default PlaceBidModal; 