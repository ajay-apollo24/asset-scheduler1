// src/components/UnifiedCampaign/UnifiedCampaignForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import unifiedCampaignApi from '../../api/unifiedCampaignApi';
import apiClient from '../../api/apiClient';
import Layout from '../Layout';

const UnifiedCampaignForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [advertiserType, setAdvertiserType] = useState('internal');

  // Form state
  const [formData, setFormData] = useState({
    advertiser_type: 'internal',
    name: '',
    title: '',
    asset_id: '',
    budget: 0,
    start_date: '',
    end_date: '',
    lob: '',
    purpose: '',
    creative_url: '',
    targeting_criteria: {},
    goal_type: '',
    goal_value: '',
    priority_weight: 1.00,
    bidding_strategy: 'manual'
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await apiClient.get('/assets');
      setAssets(response.data);
    } catch (err) {
      console.error('Error fetching assets:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdvertiserTypeChange = (type) => {
    setAdvertiserType(type);
    setFormData(prev => ({
      ...prev,
      advertiser_type: type,
      // Reset type-specific fields
      lob: type === 'internal' ? prev.lob : '',
      purpose: type === 'internal' ? prev.purpose : '',
      targeting_criteria: type === 'external' ? prev.targeting_criteria : {},
      goal_type: type === 'external' ? prev.goal_type : '',
      goal_value: type === 'external' ? prev.goal_value : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields based on advertiser type
      if (advertiserType === 'internal') {
        if (!formData.title || !formData.asset_id || !formData.lob || !formData.purpose || !formData.start_date || !formData.end_date) {
          throw new Error('Please fill in all required fields for internal campaigns');
        }
      } else {
        if (!formData.name || !formData.start_date || !formData.end_date) {
          throw new Error('Please fill in all required fields for external campaigns');
        }
      }

      // Create campaign
      const response = await unifiedCampaignApi.createCampaign(formData);
      
      console.log('Campaign created successfully:', response.data);
      
      // Navigate to dashboard
      navigate('/campaigns');
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create campaign');
      console.error('Error creating campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Create New Campaign</h1>
          <button 
            onClick={() => navigate('/campaigns')}
            className="btn btn-outline btn-sm"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Advertiser Type Selection */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">Campaign Type</h2>
            <div className="flex space-x-4">
              <label className="label cursor-pointer">
                <input
                  type="radio"
                  name="advertiserType"
                  className="radio radio-primary"
                  checked={advertiserType === 'internal'}
                  onChange={() => handleAdvertiserTypeChange('internal')}
                />
                <span className="label-text ml-2">Internal Team Booking</span>
              </label>
              <label className="label cursor-pointer">
                <input
                  type="radio"
                  name="advertiserType"
                  className="radio radio-accent"
                  checked={advertiserType === 'external'}
                  onChange={() => handleAdvertiserTypeChange('external')}
                />
                <span className="label-text ml-2">External Advertiser Campaign</span>
              </label>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Campaign Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">Campaign Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campaign Name/Title */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      {advertiserType === 'internal' ? 'Campaign Title *' : 'Campaign Name *'}
                    </span>
                  </label>
                  <input
                    type="text"
                    name={advertiserType === 'internal' ? 'title' : 'name'}
                    value={advertiserType === 'internal' ? formData.title : formData.name}
                    onChange={handleInputChange}
                    className="input input-bordered"
                    placeholder={advertiserType === 'internal' ? 'Enter campaign title' : 'Enter campaign name'}
                    required
                  />
                </div>

                {/* Asset Selection (for internal campaigns) */}
                {advertiserType === 'internal' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Asset *</span>
                    </label>
                    <select
                      name="asset_id"
                      value={formData.asset_id}
                      onChange={handleInputChange}
                      className="select select-bordered"
                      required
                    >
                      <option value="">Select an asset</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name} ({asset.level}) - {formatCurrency(asset.value_per_day)}/day
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* LOB (for internal campaigns) */}
                {advertiserType === 'internal' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Line of Business *</span>
                    </label>
                    <select
                      name="lob"
                      value={formData.lob}
                      onChange={handleInputChange}
                      className="select select-bordered"
                      required
                    >
                      <option value="">Select LOB</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Diagnostics">Diagnostics</option>
                      <option value="Pharma">Pharma</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Consult">Consult</option>
                      <option value="Ask Apollo Circle">Ask Apollo Circle</option>
                    </select>
                  </div>
                )}

                {/* Purpose (for internal campaigns) */}
                {advertiserType === 'internal' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Purpose *</span>
                    </label>
                    <input
                      type="text"
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleInputChange}
                      className="input input-bordered"
                      placeholder="Enter campaign purpose"
                      required
                    />
                  </div>
                )}

                {/* Budget */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Budget</span>
                  </label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    className="input input-bordered"
                    placeholder="Enter budget amount"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Start Date */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Start Date *</span>
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="input input-bordered"
                    required
                  />
                </div>

                {/* End Date */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">End Date *</span>
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="input input-bordered"
                    required
                  />
                </div>

                {/* Creative URL */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Creative URL</span>
                  </label>
                  <input
                    type="url"
                    name="creative_url"
                    value={formData.creative_url}
                    onChange={handleInputChange}
                    className="input input-bordered"
                    placeholder="Enter creative URL"
                  />
                </div>

                {/* Priority Weight (for internal campaigns) */}
                {advertiserType === 'internal' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Priority Weight</span>
                    </label>
                    <input
                      type="number"
                      name="priority_weight"
                      value={formData.priority_weight}
                      onChange={handleInputChange}
                      className="input input-bordered"
                      placeholder="1.00"
                      min="0.1"
                      max="10"
                      step="0.1"
                    />
                  </div>
                )}

                {/* Bidding Strategy */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Bidding Strategy</span>
                  </label>
                  <select
                    name="bidding_strategy"
                    value={formData.bidding_strategy}
                    onChange={handleInputChange}
                    className="select select-bordered"
                  >
                    <option value="manual">Manual</option>
                    <option value="rtb">Real-Time Bidding</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>

              {/* External Campaign Specific Fields */}
              {advertiserType === 'external' && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">External Campaign Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Goal Type</span>
                      </label>
                      <select
                        name="goal_type"
                        value={formData.goal_type}
                        onChange={handleInputChange}
                        className="select select-bordered"
                      >
                        <option value="">Select goal type</option>
                        <option value="impressions">Impressions</option>
                        <option value="clicks">Clicks</option>
                        <option value="conversions">Conversions</option>
                        <option value="revenue">Revenue</option>
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Goal Value</span>
                      </label>
                      <input
                        type="number"
                        name="goal_value"
                        value={formData.goal_value}
                        onChange={handleInputChange}
                        className="input input-bordered"
                        placeholder="Enter goal value"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/campaigns')}
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
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                'Create Campaign'
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default UnifiedCampaignForm; 