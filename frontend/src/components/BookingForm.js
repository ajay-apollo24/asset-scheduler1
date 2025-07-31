// src/components/BookingForm.js
import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

const BookingForm = ({ onCreated }) => {
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ asset_id: '', title: '', lob: '', purpose: '', start_date: '', end_date: '', start_auction: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiClient.get('/assets').then(res => setAssets(res.data));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const setQuickDates = (days) => {
    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days - 1);
    
    setForm({
      ...form,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/bookings', form);
      const bookingId = response.data.id;
      
      // If start_auction is checked, automatically approve and start auction
      if (form.start_auction) {
        try {
          // Auto-approve the booking (admin only)
          await apiClient.post(`/bookings/${bookingId}/status`, { status: 'approved' });
          // Start the auction
          await apiClient.post(`/bidding/bookings/${bookingId}/auction/start`);
          setSuccess('Booking created and auction started!');
        } catch (auctionErr) {
          setSuccess('Booking created, but failed to start auction. You can start it manually from the Bookings page.');
        }
      } else {
        setSuccess('Booking requested');
      }
      
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
      
      {['title', 'purpose', 'creative_url'].map((field) => (
        <div key={field} className="mb-3">
          <label className="block text-sm mb-1 capitalize">{field.replace('_', ' ')}</label>
          <input
            name={field}
            type={field.includes('url') ? 'url' : 'text'}
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

      {/* Quick date buttons */}
      <div className="mb-3">
        <label className="block text-sm mb-1">Quick Schedule</label>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setQuickDates(1)}
            className="btn btn-sm btn-outline"
          >
            Today (1 day)
          </button>
          <button
            type="button"
            onClick={() => setQuickDates(3)}
            className="btn btn-sm btn-outline"
          >
            This Week (3 days)
          </button>
          <button
            type="button"
            onClick={() => setQuickDates(7)}
            className="btn btn-sm btn-outline"
          >
            Next Week (7 days)
          </button>
        </div>
      </div>

      {/* Date inputs */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm mb-1">Start Date</label>
          <input
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">End Date</label>
          <input
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
      </div>

      {/* Auction Option */}
      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="start_auction"
            checked={form.start_auction}
            onChange={(e) => setForm({ ...form, start_auction: e.target.checked })}
            className="checkbox checkbox-primary"
          />
          <span className="text-sm">
            <strong>Start auction immediately</strong>
            <br />
            <span className="text-gray-600 text-xs">
              This will auto-approve the booking and start bidding right away (Admin only)
            </span>
          </span>
        </label>
      </div>

      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Submit</button>
    </form>
  );
};

export default BookingForm;