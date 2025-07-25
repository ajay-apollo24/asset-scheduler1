// src/components/BookingForm.js
import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

const BookingForm = ({ onCreated }) => {
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ asset_id: '', title: '', lob: '', purpose: '', start_date: '', end_date: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiClient.get('/assets').then(res => setAssets(res.data));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/bookings', form);
      setSuccess('Booking requested');
      setError('');
      onCreated?.();
    } catch (err) {
      // Attempt to surface detailed backend errors
      if (err.response && err.response.data) {
        const { errors, message } = err.response.data;
        if (Array.isArray(errors) && errors.length) {
          setError(errors.join('\n'));
        } else if (message) {
          setError(message);
        } else {
          setError('Failed to create booking');
        }
      } else {
        setError('Failed to create booking');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card bg-base-100 shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Request Booking</h2>
      {error && <div className="alert alert-error text-sm mb-2">{error}</div>}
      {success && <div className="alert alert-success text-sm mb-2">{success}</div>}
      <div className="mb-3">
        <label className="block text-sm mb-1">Asset</label>
        <select name="asset_id" value={form.asset_id} onChange={handleChange} className="w-full border px-3 py-2 rounded">
          <option value="">Select asset</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>{a.name} - {a.location}</option>
          ))}
        </select>
      </div>
      {['title', 'purpose', 'creative_url', 'start_date', 'end_date'].map((field) => (
        <div key={field} className="mb-3">
          <label className="block text-sm mb-1 capitalize">{field.replace('_', ' ')}</label>
          <input
            name={field}
            type={field.includes('date') ? 'date' : 'text'}
            value={form[field]}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      ))}

      {/* LOB select */}
      <div className="mb-3">
        <label className="block text-sm mb-1">Line of Business (LOB)</label>
        <select
          name="lob"
          value={form.lob}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        >
          <option value="">Select LOB</option>
          {['Pharmacy','Diagnostics','Insurance','Consult','Credit Card','Monetization','Ask Apollo','Circle'].map((lob) => (
            <option key={lob} value={lob}>{lob}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Submit</button>
    </form>
  );
};

export default BookingForm;