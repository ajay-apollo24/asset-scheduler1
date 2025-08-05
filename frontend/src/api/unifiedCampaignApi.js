// src/api/unifiedCampaignApi.js
import apiClient from './apiClient';

const unifiedCampaignApi = {
  // Campaign Management
  createCampaign: (campaignData) => {
    return apiClient.post('/campaigns', campaignData);
  },

  getCampaigns: (params = {}) => {
    return apiClient.get('/campaigns', { params });
  },

  getCampaign: (id) => {
    return apiClient.get(`/campaigns/${id}`);
  },

  updateCampaign: (id, updates) => {
    return apiClient.put(`/campaigns/${id}`, updates);
  },

  deleteCampaign: (id) => {
    return apiClient.delete(`/campaigns/${id}`);
  },

  // Internal Bookings (for backward compatibility)
  getInternalBookings: (params = {}) => {
    return apiClient.get('/campaigns', { 
      params: { ...params, advertiser_type: 'internal' } 
    });
  },

  // External Campaigns
  getExternalCampaigns: (params = {}) => {
    return apiClient.get('/campaigns', { 
      params: { ...params, advertiser_type: 'external' } 
    });
  },

  // Asset Availability
  getAssetAvailability: (assetId, startDate, endDate) => {
    return apiClient.get('/campaigns/availability/asset', {
      params: { asset_id: assetId, start_date: startDate, end_date: endDate }
    });
  },

  // Bidding
  processBid: (bidData) => {
    return apiClient.post('/campaigns/bid', bidData);
  },

  // Asset Allocation
  allocateAsset: (allocationData) => {
    return apiClient.post('/campaigns/allocate', allocationData);
  },

  // Analytics
  getAnalytics: (startDate, endDate) => {
    return apiClient.get('/campaigns/analytics/summary', {
      params: { start_date: startDate, end_date: endDate }
    });
  },

  // Campaign by LOB (for internal campaigns)
  getCampaignsByLOB: (lob, params = {}) => {
    return apiClient.get('/campaigns', {
      params: { ...params, advertiser_type: 'internal', lob }
    });
  }
};

export default unifiedCampaignApi; 