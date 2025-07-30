import Layout from '../components/Layout';
import CalendarView from '../components/CalendarView';
import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalBookings: 0,
    activeAuctions: 0,
    pendingApprovals: 0,
    totalCampaigns: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const [assetsRes, bookingsRes, auctionsRes, approvalsRes, campaignsRes] = await Promise.all([
        apiClient.get('/assets'),
        apiClient.get('/bookings'),
        apiClient.get('/bookings?auction_status=active'),
        apiClient.get('/approvals?status=pending'),
        apiClient.get('/campaigns')
      ]);

      setStats({
        totalAssets: assetsRes.data.length,
        totalBookings: bookingsRes.data.length,
        activeAuctions: auctionsRes.data.length,
        pendingApprovals: approvalsRes.data.length,
        totalCampaigns: campaignsRes.data.length
      });
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
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat bg-base-100 shadow rounded-lg">
            <div className="stat-title">Total Assets</div>
            <div className="stat-value text-primary">{stats.totalAssets}</div>
            <div className="stat-actions">
              <Link to="/assets" className="btn btn-sm btn-primary">View Assets</Link>
            </div>
          </div>
          
          <div className="stat bg-base-100 shadow rounded-lg">
            <div className="stat-title">Total Bookings</div>
            <div className="stat-value text-secondary">{stats.totalBookings}</div>
            <div className="stat-actions">
              <Link to="/bookings" className="btn btn-sm btn-secondary">View Bookings</Link>
            </div>
          </div>
          
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">Active Auctions</div>
          <div className="stat-value text-accent">{stats.activeAuctions}</div>
          <div className="stat-actions">
            <Link to="/bidding" className="btn btn-sm btn-accent">View Auctions</Link>
          </div>
        </div>

        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">Total Campaigns</div>
          <div className="stat-value text-info">{stats.totalCampaigns}</div>
          <div className="stat-actions">
            <Link to="/reports" className="btn btn-sm btn-info">View Campaigns</Link>
          </div>
        </div>

        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">Pending Approvals</div>
          <div className="stat-value text-warning">{stats.pendingApprovals}</div>
          <div className="stat-actions">
            <Link to="/approvals" className="btn btn-sm btn-warning">View Approvals</Link>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Calendar View</h2>
        <p className="mb-4 text-gray-600">Use the calendar below to view and manage campaign bookings.</p>
      </div>
      
      <CalendarView />
    </Layout>
  );
};

export default Dashboard;