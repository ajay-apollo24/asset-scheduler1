// src/components/UnifiedCampaign/UnifiedCampaignDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import unifiedCampaignApi from '../../api/unifiedCampaignApi';
import Layout from '../Layout';

const UnifiedCampaignDashboard = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'internal', 'external'
  const [stats, setStats] = useState({
    total: 0,
    internal: 0,
    external: 0,
    active: 0,
    pending: 0,
    totalBudget: 0,
    totalRevenue: 0
  });

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (activeTab === 'internal') {
        response = await unifiedCampaignApi.getInternalBookings();
      } else if (activeTab === 'external') {
        response = await unifiedCampaignApi.getExternalCampaigns();
      } else {
        response = await unifiedCampaignApi.getCampaigns();
      }

      // Handle different response structures
      let campaignsData;
      if (response.data && Array.isArray(response.data)) {
        campaignsData = response.data;
      } else if (response.data && Array.isArray(response.data.campaigns)) {
        campaignsData = response.data.campaigns;
      } else if (response.data && response.data.total !== undefined) {
        campaignsData = response.data.campaigns || [];
      } else if (response.data && typeof response.data === 'string') {
        // Handle error messages
        console.warn('API returned error message:', response.data);
        campaignsData = [];
        setError(response.data);
      } else {
        campaignsData = [];
      }

      console.log('Campaigns data:', campaignsData);
      setCampaigns(campaignsData);

      // Calculate stats
      calculateStats(campaignsData);

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch campaigns';
      setError(errorMessage);
      console.error('Error fetching campaigns:', err);
      setCampaigns([]); // Ensure campaigns is always an array
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const calculateStats = (campaignsData) => {
    // Ensure campaignsData is an array
    const data = Array.isArray(campaignsData) ? campaignsData : [];
    
    const total = data.length;
    const internal = data.filter(c => c.advertiser_type === 'internal').length;
    const external = data.filter(c => c.advertiser_type === 'external').length;
    const active = data.filter(c => c.status === 'active' || c.status === 'approved').length;
    const pending = data.filter(c => c.status === 'pending').length;
    
    const totalBudget = data.reduce((sum, c) => sum + (parseFloat(c.budget || 0)), 0);
    const totalRevenue = data
      .filter(c => c.advertiser_type === 'external')
      .reduce((sum, c) => sum + (parseFloat(c.budget || 0)), 0);

    setStats({
      total,
      internal,
      external,
      active,
      pending,
      totalBudget,
      totalRevenue
    });
  };

  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      await unifiedCampaignApi.updateCampaignStatus(campaignId, newStatus);
      fetchCampaigns(); // Refresh the list
    } catch (err) {
      setError('Failed to update campaign status');
      console.error('Error updating campaign status:', err);
    }
  };

  const handleDelete = async (campaignId) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        await unifiedCampaignApi.deleteCampaign(campaignId);
        fetchCampaigns(); // Refresh the list
      } catch (err) {
        setError('Failed to delete campaign');
        console.error('Error deleting campaign:', err);
      }
    }
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

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': 'badge-warning',
      'approved': 'badge-success',
      'active': 'badge-primary',
      'paused': 'badge-secondary',
      'completed': 'badge-info',
      'rejected': 'badge-error'
    };

    return (
      <span className={`badge ${statusColors[status] || 'badge-secondary'}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (advertiserType) => {
    return (
      <span className={`badge ${advertiserType === 'internal' ? 'badge-primary' : 'badge-accent'}`}>
        {advertiserType === 'internal' ? 'Internal' : 'External'}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Unified Campaign Dashboard</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => window.location.href = '/campaigns/create'} 
              className="btn btn-primary"
            >
              Create Campaign
            </button>
            <button 
              onClick={fetchCampaigns} 
              className="btn btn-outline btn-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat bg-base-100 shadow rounded-lg">
            <div className="stat-title">Total Campaigns</div>
            <div className="stat-value text-primary">{stats.total}</div>
            <div className="stat-desc">
              {stats.internal} internal, {stats.external} external
            </div>
          </div>

          <div className="stat bg-base-100 shadow rounded-lg">
            <div className="stat-title">Active Campaigns</div>
            <div className="stat-value text-success">{stats.active}</div>
            <div className="stat-desc">{stats.pending} pending</div>
          </div>

          <div className="stat bg-base-100 shadow rounded-lg">
            <div className="stat-title">Total Budget</div>
            <div className="stat-value text-info">{formatCurrency(stats.totalBudget)}</div>
            <div className="stat-desc">All campaigns</div>
          </div>

          <div className="stat bg-base-100 shadow rounded-lg">
            <div className="stat-title">Revenue Potential</div>
            <div className="stat-value text-accent">{formatCurrency(stats.totalRevenue)}</div>
            <div className="stat-desc">External campaigns</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed">
          <button 
            className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Campaigns ({stats.total})
          </button>
          <button 
            className={`tab ${activeTab === 'internal' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('internal')}
          >
            Internal ({stats.internal})
          </button>
          <button 
            className={`tab ${activeTab === 'external' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('external')}
          >
            External ({stats.external})
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Campaigns List */}
        {!Array.isArray(campaigns) || campaigns.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Campaigns Found</h3>
            <p className="text-gray-500">
              {activeTab === 'all' 
                ? 'No campaigns have been created yet.'
                : `No ${activeTab} campaigns found.`
              }
            </p>
            {!Array.isArray(campaigns) && (
              <p className="text-red-500 mt-2">
                Debug: campaigns is not an array. Type: {typeof campaigns}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Name/Title</th>
                  <th>Type</th>
                  <th>Asset</th>
                  <th>Dates</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <div>
                        <div className="font-bold">
                          {campaign.advertiser_type === 'internal' ? campaign.title : campaign.name}
                        </div>
                        {campaign.advertiser_type === 'internal' && (
                          <div className="text-sm opacity-50">
                            LOB: {campaign.lob}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{getTypeBadge(campaign.advertiser_type)}</td>
                    <td>
                      {campaign.asset_name || 'N/A'}
                      {campaign.asset_level && (
                        <div className="text-sm opacity-50">
                          {campaign.asset_level}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm">
                        <div>{formatDate(campaign.start_date)}</div>
                        <div>to {formatDate(campaign.end_date)}</div>
                      </div>
                    </td>
                    <td>{formatCurrency(campaign.budget || 0)}</td>
                    <td>{getStatusBadge(campaign.status)}</td>
                    <td>
                      <div className="flex space-x-2">
                        {/* Edit button - only show for draft/pending campaigns */}
                        {(campaign.status === 'draft' || campaign.status === 'pending') && (
                          <button 
                            className="btn btn-xs btn-outline btn-info"
                            onClick={() => window.location.href = `/campaigns/edit/${campaign.id}`}
                          >
                            Edit
                          </button>
                        )}
                        
                        {/* Activate button - only show for draft/pending campaigns */}
                        {(campaign.status === 'draft' || campaign.status === 'pending') && (
                          <button 
                            className="btn btn-xs btn-outline btn-success"
                            onClick={() => handleStatusChange(campaign.id, 'active')}
                          >
                            Activate
                          </button>
                        )}
                        
                        {/* Pause button - only show for active campaigns */}
                        {campaign.status === 'active' && (
                          <button 
                            className="btn btn-xs btn-outline btn-warning"
                            onClick={() => handleStatusChange(campaign.id, 'paused')}
                          >
                            Pause
                          </button>
                        )}
                        
                        {/* Resume button - only show for paused campaigns */}
                        {campaign.status === 'paused' && (
                          <button 
                            className="btn btn-xs btn-outline btn-success"
                            onClick={() => handleStatusChange(campaign.id, 'active')}
                          >
                            Resume
                          </button>
                        )}
                        
                        {/* Complete button - show for active/paused campaigns */}
                        {(campaign.status === 'active' || campaign.status === 'paused') && (
                          <button 
                            className="btn btn-xs btn-outline btn-info"
                            onClick={() => handleStatusChange(campaign.id, 'completed')}
                          >
                            Complete
                          </button>
                        )}
                        
                        {/* Delete button - only show for draft/pending campaigns */}
                        {(campaign.status === 'draft' || campaign.status === 'pending') && (
                          <button 
                            className="btn btn-xs btn-outline btn-error"
                            onClick={() => handleDelete(campaign.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UnifiedCampaignDashboard; 