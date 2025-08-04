import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CampaignWizard from '../AdServer/CampaignWizard';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the API client
jest.mock('../../api/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  roles: [{ name: 'requestor' }]
};

const renderWithAuth = (component) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('CampaignWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the first step with basic information', () => {
    renderWithAuth(
      <CampaignWizard
        onCreated={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByText('Basic Campaign Information')).toBeInTheDocument();
    expect(screen.getByLabelText('Campaign Name *')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('shows step indicator with all steps', () => {
    renderWithAuth(
      <CampaignWizard
        onCreated={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Budget & Schedule')).toBeInTheDocument();
    expect(screen.getByText('Goals & Pricing')).toBeInTheDocument();
    expect(screen.getByText('Targeting')).toBeInTheDocument();
    expect(screen.getByText('Review & Create')).toBeInTheDocument();
  });

  it('can navigate between steps', () => {
    renderWithAuth(
      <CampaignWizard
        onCreated={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    // Fill required fields for step 1
    fireEvent.change(screen.getByLabelText('Campaign Name *'), {
      target: { value: 'Test Campaign' }
    });

    // Click Next to go to step 2
    fireEvent.click(screen.getByText('Next'));
    
    expect(screen.getByText('Budget & Schedule')).toBeInTheDocument();
    expect(screen.getByLabelText('Budget (₹) *')).toBeInTheDocument();
  });

  it('shows validation for required fields', () => {
    renderWithAuth(
      <CampaignWizard
        onCreated={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    // Try to proceed without filling required fields
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });
}); 