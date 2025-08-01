import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('ad-server');
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ad Server Data
  const [adServerData, setAdServerData] = useState([]);
  const [adServerSummary, setAdServerSummary] = useState({});
  const [adServerDaily, setAdServerDaily] = useState([]);

  // Asset Data
  const [assetData, setAssetData] = useState([]);
  const [assetSummary, setAssetSummary] = useState({});
  const [assetDaily, setAssetDaily] = useState([]);

  // Legacy Data
  const [legacyData, setLegacyData] = useState([]);

  const { hasPermission } = useAuth();

  const fetchAdServerData = useCallback(async () => {
    if (!hasPermission('reports:read')) return;
    
    try {
      setLoading(true);
      setError('');
      
      const [performanceRes, summaryRes, dailyRes] = await Promise.all([
        apiClient.get(`/reports/ad-server/performance?from=${from}&to=${to}`),
        apiClient.get(`/reports/ad-server/summary?from=${from}&to=${to}`),
        apiClient.get(`/reports/daily-metrics?from=${from}&to=${to}&type=ad_server`)
      ]);

      setAdServerData(performanceRes.data);
      setAdServerSummary(summaryRes.data);
      setAdServerDaily(dailyRes.data);
    } catch (err) {
      setError('Failed to load ad server data');
      console.error('Ad server data error:', err);
    } finally {
      setLoading(false);
    }
  }, [from, to, hasPermission]);

  const fetchAssetData = useCallback(async () => {
    if (!hasPermission('reports:read')) return;
    
    try {
      setLoading(true);
      setError('');
      
      const [performanceRes, summaryRes, dailyRes] = await Promise.all([
        apiClient.get(`/reports/assets/performance?from=${from}&to=${to}`),
        apiClient.get(`/reports/assets/summary?from=${from}&to=${to}`),
        apiClient.get(`/reports/daily-metrics?from=${from}&to=${to}&type=assets`)
      ]);

      setAssetData(performanceRes.data);
      setAssetSummary(summaryRes.data);
      setAssetDaily(dailyRes.data);
    } catch (err) {
      setError('Failed to load asset data');
      console.error('Asset data error:', err);
    } finally {
      setLoading(false);
    }
  }, [from, to, hasPermission]);

  const fetchLegacyData = useCallback(async () => {
    if (!hasPermission('reports:read')) return;
    
    try {
      setLoading(true);
      setError('');
      
      const response = await apiClient.get(`/reports/performance?from=${from}&to=${to}`);
      setLegacyData(response.data);
    } catch (err) {
      setError('Failed to load legacy data');
      console.error('Legacy data error:', err);
    } finally {
      setLoading(false);
    }
  }, [from, to, hasPermission]);

  useEffect(() => {
    if (activeTab === 'ad-server') {
      fetchAdServerData();
    } else if (activeTab === 'assets') {
      fetchAssetData();
    } else if (activeTab === 'legacy') {
      fetchLegacyData();
    }
  }, [activeTab, fetchAdServerData, fetchAssetData, fetchLegacyData]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const SummaryCard = ({ title, value, subtitle, icon, color = 'bg-blue-500' }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white text-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const AdServerTab = () => (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Campaigns"
          value={adServerSummary.total_campaigns || 0}
          icon="📊"
          color="bg-blue-500"
        />
        <SummaryCard
          title="Total Impressions"
          value={formatNumber(adServerSummary.total_impressions)}
          icon="👁️"
          color="bg-purple-500"
        />
        <SummaryCard
          title="Total Clicks"
          value={formatNumber(adServerSummary.total_clicks)}
          icon="🖱️"
          color="bg-green-500"
        />
        <SummaryCard
          title="Overall CTR"
          value={formatPercentage(adServerSummary.overall_ctr)}
          icon="📈"
          color="bg-indigo-500"
        />
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Campaign Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm">
                <th className="p-3">Campaign</th>
                <th className="p-3">Creative</th>
                <th className="p-3">Status</th>
                <th className="p-3">Impressions</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">CTR</th>
                <th className="p-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {adServerData.map((row, index) => (
                <tr key={index} className="border-b text-sm hover:bg-gray-50">
                  <td className="p-3 font-medium">{row.campaign_name}</td>
                  <td className="p-3">{row.creative_name || 'N/A'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      row.campaign_status === 'active' ? 'bg-green-100 text-green-800' :
                      row.campaign_status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {row.campaign_status}
                    </span>
                  </td>
                  <td className="p-3">{formatNumber(row.impressions)}</td>
                  <td className="p-3">{formatNumber(row.clicks)}</td>
                  <td className="p-3">{formatPercentage(row.ctr)}</td>
                  <td className="p-3">{formatCurrency(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const AssetsTab = () => (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Assets"
          value={assetSummary.total_assets || 0}
          icon="🏢"
          color="bg-blue-500"
        />
        <SummaryCard
          title="Total Bookings"
          value={formatNumber(assetSummary.total_bookings)}
          icon="📅"
          color="bg-green-500"
        />
        <SummaryCard
          title="Total Ad Requests"
          value={formatNumber(assetSummary.total_ad_requests)}
          icon="📡"
          color="bg-purple-500"
        />
        <SummaryCard
          title="Overall CTR"
          value={formatPercentage(assetSummary.overall_ctr)}
          icon="📈"
          color="bg-indigo-500"
        />
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Asset Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm">
                <th className="p-3">Asset</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Bookings</th>
                <th className="p-3">Ad Requests</th>
                <th className="p-3">Impressions</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">CTR</th>
                <th className="p-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {assetData.map((row, index) => (
                <tr key={index} className="border-b text-sm hover:bg-gray-50">
                  <td className="p-3 font-medium">{row.asset_name}</td>
                  <td className="p-3">{row.asset_type}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      row.asset_status === 'active' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {row.asset_status}
                    </span>
                  </td>
                  <td className="p-3">{formatNumber(row.total_bookings)}</td>
                  <td className="p-3">{formatNumber(row.total_ad_requests)}</td>
                  <td className="p-3">{formatNumber(row.total_impressions)}</td>
                  <td className="p-3">{formatNumber(row.total_clicks)}</td>
                  <td className="p-3">{formatPercentage(row.ctr)}</td>
                  <td className="p-3">{formatCurrency(row.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const LegacyTab = () => (
    <div>
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Legacy Performance Report</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm">
                <th className="p-3">LOB</th>
                <th className="p-3">Impressions</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">CTR</th>
              </tr>
            </thead>
            <tbody>
              {legacyData.map((row, index) => (
                <tr key={index} className="border-b text-sm">
                  <td className="p-3">{row.lob}</td>
                  <td className="p-3">{formatNumber(row.impressions)}</td>
                  <td className="p-3">{formatNumber(row.clicks)}</td>
                  <td className="p-3">{formatPercentage(row.impressions ? (row.clicks / row.impressions) * 100 : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-4">Analytics & Reports</h1>
        
        {/* Date Range Selector */}
        <div className="flex gap-2 mb-6">
          <input 
            type="date" 
            value={from} 
            onChange={(e) => setFrom(e.target.value)} 
            className="border p-2 rounded text-sm"
          />
          <input 
            type="date" 
            value={to} 
            onChange={(e) => setTo(e.target.value)} 
            className="border p-2 rounded text-sm"
          />
          <button 
            onClick={() => {
              if (activeTab === 'ad-server') fetchAdServerData();
              else if (activeTab === 'assets') fetchAssetData();
              else if (activeTab === 'legacy') fetchLegacyData();
            }} 
            className="btn btn-primary btn-sm"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tabs tabs-boxed mb-6">
          <button 
            className={`tab ${activeTab === 'ad-server' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ad-server')}
          >
            📊 Ad Server Reports
          </button>
          <button 
            className={`tab ${activeTab === 'assets' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            🏢 Asset Reports
          </button>
          <button 
            className={`tab ${activeTab === 'legacy' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('legacy')}
          >
            📈 Legacy Reports
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        ) : (
          <>
            {activeTab === 'ad-server' && <AdServerTab />}
            {activeTab === 'assets' && <AssetsTab />}
            {activeTab === 'legacy' && <LegacyTab />}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Reports; 