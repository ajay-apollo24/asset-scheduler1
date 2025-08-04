import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const CampaignCard = ({ campaign, onStatusChange, formatCurrency, formatNumber }) => {
  const { user, hasPermission, hasRole, isPlatformAdmin } = useAuth();

  const canUpdateCampaign = hasPermission('campaign:update');
  const canDeleteCampaign = hasPermission('campaign:delete');
  const canPauseCampaign = hasPermission('campaign:pause');
  const isCampaignOwner = campaign.advertiser_id === user?.id;
  const canManageThisCampaign = isPlatformAdmin() || isCampaignOwner;

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = (newStatus) => {
    if (onStatusChange) {
      onStatusChange(campaign.id, newStatus);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
          <p className="text-sm text-gray-600">Advertiser: {campaign.advertiser_name || 'Unknown'}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
          {campaign.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Budget</p>
          <p className="font-semibold">{formatCurrency(campaign.budget)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Spent</p>
          <p className="font-semibold">{formatCurrency(campaign.spent)}</p>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Budget Usage</span>
          <span>{Math.round((campaign.spent / campaign.budget) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Goal</p>
          <p className="font-semibold">
            {campaign.goal_value ? `${campaign.goal_value} ${campaign.goal_type}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Pacing</p>
          <p className="font-semibold capitalize">{campaign.pacing}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Pricing</p>
          <p className="font-semibold uppercase">{campaign.pricing_model}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Freq Cap</p>
          <p className="font-semibold">{campaign.frequency_cap || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Impressions</p>
          <p className="font-semibold">{formatNumber(campaign.impressions)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Clicks</p>
          <p className="font-semibold">{formatNumber(campaign.clicks)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">CTR</p>
          <p className="font-semibold">{campaign.ctr}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Revenue</p>
          <p className="font-semibold">{formatCurrency(campaign.revenue)}</p>
        </div>
      </div>

      {campaign.day_parting && (
        <div className="text-sm text-gray-600 mb-4">
          <p>
            Day Parting: {typeof campaign.day_parting === 'string' ? campaign.day_parting : JSON.stringify(campaign.day_parting)}
          </p>
        </div>
      )}

      <div className="text-sm text-gray-600 mb-4">
        <p>Start: {new Date(campaign.start_date).toLocaleDateString()}</p>
        <p>End: {new Date(campaign.end_date).toLocaleDateString()}</p>
      </div>

      {/* Status Controls - Only show if user has permissions */}
      {canManageThisCampaign && canUpdateCampaign && (
        <div className="flex gap-2 pt-4 border-t">
          {campaign.status === 'draft' && canPauseCampaign && (
            <button
              onClick={() => handleStatusChange('active')}
              className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors"
            >
              Activate
            </button>
          )}
          
          {campaign.status === 'active' && canPauseCampaign && (
            <button
              onClick={() => handleStatusChange('paused')}
              className="flex-1 bg-yellow-600 text-white py-2 px-3 rounded text-sm hover:bg-yellow-700 transition-colors"
            >
              Pause
            </button>
          )}
          
          {campaign.status === 'paused' && canPauseCampaign && (
            <button
              onClick={() => handleStatusChange('active')}
              className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors"
            >
              Resume
            </button>
          )}
          
          {canDeleteCampaign && (
            <button
              onClick={() => handleStatusChange('completed')}
              className="flex-1 bg-gray-600 text-white py-2 px-3 rounded text-sm hover:bg-gray-700 transition-colors"
            >
              Complete
            </button>
          )}
        </div>
      )}

      {/* Permission indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-400">
          Permissions: {canUpdateCampaign ? 'Update' : ''} {canDeleteCampaign ? 'Delete' : ''} {canPauseCampaign ? 'Pause' : ''}
        </div>
      )}
    </div>
  );
};

export default CampaignCard; 