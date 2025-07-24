import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import Layout from '../components/Layout';

const Approvals = () => {
  const [approvals, setApprovals] = useState([]);
  const [error, setError] = useState('');

  const fetchApprovals = () => {
    apiClient.get('/approvals').then((res) => setApprovals(res.data));
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const act = async (id, status) => {
    try {
      await apiClient.post(`/approvals/${id}/action`, { status });
      fetchApprovals();
    } catch (err) {
      setError('Failed to update approval');
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-6">Pending Approvals</h1>
      {error && <p className="text-red-600">{error}</p>}
      <table className="min-w-full bg-white shadow rounded-xl">
        <thead>
          <tr className="bg-gray-100 text-left text-sm">
            <th className="p-2">Booking</th>
            <th className="p-2">Dates</th>
            <th className="p-2">Requester</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((a) => (
            <tr key={a.id} className="border-b text-sm">
              <td className="p-2">{a.title}</td>
              <td className="p-2">{a.start_date} → {a.end_date}</td>
              <td className="p-2">{a.requester_email}</td>
              <td className="p-2 space-x-2">
                <button onClick={() => act(a.id, 'approved')} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                <button onClick={() => act(a.id, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
};

export default Approvals; 