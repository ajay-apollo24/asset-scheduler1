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
  const [currentStep, setCurrentStep] = useState(1);
  const [formValid, setFormValid] = useState(false);

  // Enhanced form state with comprehensive fields
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
      },
      behavioral: {
        user_segments: [],
        purchase_intent: [],
        browsing_history: []
      }
    },
    goal_type: '',
    goal_value: '',
    priority_weight: 1.00,
    bidding_strategy: 'manual',
    pacing: 'even',
    pricing_model: 'cpm',
    frequency_cap: null,
    day_parting: {
      monday: { start: '09:00', end: '18:00', enabled: true },
      tuesday: { start: '09:00', end: '18:00', enabled: true },
      wednesday: { start: '09:00', end: '18:00', enabled: true },
      thursday: { start: '09:00', end: '18:00', enabled: true },
      friday: { start: '09:00', end: '18:00', enabled: true },
      saturday: { start: '10:00', end: '16:00', enabled: false },
      sunday: { start: '10:00', end: '16:00', enabled: false }
    },
    creative_settings: {
      format: 'banner',
      dimensions: '',
      file_size: '',
      call_to_action: '',
      landing_page: ''
    },
    performance_settings: {
      optimization_goal: 'impressions',
      bid_adjustments: {},
      audience_expansion: false,
      brand_safety: true
    }
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    validateForm();
  }, [formData, advertiserType]);

  const fetchAssets = async () => {
    try {
      const response = await apiClient.get('/assets');
      setAssets(response.data);
    } catch (err) {
      console.error('Error fetching assets:', err);
    }
  };

  const validateForm = () => {
    let isValid = true;
    
    if (advertiserType === 'internal') {
      isValid = isValid && formData.title && formData.asset_id && formData.lob && 
                formData.purpose && formData.start_date && formData.end_date;
    } else {
      isValid = isValid && formData.name && formData.start_date && formData.end_date;
    }
    
    setFormValid(isValid);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value
      }));
    }
  };

  const handleArrayChange = (section, field, value, action = 'toggle') => {
    setFormData(prev => ({
      ...prev,
      targeting_criteria: {
        ...prev.targeting_criteria,
        [section]: {
          ...prev.targeting_criteria[section],
          [field]: action === 'add' 
            ? [...(prev.targeting_criteria[section][field] || []), value]
            : action === 'remove'
            ? (prev.targeting_criteria[section][field] || []).filter(item => item !== value)
            : value
        }
      }
    }));
  };

  const handleAdvertiserTypeChange = (type) => {
    setAdvertiserType(type);
    setFormData(prev => ({
      ...prev,
      advertiser_type: type
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formValid) return;
    
    setLoading(true);
    setError(null);

    try {
      // Prepare campaign data
      const campaignData = {
        ...formData,
        // Ensure proper field mapping
        name: advertiserType === 'internal' ? formData.title : formData.name,
        title: advertiserType === 'internal' ? formData.title : formData.name
      };

      const response = await unifiedCampaignApi.createCampaign(campaignData);
      console.log('Campaign created successfully:', response.data);
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

  const renderStepIndicator = () => (
    <div className="steps steps-horizontal w-full mb-8">
      <div className={`step ${currentStep >= 1 ? 'step-primary' : ''}`}>Basic Info</div>
      <div className={`step ${currentStep >= 2 ? 'step-primary' : ''}`}>Targeting</div>
      <div className={`step ${currentStep >= 3 ? 'step-primary' : ''}`}>Settings</div>
      <div className={`step ${currentStep >= 4 ? 'step-primary' : ''}`}>Review</div>
    </div>
  );

  const renderBasicInfo = () => (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <h2 className="card-title text-xl mb-6">Campaign Information</h2>
        
        {/* Campaign Type Selection */}
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-semibold">Campaign Type *</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="label cursor-pointer border rounded-lg p-4 hover:bg-base-200 transition-colors">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="advertiserType"
                  className="radio radio-primary"
                  checked={advertiserType === 'internal'}
                  onChange={() => handleAdvertiserTypeChange('internal')}
                />
                <div>
                  <span className="label-text font-medium">Internal Team Booking</span>
                  <p className="text-sm text-gray-500">For internal teams and LOB campaigns</p>
                </div>
              </div>
            </label>
            <label className="label cursor-pointer border rounded-lg p-4 hover:bg-base-200 transition-colors">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="advertiserType"
                  className="radio radio-accent"
                  checked={advertiserType === 'external'}
                  onChange={() => handleAdvertiserTypeChange('external')}
                />
                <div>
                  <span className="label-text font-medium">External Advertiser</span>
                  <p className="text-sm text-gray-500">For external advertisers and revenue campaigns</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campaign Name/Title */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                {advertiserType === 'internal' ? 'Campaign Title *' : 'Campaign Name *'}
              </span>
            </label>
            <input
              type="text"
              name={advertiserType === 'internal' ? 'title' : 'name'}
              value={advertiserType === 'internal' ? formData.title : formData.name}
              onChange={handleInputChange}
              className="input input-bordered focus:input-primary"
              placeholder={advertiserType === 'internal' ? 'Enter campaign title' : 'Enter campaign name'}
              required
            />
          </div>

          {/* Asset Selection (for internal campaigns) */}
          {advertiserType === 'internal' && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Asset *</span>
              </label>
              <select
                name="asset_id"
                value={formData.asset_id}
                onChange={handleInputChange}
                className="select select-bordered focus:select-primary"
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
                <span className="label-text font-semibold">Line of Business *</span>
              </label>
              <select
                name="lob"
                value={formData.lob}
                onChange={handleInputChange}
                className="select select-bordered focus:select-primary"
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
                <span className="label-text font-semibold">Purpose *</span>
              </label>
              <input
                type="text"
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                className="input input-bordered focus:input-primary"
                placeholder="Enter campaign purpose"
                required
              />
            </div>
          )}

          {/* Budget */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Budget (₹)</span>
            </label>
            <input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleInputChange}
              className="input input-bordered focus:input-primary"
              placeholder="Enter budget amount"
              min="0"
              step="0.01"
            />
          </div>

          {/* Start Date */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Start Date *</span>
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              className="input input-bordered focus:input-primary"
              required
            />
          </div>

          {/* End Date */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">End Date *</span>
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              className="input input-bordered focus:input-primary"
              required
            />
          </div>

          {/* Creative URL */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Creative URL</span>
            </label>
            <input
              type="url"
              name="creative_url"
              value={formData.creative_url}
              onChange={handleInputChange}
              className="input input-bordered focus:input-primary"
              placeholder="Enter creative URL"
            />
          </div>

          {/* Priority Weight (for internal campaigns) */}
          {advertiserType === 'internal' && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Priority Weight</span>
              </label>
              <input
                type="number"
                name="priority_weight"
                value={formData.priority_weight}
                onChange={handleInputChange}
                className="input input-bordered focus:input-primary"
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
              <span className="label-text font-semibold">Bidding Strategy</span>
            </label>
            <select
              name="bidding_strategy"
              value={formData.bidding_strategy}
              onChange={handleInputChange}
              className="select select-bordered focus:select-primary"
            >
              <option value="manual">Manual Bidding</option>
              <option value="rtb">Real-Time Bidding (RTB)</option>
              <option value="auto">Auto-Optimization</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTargeting = () => (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <h2 className="card-title text-xl mb-6">Audience Targeting</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Demographics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Demographics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Age Min</span>
                </label>
                <input
                  type="number"
                  name="targeting_criteria.demographics.age_min"
                  value={formData.targeting_criteria.demographics.age_min}
                  onChange={handleInputChange}
                  className="input input-bordered input-sm"
                  placeholder="18"
                  min="13"
                  max="100"
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Age Max</span>
                </label>
                <input
                  type="number"
                  name="targeting_criteria.demographics.age_max"
                  value={formData.targeting_criteria.demographics.age_max}
                  onChange={handleInputChange}
                  className="input input-bordered input-sm"
                  placeholder="65"
                  min="13"
                  max="100"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Gender</span>
              </label>
              <select
                name="targeting_criteria.demographics.gender"
                value={formData.targeting_criteria.demographics.gender}
                onChange={handleInputChange}
                className="select select-bordered select-sm"
              >
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Interests</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {['healthcare', 'technology', 'finance', 'education', 'shopping', 'travel', 'sports', 'entertainment'].map(interest => (
                  <label key={interest} className="label cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={formData.targeting_criteria.demographics.interests.includes(interest)}
                      onChange={() => handleArrayChange('demographics', 'interests', interest, 
                        formData.targeting_criteria.demographics.interests.includes(interest) ? 'remove' : 'add')}
                    />
                    <span className="label-text ml-2 capitalize">{interest}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Geographic Targeting */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Geographic Targeting</h3>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Countries</span>
              </label>
              <select
                name="targeting_criteria.geo.countries"
                value={formData.targeting_criteria.geo.countries}
                onChange={handleInputChange}
                className="select select-bordered select-sm"
                multiple
              >
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Cities</span>
              </label>
              <input
                type="text"
                name="targeting_criteria.geo.cities"
                value={formData.targeting_criteria.geo.cities}
                onChange={handleInputChange}
                className="input input-bordered input-sm"
                placeholder="Mumbai, Delhi, Bangalore (comma separated)"
              />
            </div>
          </div>
        </div>

        {/* Device Targeting */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Device Targeting</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(formData.targeting_criteria.device).map(([device, enabled]) => (
              <label key={device} className="label cursor-pointer">
                <input
                  type="checkbox"
                  name={`targeting_criteria.device.${device}`}
                  className="checkbox checkbox-primary"
                  checked={enabled}
                  onChange={handleInputChange}
                />
                <span className="label-text ml-2 capitalize">{device}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <h2 className="card-title text-xl mb-6">Campaign Settings</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Performance Settings</h3>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Pacing</span>
              </label>
              <select
                name="pacing"
                value={formData.pacing}
                onChange={handleInputChange}
                className="select select-bordered"
              >
                <option value="even">Even (Standard)</option>
                <option value="accelerated">Accelerated</option>
                <option value="asap">As Soon As Possible</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Pricing Model</span>
              </label>
              <select
                name="pricing_model"
                value={formData.pricing_model}
                onChange={handleInputChange}
                className="select select-bordered"
              >
                <option value="cpm">CPM (Cost Per Mille)</option>
                <option value="cpc">CPC (Cost Per Click)</option>
                <option value="cpa">CPA (Cost Per Action)</option>
                <option value="flat">Flat Rate</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Frequency Cap (per day)</span>
              </label>
              <input
                type="number"
                name="frequency_cap"
                value={formData.frequency_cap || ''}
                onChange={handleInputChange}
                className="input input-bordered"
                placeholder="No limit"
                min="1"
              />
            </div>
          </div>

          {/* External Campaign Specific Settings */}
          {advertiserType === 'external' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Campaign Goals</h3>
              
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
                  <option value="brand_awareness">Brand Awareness</option>
                  <option value="app_installs">App Installs</option>
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
          )}
        </div>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <h2 className="card-title text-xl mb-6">Review Campaign</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Campaign Summary</h3>
            
            <div className="stats stats-vertical shadow">
              <div className="stat">
                <div className="stat-title">Campaign Type</div>
                <div className="stat-value text-lg capitalize">{advertiserType}</div>
              </div>
              
              <div className="stat">
                <div className="stat-title">Campaign Name</div>
                <div className="stat-value text-lg">{advertiserType === 'internal' ? formData.title : formData.name}</div>
              </div>
              
              <div className="stat">
                <div className="stat-title">Budget</div>
                <div className="stat-value text-lg">{formatCurrency(formData.budget)}</div>
              </div>
              
              <div className="stat">
                <div className="stat-title">Duration</div>
                <div className="stat-value text-lg">
                  {formData.start_date && formData.end_date ? 
                    `${new Date(formData.start_date).toLocaleDateString()} - ${new Date(formData.end_date).toLocaleDateString()}` : 
                    'Not set'
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Targeting Summary</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Age Range:</span>
                <span>
                  {formData.targeting_criteria.demographics.age_min && formData.targeting_criteria.demographics.age_max ?
                    `${formData.targeting_criteria.demographics.age_min}-${formData.targeting_criteria.demographics.age_max}` :
                    'All ages'
                  }
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Gender:</span>
                <span className="capitalize">
                  {formData.targeting_criteria.demographics.gender || 'All genders'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Devices:</span>
                <span>
                  {Object.entries(formData.targeting_criteria.device)
                    .filter(([_, enabled]) => enabled)
                    .map(([device, _]) => device)
                    .join(', ') || 'All devices'
                  }
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Interests:</span>
                <span>
                  {formData.targeting_criteria.demographics.interests.length > 0 ?
                    formData.targeting_criteria.demographics.interests.join(', ') :
                    'All interests'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderBasicInfo();
      case 2: return renderTargeting();
      case 3: return renderSettings();
      case 4: return renderReview();
      default: return renderBasicInfo();
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Create New Campaign</h1>
            <p className="text-gray-600 mt-2">Set up your campaign with advanced targeting and optimization</p>
          </div>
          <button 
            onClick={() => navigate('/campaigns')}
            className="btn btn-outline"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Error Display */}
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="btn btn-outline"
              disabled={currentStep === 1}
            >
              Previous
            </button>
            
            <div className="flex space-x-4">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn btn-primary"
                  disabled={!formValid}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !formValid}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Creating Campaign...
                    </>
                  ) : (
                    'Create Campaign'
                  )}
                </button>
              )}
              
              <button
                type="button"
                onClick={() => navigate('/campaigns')}
                className="btn btn-outline"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default UnifiedCampaignForm; 