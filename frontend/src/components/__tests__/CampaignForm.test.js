import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CampaignForm from '../AdServer/CampaignForm';
import apiClient from '../../api/apiClient';

describe('CampaignForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits campaign with advanced fields', async () => {
    apiClient.post.mockResolvedValue({});
    const onCreated = jest.fn();

    render(<CampaignForm onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/Campaign Name/i), { target: { value: 'Test Campaign' } });
    fireEvent.change(screen.getByLabelText(/Budget/i), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2024-01-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2024-01-31' } });
    fireEvent.change(screen.getByLabelText(/Goal Type/i), { target: { value: 'impressions' } });
    fireEvent.change(screen.getByLabelText(/Goal Value/i), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/Pacing/i), { target: { value: 'asap' } });
    fireEvent.change(screen.getByLabelText(/Pricing Model/i), { target: { value: 'cpc' } });
    fireEvent.change(screen.getByLabelText(/Frequency Cap/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Day Parting/i), { target: { value: '{"monday":["09:00-17:00"]}' } });

    fireEvent.click(screen.getByText(/Create Campaign/i));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());

    const payload = apiClient.post.mock.calls[0][1];
    expect(payload.goal_type).toBe('impressions');
    expect(payload.goal_value).toBe(10000);
    expect(payload.pacing).toBe('asap');
    expect(payload.pricing_model).toBe('cpc');
    expect(payload.frequency_cap).toBe(5);
    expect(payload.day_parting).toEqual({ monday: ['09:00-17:00'] });
    expect(onCreated).toHaveBeenCalled();
  });
});
