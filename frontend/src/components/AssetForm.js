// src/components/AssetForm.js
import { useState } from 'react';
import apiClient from '../api/apiClient';

const AssetForm = ({ onCreated }) => {
  const [form, setForm] = useState({ name: '', location: '', type: '', max_slots: 1, importance: 1, impressions_per_day: 0, value_per_day: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/assets', form);
      setSuccess('Asset created');
      onCreated?.();
    } catch (err) {
      setError('Failed to create asset');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 shadow rounded-xl">
      <h2 className="text-lg font-semibold mb-4">New Asset</h2>
      {error && <p className="text-red-600">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}
      {['name', 'location', 'type', 'importance', 'impressions_per_day', 'value_per_day'].map((field) => (
        <div key={field} className="mb-3">
          <label className="block text-sm mb-1 capitalize">{field}</label>
          <input name={field} value={form[field]} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
        </div>
      ))}
      <div className="mb-3">
        <label className="block text-sm mb-1">Max Slots</label>
        <input
          name="max_slots"
          type="number"
          min="1"
          value={form.max_slots}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
    </form>
  );
};

export default AssetForm;