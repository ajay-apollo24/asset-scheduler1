import React, { useState } from 'react';

const CampaignCard = ({ campaign, onStatusChange, formatCurrency, formatNumber }) => {
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'paused': return 'badge-warning';
      case 'completed': return 'badge-info';
      case 'draft': return 'badge-ghost';
      default: return 'badge-ghost';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🟢';
      case 'paused': return '🟡';
      case 'completed': return '🔵';
      case 'draft': return '⚪';
      default: return '⚪';
    }
  };

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      await onStatusChange(campaign.id, newStatus);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateCTR = () => {
    if (!campaign.impressions || campaign.impressions === 0) return 0;
    return ((campaign.clicks || 0) / campaign.impressions * 100).toFixed(2);
  };

  const calculateBudgetUsage = () => {
    if (!campaign.budget) return 0;
    return ((campaign.spent || 0) / campaign.budget * 100).toFixed(1);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 truncate">{campaign.name}</h3>
          <span className={`badge ${getStatusColor(campaign.status)} badge-sm`}>
            {getStatusIcon(campaign.status)} {campaign.status}
          </span>
        </div>
        
        <div className="text-sm text-gray-600 space-y-1">
          <div>Advertiser: {campaign.advertiser_name || 'N/A'}</div>
          <div>Budget: {formatCurrency(campaign.budget || 0)}</div>
          <div>Spent: {formatCurrency(campaign.spent || 0)}</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Impressions</div>
            <div className="font-semibold">{formatNumber(campaign.impressions || 0)}</div>
          </div>
          <div>
            <div className="text-gray-600">Clicks</div>
            <div className="font-semibold">{formatNumber(campaign.clicks || 0)}</div>
          </div>
          <div>
            <div className="text-gray-600">CTR</div>
            <div className="font-semibold">{calculateCTR()}%</div>
          </div>
          <div>
            <div className="text-gray-600">Revenue</div>
            <div className="font-semibold">{formatCurrency(campaign.revenue || 0)}</div>
          </div>
        </div>

        {/* Budget Progress Bar */}
        {campaign.budget && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Budget Usage</span>
              <span>{calculateBudgetUsage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(calculateBudgetUsage(), 100)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="p-4 border-b">
        <div className="text-sm text-gray-600 space-y-1">
          <div>Start: {formatDate(campaign.start_date)}</div>
          <div>End: {formatDate(campaign.end_date)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4">
        <div className="flex gap-2">
          {/* Status Controls */}
          {campaign.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('active')}
              disabled={loading}
              className="btn btn-sm btn-success flex-1"
            >
              {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Activate'}
            </button>
          )}
          
          {campaign.status === 'active' && (
            <button
              onClick={() => handleStatusChange('paused')}
              disabled={loading}
              className="btn btn-sm btn-warning flex-1"
            >
              {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Pause'}
            </button>
          )}
          
          {campaign.status === 'paused' && (
            <button
              onClick={() => handleStatusChange('active')}
              disabled={loading}
              className="btn btn-sm btn-success flex-1"
            >
              {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Resume'}
            </button>
          )}

          {/* View Details */}
          <button className="btn btn-sm btn-outline">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignCard; 