// src/components/BookingEditForm.js
import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const BookingEditForm = ({ booking, onUpdated, onCancel }) => {
  const [form, setForm] = useState({
    title: '',
    lob: '',
    purpose: '',
    creative_url: '',
    start_date: '',
    end_date: ''
  });
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lobOptions = [
    'Pharmacy', 'Diagnostics', 'Insurance', 'Consult', 
    'Credit Card', 'Monetization', 'Ask Apollo', 'Circle'
  ];

  useEffect(() => {
    // Load assets for asset selection
    apiClient.get('/assets').then((res) => {
      setAssets(res.data);
    });

    // Initialize form with booking data
    if (booking) {
      setForm({
        title: booking.title || '',
        lob: booking.lob || '',
        purpose: booking.purpose || '',
        creative_url: booking.creative_url || '',
        start_date: booking.start_date ? new Date(booking.start_date).toISOString().slice(0, 10) : '',
        end_date: booking.end_date ? new Date(booking.end_date).toISOString().slice(0, 10) : ''
      });
    }
  }, [booking]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.put(`/bookings/${booking.id}`, form);
      onUpdated?.();
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.join(', '));
      } else {
        setError('Failed to update booking');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Edit Booking</h3>
      
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">
            <span className="label-text">Campaign Title</span>
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="input input-bordered w-full"
            required
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text">LOB</span>
          </label>
          <select
            name="lob"
            value={form.lob}
            onChange={handleChange}
            className="select select-bordered w-full"
            required
          >
            <option value="">Select LOB</option>
            {lobOptions.map((lob) => (
              <option key={lob} value={lob}>{lob}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">
            <span className="label-text">Purpose</span>
          </label>
          <input
            name="purpose"
            value={form.purpose}
            onChange={handleChange}
            className="input input-bordered w-full"
            required
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text">Creative URL (optional)</span>
          </label>
          <input
            name="creative_url"
            value={form.creative_url}
            onChange={handleChange}
            className="input input-bordered w-full"
            type="url"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text">Start Date</span>
          </label>
          <input
            name="start_date"
            value={form.start_date}
            onChange={handleChange}
            className="input input-bordered w-full"
            type="date"
            required
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text">End Date</span>
          </label>
          <input
            name="end_date"
            value={form.end_date}
            onChange={handleChange}
            className="input input-bordered w-full"
            type="date"
            required
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-outline"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Booking'}
        </button>
      </div>
    </form>
  );
};

export default BookingEditForm; 