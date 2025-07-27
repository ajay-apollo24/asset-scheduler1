import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import BookingForm from '../components/BookingForm';
import Layout from '../components/Layout';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchBookings = () => {
    apiClient.get('/bookings')
      .then((res) => setBookings(res.data))
      .catch(() => setError('Failed to load bookings'));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-6">Bookings</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}


      <button className="btn btn-primary mb-4" onClick={() => setShowForm(true)}>New Booking</button>

      {showForm && (
        <div className="modal modal-open" onClick={() => setShowForm(false)}>
          <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
            <BookingForm
              onCreated={() => {
                fetchBookings();
                setShowForm(false);
              }}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto mt-6">
        <table className="table table-zebra w-full text-sm">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th>Campaign</th>
              <th>Asset</th>
              <th>LOB</th>
              <th>User</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="font-medium">{b.title}</td>
                <td>{b.asset_name}</td>
                <td>{b.lob}</td>
                <td>{b.user_email}</td>
                <td>{b.start_date}</td>
                <td>{b.end_date}</td>
                <td className={
                  b.status === 'approved'
                    ? 'text-success'
                    : b.status === 'rejected'
                    ? 'text-error'
                    : 'text-warning'
                }>
                  {b.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default Bookings;