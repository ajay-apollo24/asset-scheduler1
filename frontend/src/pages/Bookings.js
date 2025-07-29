import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import BookingForm from '../components/BookingForm';
import BookingEditForm from '../components/BookingEditForm';
import Modal from '../components/Modal';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [deletingBooking, setDeletingBooking] = useState(null);
  const { user } = useAuth();

  const fetchBookings = () => {
    apiClient.get('/bookings')
      .then((res) => setBookings(res.data))
      .catch(() => setError('Failed to load bookings'));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleEdit = (booking) => {
    setEditingBooking(booking);
  };

  const handleDelete = async (booking) => {
    if (window.confirm(`Delete booking "${booking.title}"?`)) {
      try {
        await apiClient.delete(`/bookings/${booking.id}`);
        fetchBookings();
        setDeletingBooking(null);
      } catch (err) {
        setError('Failed to delete booking');
      }
    }
  };

  const handleEditSuccess = () => {
    fetchBookings();
    setEditingBooking(null);
  };

  const handleEditCancel = () => {
    setEditingBooking(null);
  };

  const handleStartAuction = async (bookingId) => {
    try {
      await apiClient.put(`/api/bidding/${bookingId}/start`);
      fetchBookings();
    } catch (err) {
      setError('Failed to start auction');
    }
  };

  const handleEndAuction = async (bookingId) => {
    try {
      await apiClient.put(`/api/bidding/${bookingId}/end`);
      fetchBookings();
    } catch (err) {
      setError('Failed to end auction');
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-6">Bookings</h1>
      {error && <div className="alert alert-error mb-4">{error}</div>}

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

      {editingBooking && (
        <Modal onClose={handleEditCancel}>
          <BookingEditForm
            booking={editingBooking}
            onUpdated={handleEditSuccess}
            onCancel={handleEditCancel}
          />
        </Modal>
      )}

      <div className="overflow-x-auto mt-6">
        <table className="table table-zebra w-full text-sm">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Asset</th>
              <th>LOB</th>
              <th>User</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Auction</th>
              <th>Actions</th>
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
                <td>
                  {b.auction_status ? (
                    <span className={`badge ${
                      b.auction_status === 'active' ? 'badge-success' :
                      b.auction_status === 'completed' ? 'badge-info' :
                      b.auction_status === 'pending' ? 'badge-warning' :
                      'badge-neutral'
                    }`}>
                      {b.auction_status}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(b)}
                      className="btn btn-sm btn-outline"
                    >
                      Edit
                    </button>
                    {!b.auction_status && b.status === 'approved' && (user?.role === 'admin' || b.user_id === user?.user_id) && (
                      <button
                        onClick={() => handleStartAuction(b.id)}
                        className="btn btn-sm btn-primary"
                      >
                        Start Auction
                      </button>
                    )}
                    {b.auction_status === 'active' && (user?.role === 'admin' || b.user_id === user?.user_id) && (
                      <button
                        onClick={() => handleEndAuction(b.id)}
                        className="btn btn-sm btn-warning"
                      >
                        End Auction
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(b)}
                        className="btn btn-sm btn-error"
                      >
                        Delete
                      </button>
                    )}
                  </div>
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