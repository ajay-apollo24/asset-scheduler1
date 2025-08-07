// src/components/UnifiedCampaign/UnifiedCampaignEditForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import unifiedCampaignApi from '../../api/unifiedCampaignApi';
import Layout from '../Layout';

const UnifiedCampaignEditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [formData, setFormData] = useState({
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
      }
    },
    goal_type: '',
    goal_value: '',
    priority_weight: 1.00,
    bidding_strategy: 'manual',
    pacing: 'even',
    pricing_model: 'cpm',
    frequency_cap: null
  });

  useEffect(() => {
    fetchCampaign();
    fetchAssets();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const response = await unifiedCampaignApi.getCampaign(id);
      const campaign = response.data;
      
      setFormData({
        name: campaign.name || '',
        title: campaign.title || '',
        asset_id: campaign.asset_id || '',
        budget: campaign.budget || 0,
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
        lob: campaign.lob || '',
        purpose: campaign.purpose || '',
        creative_url: campaign.creative_url || '',
        targeting_criteria: campaign.targeting_criteria || {
          demographics: { age_min: '', age_max: '', gender: '', interests: [] },
          geo: { countries: [], cities: [], regions: [] },
          device: { desktop: true, mobile: true, tablet: true }
        },
        goal_type: campaign.goal_type || '',
        goal_value: campaign.goal_value || '',
        priority_weight: campaign.priority_weight || 1.00,
        bidding_strategy: campaign.bidding_strategy || 'manual',
        pacing: campaign.pacing || 'even',
        pricing_model: campaign.pricing_model || 'cpm',
        frequency_cap: campaign.frequency_cap || null
      });
    } catch (err) {
      setError('Failed to load campaign');
      console.error('Error fetching campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets');
      const assetsData = await response.json();
      setAssets(assetsData);
    } catch (err) {
      console.error('Error fetching assets:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const parts = name.split('.');
      setFormData(prev => {
        const newData = { ...prev };
        let current = newData;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        
        const finalField = parts[parts.length - 1];
        current[finalField] = type === 'checkbox' ? checked : 
                             type === 'number' ? (value === '' ? null : parseFloat(value) || 0) : 
                             value;
        
        return newData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? (value === '' ? null : parseFloat(value) || 0) : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const campaignData = {
        ...formData,
        budget: formData.budget === '' || formData.budget === null ? null : parseFloat(formData.budget),
        goal_value: formData.goal_value === '' || formData.goal_value === null ? null : parseFloat(formData.goal_value),
        priority_weight: formData.priority_weight === '' || formData.priority_weight === null ? 1.00 : parseFloat(formData.priority_weight),
        frequency_cap: formData.frequency_cap === '' || formData.frequency_cap === null ? null : parseInt(formData.frequency_cap, 10),
        targeting_criteria: {
          demographics: {
            age_min: formData.targeting_criteria?.demographics?.age_min || null,
            age_max: formData.targeting_criteria?.demographics?.age_max || null,
            gender: formData.targeting_criteria?.demographics?.gender || null,
            interests: formData.targeting_criteria?.demographics?.interests || []
          },
          geo: {
            countries: formData.targeting_criteria?.geo?.countries || [],
            cities: formData.targeting_criteria?.geo?.cities || null,
            regions: formData.targeting_criteria?.geo?.regions || []
          },
          device: formData.targeting_criteria?.device || { desktop: true, mobile: true, tablet: true }
        }
      };

      await unifiedCampaignApi.updateCampaign(id, campaignData);
      navigate('/campaigns');
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update campaign');
      console.error('Error updating campaign:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Edit Campaign</h1>
            <p className="text-gray-600 mt-2">Update your campaign settings</p>
          </div>
          <button 
            onClick={() => navigate('/campaigns')}
            className="btn btn-outline"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-xl mb-6">Campaign Information</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Campaign Name/Title</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input input-bordered focus:input-primary"
                    placeholder="Enter campaign title"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Asset</span>
                  </label>
                  <select
                    name="asset_id"
                    value={formData.asset_id}
                    onChange={handleInputChange}
                    className="select select-bordered focus:select-primary"
                  >
                    <option value="">Select asset</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} - {asset.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Line of Business</span>
                  </label>
                  <select
                    name="lob"
                    value={formData.lob}
                    onChange={handleInputChange}
                    className="select select-bordered focus:select-primary"
                  >
                    <option value="">Select LOB</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Diagnostics">Diagnostics</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Consult">Consult</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Monetization">Monetization</option>
                    <option value="Ask Apollo">Ask Apollo</option>
                    <option value="Circle">Circle</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Purpose</span>
                  </label>
                  <input
                    type="text"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    className="input input-bordered focus:input-primary"
                    placeholder="Enter campaign purpose"
                  />
                </div>

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

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Start Date</span>
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

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">End Date</span>
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
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/campaigns')}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Updating Campaign...
                </>
              ) : (
                'Update Campaign'
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default UnifiedCampaignEditForm; 