import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/apiClient';

const CampaignForm = ({ onCreated, onCancel, campaign = null }) => {
  const { user, hasPermission, isPlatformAdmin } = useAuth();
  const [advertisers, setAdvertisers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    advertiser_id: '',
    budget: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    goal_type: '',
    goal_value: '',
    pacing: 'even',
    pricing_model: 'cpm',
    frequency_cap: '',
    day_parting: '',
    targeting_criteria: {
      demographics: { age: '', gender: '', interests: '' },
      geo: { countries: '', cities: '' },
      device: { desktop: true, mobile: true, tablet: true }
    }
  });

  const canCreateCampaign = hasPermission('campaign:create');
  const canSelectAdvertiser = isPlatformAdmin();

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        advertiser_id: campaign.advertiser_id || '',
        budget: campaign.budget || '',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        status: campaign.status || 'draft',
        goal_type: campaign.goal_type || '',
        goal_value: campaign.goal_value || '',
        pacing: campaign.pacing || 'even',
        pricing_model: campaign.pricing_model || 'cpm',
        frequency_cap: campaign.frequency_cap || '',
        day_parting: campaign.day_parting
          ? (typeof campaign.day_parting === 'string'
            ? campaign.day_parting
            : JSON.stringify(campaign.day_parting))
          : '',
        targeting_criteria: campaign.targeting_criteria ?
          (typeof campaign.targeting_criteria === 'string' ?
            JSON.parse(campaign.targeting_criteria) : campaign.targeting_criteria) :
          { demographics: { age: '', gender: '', interests: '' }, geo: { countries: '', cities: '' }, device: { desktop: true, mobile: true, tablet: true } }
      });
    } else {
      // Set advertiser_id for non-admin users
      if (user && !isPlatformAdmin()) {
        setFormData(prev => ({ ...prev, advertiser_id: user.id }));
      }
    }
  }, [campaign, user, isPlatformAdmin]);

  useEffect(() => {
    const fetchAdvertisers = async () => {
      try {
        const response = await apiClient.get('/users');
        setAdvertisers(response.data);
      } catch (error) {
        console.error('Failed to fetch advertisers:', error);
      }
    };

    if (canSelectAdvertiser) {
      fetchAdvertisers();
    }
  }, [canSelectAdvertiser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canCreateCampaign) {
      alert('You do not have permission to create campaigns');
      return;
    }

    setLoading(true);
    try {
      const campaignData = {
        ...formData,
        targeting_criteria: JSON.stringify(formData.targeting_criteria)
      };

      if (formData.goal_value !== '') {
        campaignData.goal_value = parseFloat(formData.goal_value);
      }
      if (formData.frequency_cap !== '') {
        campaignData.frequency_cap = parseInt(formData.frequency_cap, 10);
      }
      if (formData.day_parting) {
        try {
          campaignData.day_parting = JSON.parse(formData.day_parting);
        } catch (err) {
          console.error('Invalid day parting JSON:', err);
          alert('Day parting must be valid JSON');
          setLoading(false);
          return;
        }
      }

      if (campaign) {
        await apiClient.put(`/ad-server/campaigns/${campaign.id}`, campaignData);
      } else {
        await apiClient.post('/ad-server/campaigns', campaignData);
      }

      if (onCreated) onCreated();
    } catch (error) {
      console.error('Failed to save campaign:', error);
      alert('Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTargetingChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      targeting_criteria: {
        ...prev.targeting_criteria,
        [section]: {
          ...prev.targeting_criteria[section],
          [field]: value
        }
      }
    }));
  };

  if (!canCreateCampaign) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">You do not have permission to create campaigns.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Campaign Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Advertiser *
        </label>
        {canSelectAdvertiser ? (
          <select
            name="advertiser_id"
            value={formData.advertiser_id}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Advertiser</option>
            {advertisers.map(advertiser => (
              <option key={advertiser.id} value={advertiser.id}>
                {advertiser.email}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={user?.email || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Budget *
          </label>
          <input
            type="number"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date *
          </label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Goal and Pricing Settings */}
      <div className="border-t pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goal Type
            </label>
            <select
              name="goal_type"
              value={formData.goal_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Goal</option>
              <option value="impressions">Impressions</option>
              <option value="clicks">Clicks</option>
              <option value="conversions">Conversions</option>
              <option value="spend">Spend</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goal Value
            </label>
            <input
              type="number"
              name="goal_value"
              value={formData.goal_value}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pacing
            </label>
            <select
              name="pacing"
              value={formData.pacing}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="even">Even</option>
              <option value="asap">ASAP</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pricing Model
            </label>
            <select
              name="pricing_model"
              value={formData.pricing_model}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cpm">CPM</option>
              <option value="cpc">CPC</option>
              <option value="cpa">CPA</option>
              <option value="flat">Flat Fee</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequency Cap
            </label>
            <input
              type="number"
              name="frequency_cap"
              value={formData.frequency_cap}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Day Parting (JSON)
            </label>
            <textarea
              name="day_parting"
              value={formData.day_parting}
              onChange={handleChange}
              placeholder='{"monday":["09:00-17:00"]}'
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
            />
          </div>
        </div>
      </div>

      {/* Targeting Criteria */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Targeting Criteria</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Demographics
            </label>
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Age (e.g., 18-35)"
                value={formData.targeting_criteria.demographics.age}
                onChange={(e) => handleTargetingChange('demographics', 'age', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Gender"
                value={formData.targeting_criteria.demographics.gender}
                onChange={(e) => handleTargetingChange('demographics', 'gender', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Interests"
                value={formData.targeting_criteria.demographics.interests}
                onChange={(e) => handleTargetingChange('demographics', 'interests', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Geographic
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Countries (e.g., US, CA, UK)"
                value={formData.targeting_criteria.geo.countries}
                onChange={(e) => handleTargetingChange('geo', 'countries', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Cities"
                value={formData.targeting_criteria.geo.cities}
                onChange={(e) => handleTargetingChange('geo', 'cities', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device Types
            </label>
            <div className="flex space-x-4">
              {Object.keys(formData.targeting_criteria.device).map(device => (
                <label key={device} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.targeting_criteria.device[device]}
                    onChange={(e) => handleTargetingChange('device', device, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 capitalize">{device}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : (campaign ? 'Update Campaign' : 'Create Campaign')}
        </button>
      </div>

      {/* Permission indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-2">
          Permissions: Create={canCreateCampaign ? 'Yes' : 'No'}, SelectAdvertiser={canSelectAdvertiser ? 'Yes' : 'No'}
        </div>
      )}
    </form>
  );
};

export default CampaignForm; 