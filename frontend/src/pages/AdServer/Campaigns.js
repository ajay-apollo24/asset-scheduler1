import { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import Layout from '../../components/Layout';
import CampaignCard from '../../components/AdServer/CampaignCard';
import CampaignStats from '../../components/AdServer/CampaignStats';
import CampaignForm from '../../components/AdServer/CampaignForm';
import Modal from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    completed: 0,
    totalSpend: 0,
    totalImpressions: 0,
    avgCTR: 0,
    totalRevenue: 0
  });

  const { user, isAdmin } = useAuth();

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Starting to fetch campaigns...');
      console.log('👤 Current user:', user);
      console.log('🔑 Token in localStorage:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      const response = await apiClient.get('/ad-server/campaigns');
      console.log('📊 Campaigns response:', response.data);
      console.log('📈 Response status:', response.status);
      console.log('📋 Response headers:', response.headers);
      
      let campaignsData = response.data;
      
      // Filter campaigns based on user role
      if (!isAdmin) {
        campaignsData = campaignsData.filter(campaign => campaign.advertiser_id === user?.id);
        console.log('🔍 Filtered campaigns for user:', campaignsData.length, 'of', response.data.length);
      } else {
        console.log('👑 Admin user - showing all campaigns');
      }
      
      setCampaigns(campaignsData);
      
      // Calculate stats
      const total = response.data.length;
      const active = response.data.filter(c => c.status === 'active').length;
      const paused = response.data.filter(c => c.status === 'paused').length;
      const completed = response.data.filter(c => c.status === 'completed').length;
      
      const totalSpend = response.data.reduce((sum, c) => sum + (parseFloat(c.spent || 0)), 0);
      const totalImpressions = response.data.reduce((sum, c) => sum + (parseInt(c.impressions || 0)), 0);
      const totalClicks = response.data.reduce((sum, c) => sum + (parseInt(c.clicks || 0)), 0);
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const totalRevenue = response.data.reduce((sum, c) => sum + (parseFloat(c.revenue || 0)), 0);

      console.log('📊 Calculated stats:', {
        total,
        active,
        paused,
        completed,
        totalSpend,
        totalImpressions,
        avgCTR,
        totalRevenue
      });

      setStats({
        total,
        active,
        paused,
        completed,
        totalSpend,
        totalImpressions,
        avgCTR,
        totalRevenue
      });
    } catch (err) {
      setError('Failed to load campaigns');
      console.error('❌ Error fetching campaigns:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: err.config,
        stack: err.stack
      });
    } finally {
      setLoading(false);
      console.log('🏁 Finished fetchCampaigns operation');
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      await apiClient.put(`/ad-server/campaigns/${campaignId}`, { status: newStatus });
      fetchCampaigns(); // Refresh data
      setError('');
    } catch (err) {
      setError(`Failed to ${newStatus} campaign`);
    }
  };

  const handleCreateSuccess = () => {
    fetchCampaigns();
    setShowCreateForm(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
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
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Campaign Management</h1>
          {(isAdmin() || user?.roles?.some(role => role.name === 'requestor')) && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create Campaign
            </button>
          )}
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* Campaign Stats Overview */}
        <CampaignStats stats={stats} formatCurrency={formatCurrency} formatNumber={formatNumber} />

        {/* Campaign Status Filters */}
        <div className="flex gap-2 mb-6">
          <button className="btn btn-sm btn-outline">All ({stats.total})</button>
          <button className="btn btn-sm btn-success">Active ({stats.active})</button>
          <button className="btn btn-sm btn-warning">Paused ({stats.paused})</button>
          <button className="btn btn-sm btn-info">Completed ({stats.completed})</button>
        </div>

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first campaign</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onStatusChange={handleStatusChange}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateForm && (
        <Modal onClose={() => setShowCreateForm(false)}>
          <CampaignForm
            onCreated={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        </Modal>
      )}
    </Layout>
  );
};

export default Campaigns; 