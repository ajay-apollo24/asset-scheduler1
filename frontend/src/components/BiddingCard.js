// src/components/BiddingCard.js
import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const BiddingCard = ({ auction, onPlaceBid, onStartAuction, onEndAuction, currentUser }) => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auction.auction_status === 'active') {
      fetchBids();
    }
  }, [auction.id, auction.auction_status]);

  const fetchBids = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/bidding/bookings/${auction.id}/bids`);
      console.log('Bid API response:', response.data);
      setBids(response.data.bids || []);
    } catch (err) {
      console.error('Error fetching bids:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'pending': 'badge badge-warning',
      'active': 'badge badge-success',
      'completed': 'badge badge-info',
      'cancelled': 'badge badge-error'
    };
    return <span className={statusClasses[status] || 'badge badge-neutral'}>{status}</span>;
  };

  const isOwner = auction.user_id === currentUser?.user_id;
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-start mb-4">
          <h2 className="card-title text-lg">{auction.title}</h2>
          {getStatusBadge(auction.auction_status)}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">LOB:</span>
            <span>{auction.lob}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Dates:</span>
            <span>{formatDate(auction.start_date)} - {formatDate(auction.end_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Duration:</span>
            <span>{Math.ceil((new Date(auction.end_date) - new Date(auction.start_date)) / (1000 * 60 * 60 * 24))} days</span>
          </div>
          {auction.estimated_cost && (
            <div className="flex justify-between">
              <span className="font-medium">Estimated Cost:</span>
              <span>{formatCurrency(auction.estimated_cost)}</span>
            </div>
          )}
        </div>

        {auction.auction_status === 'active' && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Current Bids ({bids.length})</h3>
            {loading ? (
              <div className="loading loading-spinner loading-sm"></div>
            ) : bids.length > 0 ? (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {bids.slice(0, 3).map((bid) => (
                  <div key={bid.id} className="flex justify-between text-xs bg-base-200 p-2 rounded">
                    <span>{bid.lob}</span>
                    <span className="font-medium">{formatCurrency(bid.bid_amount)}</span>
                  </div>
                ))}
                {bids.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{bids.length - 3} more bids
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No bids yet</p>
            )}
          </div>
        )}

        <div className="card-actions justify-end mt-4">
          {auction.auction_status === 'pending' && (isOwner || isAdmin) && (
            <button 
              onClick={() => onStartAuction(auction.id)}
              className="btn btn-primary btn-sm"
            >
              Start Auction
            </button>
          )}

          {auction.auction_status === 'active' && (
            <>
              <button 
                onClick={() => onPlaceBid(auction)}
                className="btn btn-success btn-sm"
              >
                Place Bid
              </button>
              {(isOwner || isAdmin) && (
                <button 
                  onClick={() => onEndAuction(auction.id)}
                  className="btn btn-warning btn-sm"
                >
                  End Auction
                </button>
              )}
            </>
          )}

          {auction.auction_status === 'completed' && auction.bid_amount && (
            <div className="text-sm">
              <span className="font-medium">Winning Bid: </span>
              <span className="text-success">{formatCurrency(auction.bid_amount)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiddingCard; 