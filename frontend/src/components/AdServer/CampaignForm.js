import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';

const CampaignForm = ({ onCreated, onCancel, campaign = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    advertiser_id: '',
    budget: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    targeting_criteria: {
      demographics: {
        age_min: '',
        age_max: '',
        gender: '',
        interests: []
      },
      geo: {
        countries: [],
        cities: [],
        regions: []
      },
      device: {
        desktop: true,
        mobile: true,
        tablet: true
      }
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [advertisers, setAdvertisers] = useState([]);

  const isEditing = !!campaign;

  useEffect(() => {
    fetchAdvertisers();
    
    // Set advertiser_id for non-admin users
    if (user && user.role !== 'admin') {
      setFormData(prev => ({
        ...prev,
        advertiser_id: user.id
      }));
    }
    
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        advertiser_id: campaign.advertiser_id || '',
        budget: campaign.budget || '',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        status: campaign.status || 'draft',
        targeting_criteria: campaign.targeting_criteria || {
          demographics: { age_min: '', age_max: '', gender: '', interests: [] },
          geo: { countries: [], cities: [], regions: [] },
          device: { desktop: true, mobile: true, tablet: true }
        }
      });
    }
  }, [campaign]);

  const fetchAdvertisers = async () => {
    try {
      // Fetch existing users to use as advertisers
      const response = await apiClient.get('/users');
      setAdvertisers(response.data.map(user => ({
        id: user.id,
        name: user.email
      })));
    } catch (err) {
      console.error('Failed to fetch advertisers:', err);
      // Fallback to mock data
      setAdvertisers([
        { id: 1, name: 'admin@company.com' },
        { id: 2, name: 'user@company.com' }
      ]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        budget: parseFloat(formData.budget),
        targeting_criteria: JSON.stringify(formData.targeting_criteria)
      };

      if (isEditing) {
        await apiClient.put(`/ad-server/campaigns/${campaign.id}`, payload);
      } else {
        await apiClient.post('/ad-server/campaigns', payload);
      }

      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? 'Edit Campaign' : 'Create New Campaign'}
      </h2>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Campaign Name *</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                required
                placeholder="Enter campaign name"
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Advertiser *</span>
              </label>
              {user?.role === 'admin' ? (
                <select
                  name="advertiser_id"
                  value={formData.advertiser_id}
                  onChange={handleInputChange}
                  className="select select-bordered w-full"
                  required
                >
                  <option value="">Select advertiser</option>
                  {advertisers.map(advertiser => (
                    <option key={advertiser.id} value={advertiser.id}>
                      {advertiser.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={user?.email || ''}
                  className="input input-bordered w-full"
                  disabled
                />
              )}
            </div>

            <div>
              <label className="label">
                <span className="label-text">Budget (₹) *</span>
              </label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                required
                min="1000"
                step="1000"
                placeholder="50000"
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Status</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="select select-bordered w-full"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Start Date *</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">End Date *</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                required
              />
            </div>
          </div>
        </div>

        {/* Targeting Criteria */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3">Targeting Criteria</h3>
          
          {/* Demographics */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Demographics</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">
                  <span className="label-text">Age Min</span>
                </label>
                <input
                  type="number"
                  value={formData.targeting_criteria.demographics.age_min}
                  onChange={(e) => handleTargetingChange('demographics', 'age_min', e.target.value)}
                  className="input input-bordered w-full"
                  min="18"
                  max="65"
                  placeholder="18"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Age Max</span>
                </label>
                <input
                  type="number"
                  value={formData.targeting_criteria.demographics.age_max}
                  onChange={(e) => handleTargetingChange('demographics', 'age_max', e.target.value)}
                  className="input input-bordered w-full"
                  min="18"
                  max="65"
                  placeholder="65"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Gender</span>
                </label>
                <select
                  value={formData.targeting_criteria.demographics.gender}
                  onChange={(e) => handleTargetingChange('demographics', 'gender', e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Device Targeting */}
          <div>
            <h4 className="text-sm font-medium mb-2">Device Targeting</h4>
            <div className="flex gap-4">
              {Object.entries(formData.targeting_criteria.device).map(([device, enabled]) => (
                <label key={device} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleTargetingChange('device', device, e.target.checked)}
                    className="checkbox checkbox-sm"
                  />
                  <span className="text-sm capitalize">{device}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-outline"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              isEditing ? 'Update Campaign' : 'Create Campaign'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CampaignForm; 