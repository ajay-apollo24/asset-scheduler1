import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/apiClient';

const CampaignWizard = ({ onCreated, onCancel, campaign = null }) => {
  const { user, hasPermission, isPlatformAdmin } = useAuth();
  const [advertisers, setAdvertisers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
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

  const steps = [
    { id: 1, title: 'Basic Information', description: 'Campaign name and advertiser' },
    { id: 2, title: 'Budget & Schedule', description: 'Budget, dates and status' },
    { id: 3, title: 'Goals & Pricing', description: 'Campaign goals and pricing model' },
    { id: 4, title: 'Targeting', description: 'Audience targeting criteria' },
    { id: 5, title: 'Review & Create', description: 'Review and finalize campaign' }
  ];

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

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleTargetingChange = useCallback((section, field, value) => {
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
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Memoized validation to prevent unnecessary re-renders
  const stepValidation = useMemo(() => {
    switch (currentStep) {
      case 1:
        return {
          canProceed: formData.name && formData.advertiser_id,
          errors: []
        };
      case 2:
        const errors = [];
        if (!formData.budget) errors.push('Budget is required');
        if (!formData.start_date) errors.push('Start date is required');
        if (!formData.end_date) errors.push('End date is required');
        if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
          errors.push('End date must be after start date');
        }
        return {
          canProceed: formData.budget && formData.start_date && formData.end_date && formData.start_date < formData.end_date,
          errors
        };
      case 3:
        return {
          canProceed: formData.goal_type && formData.goal_value,
          errors: []
        };
      case 4:
        return {
          canProceed: true, // Targeting is optional
          errors: []
        };
      default:
        return {
          canProceed: true,
          errors: []
        };
    }
  }, [currentStep, formData.name, formData.advertiser_id, formData.budget, formData.start_date, formData.end_date, formData.goal_type, formData.goal_value]);

  if (!canCreateCampaign) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">You do not have permission to create campaigns.</p>
      </div>
    );
  }

  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              currentStep >= step.id 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-gray-300 text-gray-500'
            }`}>
              {currentStep > step.id ? '✓' : step.id}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.title}
              </p>
              <p className="text-xs text-gray-400">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${
                currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const BasicInformation = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Campaign Information</h3>
        <p className="text-sm text-gray-600 mb-6">Start by providing the basic details for your campaign.</p>
      </div>
      
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
          placeholder="Enter campaign name"
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
    </div>
  );

  const BudgetSchedule = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Budget & Schedule</h3>
        <p className="text-sm text-gray-600 mb-6">Set your campaign budget and schedule.</p>
      </div>

      {stepValidation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <ul className="text-red-800 text-sm">
            {stepValidation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Budget (₹) *
          </label>
          <input
            type="number"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            placeholder="0.00"
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
            min={new Date().toISOString().split('T')[0]}
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
            min={formData.start_date || new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const GoalsPricing = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Goals & Pricing</h3>
        <p className="text-sm text-gray-600 mb-6">Define your campaign goals and pricing strategy.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Goal Type *
          </label>
          <select
            name="goal_type"
            value={formData.goal_type}
            onChange={handleChange}
            required
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
            Goal Value *
          </label>
          <input
            type="number"
            name="goal_value"
            value={formData.goal_value}
            onChange={handleChange}
            required
            min="0"
            placeholder="0"
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
            placeholder="Unlimited"
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
            rows={2}
          />
        </div>
      </div>
    </div>
  );

  const Targeting = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Audience Targeting</h3>
        <p className="text-sm text-gray-600 mb-6">Define your target audience criteria (optional).</p>
      </div>
      
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
  );

  const Review = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Review Campaign Details</h3>
        <p className="text-sm text-gray-600 mb-6">Please review all the information before creating your campaign.</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900">Campaign Name</h4>
            <p className="text-gray-600">{formData.name}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Advertiser</h4>
            <p className="text-gray-600">
              {canSelectAdvertiser 
                ? advertisers.find(a => a.id == formData.advertiser_id)?.email || 'N/A'
                : user?.email || 'N/A'
              }
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900">Budget</h4>
            <p className="text-gray-600">₹{formData.budget}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Status</h4>
            <p className="text-gray-600 capitalize">{formData.status}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900">Start Date</h4>
            <p className="text-gray-600">{formData.start_date}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">End Date</h4>
            <p className="text-gray-600">{formData.end_date}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900">Goal</h4>
            <p className="text-gray-600">{formData.goal_type} - {formData.goal_value}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Pricing Model</h4>
            <p className="text-gray-600 uppercase">{formData.pricing_model}</p>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900">Targeting Criteria</h4>
          <div className="text-sm text-gray-600 mt-1">
            <p>Demographics: {formData.targeting_criteria.demographics.age || 'Any'} | {formData.targeting_criteria.demographics.gender || 'Any'} | {formData.targeting_criteria.interests || 'Any'}</p>
            <p>Geographic: {formData.targeting_criteria.geo.countries || 'Any'} | {formData.targeting_criteria.geo.cities || 'Any'}</p>
            <p>Devices: {Object.entries(formData.targeting_criteria.device).filter(([_, enabled]) => enabled).map(([device]) => device).join(', ') || 'None'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInformation />;
      case 2:
        return <BudgetSchedule />;
      case 3:
        return <GoalsPricing />;
      case 4:
        return <Targeting />;
      case 5:
        return <Review />;
      default:
        return <BasicInformation />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator />
      
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          {renderStep()}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!stepValidation.canProceed}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !stepValidation.canProceed}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : (campaign ? 'Update Campaign' : 'Create Campaign')}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CampaignWizard; 