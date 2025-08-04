import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import CampaignWizard from '../../components/AdServer/CampaignWizard';
import { useAuth } from '../../contexts/AuthContext';

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const handleCreated = () => {
    navigate('/ad-server/campaigns');
  };

  const handleCancel = () => {
    navigate('/ad-server/campaigns');
  };

  if (!hasPermission('campaign:create')) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">You do not have permission to create campaigns.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/ad-server/campaigns')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold">Create New Campaign</h1>
        </div>

        <CampaignWizard
          onCreated={handleCreated}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  );
};

export default CreateCampaign; 