import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import BookingForm from '../components/BookingForm';
import Layout from '../components/Layout';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');

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

      <BookingForm onCreated={fetchBookings} />

      <div className="overflow-x-auto mt-6">
        <table className="min-w-full bg-white rounded-xl shadow-md text-sm">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="px-4 py-2">Campaign</th>
              <th className="px-4 py-2">Asset</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Start</th>
              <th className="px-4 py-2">End</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-2 font-medium">{b.title}</td>
                <td className="px-4 py-2">{b.asset_name}</td>
                <td className="px-4 py-2">{b.user_email}</td>
                <td className="px-4 py-2">{b.start_date}</td>
                <td className="px-4 py-2">{b.end_date}</td>
                <td className={`px-4 py-2 font-semibold ${
                  b.status === 'approved'
                    ? 'text-green-600'
                    : b.status === 'rejected'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }`}>
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