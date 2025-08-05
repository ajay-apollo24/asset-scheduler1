import Layout from '../components/Layout';
import CalendarView from '../components/CalendarView';
import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { hasPermission } = useAuth();
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalCampaigns: 0,
    internalCampaigns: 0,
    externalCampaigns: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const promises = [];
      const newStats = { ...stats };

      // Only fetch data for endpoints the user has permission to access
      if (hasPermission('campaign:read')) {
        promises.push(
          apiClient.get('/assets').then(res => { 
            newStats.totalAssets = res.data.length; 
          }).catch((err) => {
            console.error('Error fetching assets:', err);
          }),
          apiClient.get('/campaigns').then(res => { 
            // Handle the unified campaign API response format
            const campaigns = res.data && res.data.campaigns ? res.data.campaigns : 
                             Array.isArray(res.data) ? res.data : [];
            newStats.totalCampaigns = campaigns.length;
            newStats.internalCampaigns = campaigns.filter(c => c.advertiser_type === 'internal').length;
            newStats.externalCampaigns = campaigns.filter(c => c.advertiser_type === 'external').length;
          }).catch((err) => {
            console.error('Error fetching campaigns:', err);
          })
        );
      }

      // Wait for all API calls to complete
      await Promise.all(promises);
      setStats(newStats);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {hasPermission('campaign:read') && (
            <>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-sm font-medium text-gray-600">Total Assets</div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalAssets}</div>
                <div className="mt-2">
                  <Link to="/assets" className="text-blue-600 hover:text-blue-800 text-sm">View Assets →</Link>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-sm font-medium text-gray-600">Total Campaigns</div>
                <div className="text-2xl font-bold text-purple-600">{stats.totalCampaigns}</div>
                <div className="mt-2">
                  <Link to="/campaigns" className="text-purple-600 hover:text-purple-800 text-sm">View Campaigns →</Link>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-sm font-medium text-gray-600">Internal Campaigns</div>
                <div className="text-2xl font-bold text-green-600">{stats.internalCampaigns}</div>
                <div className="mt-2">
                  <Link to="/campaigns" className="text-green-600 hover:text-green-800 text-sm">View Internal →</Link>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-sm font-medium text-gray-600">External Campaigns</div>
                <div className="text-2xl font-bold text-blue-600">{stats.externalCampaigns}</div>
                <div className="mt-2">
                  <Link to="/campaigns" className="text-blue-600 hover:text-blue-800 text-sm">View External →</Link>
                </div>
              </div>
            </>
          )}

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-sm font-medium text-gray-600">Welcome!</div>
            <div className="text-lg font-semibold text-gray-800">Campaign Manager</div>
            <div className="mt-2 text-sm text-gray-600">
              Manage your campaigns and assets
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hasPermission('campaign:create') && (
            <Link to="/campaigns/create" className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors">
              <div className="font-semibold">Create Campaign</div>
              <div className="text-sm opacity-90">Start a new unified campaign</div>
            </Link>
          )}
          
          {hasPermission('campaign:read') && (
            <>
              <Link to="/assets" className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors">
                <div className="font-semibold">View Assets</div>
                <div className="text-sm opacity-90">Manage advertising assets</div>
              </Link>
              
              <Link to="/campaigns" className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors">
                <div className="font-semibold">View Campaigns</div>
                <div className="text-sm opacity-90">Manage all campaigns</div>
              </Link>
            </>
          )}
        </div>
      </div>

      {hasPermission('analytics:read') && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Calendar View</h2>
          <p className="mb-4 text-gray-600">Use the calendar below to view and manage all campaigns and asset allocations.</p>
          <CalendarView />
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;