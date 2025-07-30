// src/pages/Bidding.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import BiddingCard from '../components/BiddingCard';
import PlaceBidModal from '../components/PlaceBidModal';

const Bidding = () => {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/bookings?auction_status=active');
      setAuctions(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch auctions');
      console.error('Error fetching auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = (auction) => {
    setSelectedAuction(auction);
    setShowBidModal(true);
  };

  const handleBidSubmitted = () => {
    setShowBidModal(false);
    setSelectedAuction(null);
    fetchAuctions(); // Refresh the list
  };

  const handleStartAuction = async (bookingId) => {
    try {
      await apiClient.put(`/bidding/${bookingId}/start`);
      fetchAuctions(); // Refresh the list
    } catch (err) {
      setError('Failed to start auction');
      console.error('Error starting auction:', err);
    }
  };

  const handleEndAuction = async (bookingId) => {
    try {
      await apiClient.put(`/bidding/${bookingId}/end`);
      fetchAuctions(); // Refresh the list
    } catch (err) {
      setError('Failed to end auction');
      console.error('Error ending auction:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bidding & Auctions</h1>
        <button 
          onClick={fetchAuctions} 
          className="btn btn-primary btn-sm"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {auctions.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Active Auctions</h3>
          <p className="text-gray-500">There are currently no active auctions for bidding.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => (
            <BiddingCard
              key={auction.id}
              auction={auction}
              onPlaceBid={() => handlePlaceBid(auction)}
              onStartAuction={() => handleStartAuction(auction.id)}
              onEndAuction={() => handleEndAuction(auction.id)}
              currentUser={user}
            />
          ))}
        </div>
      )}

      {showBidModal && selectedAuction && (
        <PlaceBidModal
          auction={selectedAuction}
          onClose={() => setShowBidModal(false)}
          onBidSubmitted={handleBidSubmitted}
        />
      )}
    </div>
  );
};

export default Bidding; 