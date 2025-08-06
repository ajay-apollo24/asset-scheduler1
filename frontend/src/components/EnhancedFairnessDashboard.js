// Enhanced Fairness Dashboard Component
// This component provides a comprehensive view of the enhanced fairness system
// including ROI normalization, slot allocation, and fairness metrics

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';

const EnhancedFairnessDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [fairnessData, setFairnessData] = useState({
    overview: {},
    slotAllocation: {},
    bidCaps: [],
    roiMetrics: {},
    fairnessAnalysis: []
  });

  useEffect(() => {
    fetchFairnessData();
  }, []);

  const fetchFairnessData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all fairness data in parallel
      const [
        fairnessAnalysis,
        bidCaps,
        overview
      ] = await Promise.all([
        apiClient.get('/enhanced-bidding/fairness-analysis?date_range=30'),
        apiClient.get('/enhanced-bidding/bid-caps'),
        apiClient.get('/enhanced-bidding/overview')
      ]);

      setFairnessData({
        fairnessAnalysis: fairnessAnalysis.data.fairnessAnalysis || [],
        bidCaps: bidCaps.data.bidCaps || [],
        overview: overview.data || {}
      });

    } catch (err) {
      setError('Failed to fetch fairness data');
      console.error('Error fetching fairness data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFairnessScoreColor = (score) => {
    if (score >= 1.5) return 'text-success';
    if (score >= 1.0) return 'text-warning';
    return 'text-error';
  };

  const getROITypeColor = (type) => {
    const colors = {
      'immediate_revenue': 'badge badge-success',
      'engagement': 'badge badge-info',
      'conversion': 'badge badge-warning',
      'revenue': 'badge badge-primary'
    };
    return colors[type] || 'badge badge-neutral';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="enhanced-fairness-dashboard space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Fairness Dashboard</h1>
          <p className="text-gray-600 mt-2">
            ROI normalization and sophisticated fairness scoring system
          </p>
        </div>
        <button 
          onClick={fetchFairnessData} 
          className="btn btn-primary btn-sm"
        >
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs tabs-boxed">
        <button 
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'slot-allocation' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('slot-allocation')}
        >
          Slot Allocation
        </button>
        <button 
          className={`tab ${activeTab === 'bid-caps' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('bid-caps')}
        >
          Bid Caps & Restrictions
        </button>
        <button 
          className={`tab ${activeTab === 'fairness-analysis' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('fairness-analysis')}
        >
          Fairness Analysis
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Fairness Score Distribution */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">Fairness Score Distribution</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>High Fairness (≥1.5)</span>
                  <span className="text-success font-semibold">
                    {fairnessData.fairnessAnalysis.filter(item => item.avg_fairness_score >= 1.5).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Medium Fairness (1.0-1.5)</span>
                  <span className="text-warning font-semibold">
                    {fairnessData.fairnessAnalysis.filter(item => 
                      item.avg_fairness_score >= 1.0 && item.avg_fairness_score < 1.5
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Low Fairness (<1.0)</span>
                  <span className="text-error font-semibold">
                    {fairnessData.fairnessAnalysis.filter(item => item.avg_fairness_score < 1.0).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ROI Normalization Summary */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">ROI Normalization</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Revenue Campaigns</span>
                  <span className="text-success font-semibold">
                    {fairnessData.fairnessAnalysis.filter(item => 
                      ['Monetization', 'Pharmacy'].includes(item.lob)
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Engagement Campaigns</span>
                  <span className="text-info font-semibold">
                    {fairnessData.fairnessAnalysis.filter(item => 
                      ['AI Bot'].includes(item.lob)
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Conversion Campaigns</span>
                  <span className="text-warning font-semibold">
                    {fairnessData.fairnessAnalysis.filter(item => 
                      ['Lab Test', 'Diagnostics'].includes(item.lob)
                    ).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Slot Allocation Summary */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">Slot Protection</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Internal Teams</span>
                  <span className="text-primary font-semibold">60-80%</span>
                </div>
                <div className="flex justify-between">
                  <span>External Campaigns</span>
                  <span className="text-secondary font-semibold">20-40%</span>
                </div>
                <div className="flex justify-between">
                  <span>Monetization Cap</span>
                  <span className="text-accent font-semibold">10-20%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bid Cap Summary */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">Bid Caps</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Internal Teams</span>
                  <span className="text-success font-semibold">2.0x</span>
                </div>
                <div className="flex justify-between">
                  <span>External Campaigns</span>
                  <span className="text-warning font-semibold">1.5x</span>
                </div>
                <div className="flex justify-between">
                  <span>Monetization</span>
                  <span className="text-error font-semibold">1.2x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slot Allocation Tab */}
      {activeTab === 'slot-allocation' && (
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl">Slot Allocation Rules</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Asset Level</th>
                      <th>Internal Teams</th>
                      <th>External Campaigns</th>
                      <th>Monetization Cap</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-semibold">Primary</td>
                      <td className="text-success">60%</td>
                      <td className="text-warning">40%</td>
                      <td className="text-error">20%</td>
                      <td>Highest value, most visible assets</td>
                    </tr>
                    <tr>
                      <td className="font-semibold">Secondary</td>
                      <td className="text-success">70%</td>
                      <td className="text-warning">30%</td>
                      <td className="text-error">15%</td>
                      <td>Moderate value, good visibility</td>
                    </tr>
                    <tr>
                      <td className="font-semibold">Tertiary</td>
                      <td className="text-success">80%</td>
                      <td className="text-warning">20%</td>
                      <td className="text-error">10%</td>
                      <td>Lower value, limited visibility</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Internal Team Protection */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg text-success">Internal Team Protection</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Guaranteed slot access (60-80%)</li>
                  <li>• Higher bid multipliers (up to 2.0x)</li>
                  <li>• No time restrictions</li>
                  <li>• Fairness bonuses for strategic LOBs</li>
                  <li>• Time-based fairness considerations</li>
                </ul>
              </div>
            </div>

            {/* Monetization Restrictions */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg text-error">Monetization Restrictions</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Strict slot limits (10-20%)</li>
                  <li>• Lower bid multipliers (1.2x)</li>
                  <li>• Business hours only</li>
                  <li>• Revenue floor requirements</li>
                  <li>• Performance penalties</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bid Caps Tab */}
      {activeTab === 'bid-caps' && (
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl">Bid Caps & Restrictions</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>LOB</th>
                      <th>Asset Level</th>
                      <th>Max Bid Multiplier</th>
                      <th>Slot Limit</th>
                      <th>Time Restriction</th>
                      <th>Revenue Floor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fairnessData.bidCaps.map((cap, index) => (
                      <tr key={index}>
                        <td className="font-semibold">{cap.lob}</td>
                        <td className="capitalize">{cap.asset_level}</td>
                        <td className="font-mono">{cap.max_bid_multiplier}x</td>
                        <td>{cap.slot_limit_percentage > 0 ? `${cap.slot_limit_percentage}%` : 'No limit'}</td>
                        <td className="capitalize">{cap.time_restriction.replace('_', ' ')}</td>
                        <td>{cap.revenue_floor > 1 ? `${cap.revenue_floor}x` : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Internal Campaign Rules */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg text-success">Internal Campaign Rules</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Max Bid Multiplier:</span>
                    <span className="font-semibold">2.0x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fairness Bonus:</span>
                    <span className="font-semibold">30%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time Decay Bonus:</span>
                    <span className="font-semibold">20%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Strategic Bonus:</span>
                    <span className="font-semibold">40%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slot Guarantee:</span>
                    <span className="font-semibold text-success">Yes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* External Campaign Rules */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg text-warning">External Campaign Rules</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Max Bid Multiplier:</span>
                    <span className="font-semibold">1.5x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue Requirement:</span>
                    <span className="font-semibold">80%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Performance Penalty:</span>
                    <span className="font-semibold">20%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slot Guarantee:</span>
                    <span className="font-semibold text-error">No</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monetization Rules */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg text-error">Monetization Rules</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Max Bid Multiplier:</span>
                    <span className="font-semibold">1.2x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slot Limit:</span>
                    <span className="font-semibold">20%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue Floor:</span>
                    <span className="font-semibold">1.5x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time Restriction:</span>
                    <span className="font-semibold">Business Hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slot Guarantee:</span>
                    <span className="font-semibold text-error">No</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fairness Analysis Tab */}
      {activeTab === 'fairness-analysis' && (
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl">Fairness Analysis (Last 30 Days)</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>LOB</th>
                      <th>Asset ID</th>
                      <th>Avg Fairness Score</th>
                      <th>Total Bids</th>
                      <th>Avg ROI</th>
                      <th>Avg Strategic Weight</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fairnessData.fairnessAnalysis.map((item, index) => (
                      <tr key={index}>
                        <td className="font-semibold">{item.lob}</td>
                        <td className="font-mono">{item.asset_id}</td>
                        <td className={`font-semibold ${getFairnessScoreColor(item.avg_fairness_score)}`}>
                          {item.avg_fairness_score?.toFixed(2) || 'N/A'}
                        </td>
                        <td>{item.total_bids}</td>
                        <td className="font-mono">{item.avg_roi?.toFixed(2) || 'N/A'}</td>
                        <td className="font-mono">{item.avg_strategic_weight?.toFixed(2) || 'N/A'}</td>
                        <td>
                          {item.avg_fairness_score >= 1.5 ? (
                            <span className="badge badge-success">High Fairness</span>
                          ) : item.avg_fairness_score >= 1.0 ? (
                            <span className="badge badge-warning">Medium Fairness</span>
                          ) : (
                            <span className="badge badge-error">Low Fairness</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ROI Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {fairnessData.fairnessAnalysis.slice(0, 4).map((item, index) => (
              <div key={index} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title text-lg">{item.lob}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Fairness Score:</span>
                      <span className={`font-semibold ${getFairnessScoreColor(item.avg_fairness_score)}`}>
                        {item.avg_fairness_score?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Bids:</span>
                      <span className="font-semibold">{item.total_bids}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg ROI:</span>
                      <span className="font-semibold">{item.avg_roi?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Strategic Weight:</span>
                      <span className="font-semibold">{item.avg_strategic_weight?.toFixed(2) || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFairnessDashboard; 