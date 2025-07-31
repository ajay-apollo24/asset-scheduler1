// scripts/sample-data.js
// Creates mock campaigns and creatives via API endpoints.

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const TOKEN = process.env.API_TOKEN || '';

async function createCampaign(name) {
  const resp = await axios.post(`${API_BASE}/campaigns`, {
    name,
    targeting_criteria: {},
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }, { headers: { Authorization: `Bearer ${TOKEN}` } });
  return resp.data;
}

async function createCreative(campaignId) {
  const resp = await axios.post(`${API_BASE}/creatives`, {
    campaign_id: campaignId,
    name: `Creative-${Date.now()}`,
    type: 'html',
    content: {
      html: '<div style="background:#eee;padding:10px">Test Ad</div>',
      click_url: 'https://example.com'
    },
    dimensions: '300x250'
  }, { headers: { Authorization: `Bearer ${TOKEN}` } });
  return resp.data;
}

async function main() {
  try {
    const campaign = await createCampaign(`Campaign-${Date.now()}`);
    const creative = await createCreative(campaign.id);
    console.log('Created campaign', campaign.id, 'creative', creative.id);
  } catch (err) {
    console.error('Error creating sample data', err.response?.data || err.message);
  }
}

main();
