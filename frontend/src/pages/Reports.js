import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';

const Reports = () => {
  const [data, setData] = useState([]);
  const [from, setFrom] = useState('2024-01-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const fetchData = () => {
    apiClient.get(`/reports/performance?from=${from}&to=${to}`).then((res) => setData(res.data));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-6">Performance Report</h1>
      <div className="flex gap-2 mb-4">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border p-2 rounded" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border p-2 rounded" />
        <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded">Run</button>
      </div>
      <table className="min-w-full bg-white shadow rounded-xl">
        <thead>
          <tr className="bg-gray-100 text-left text-sm">
            <th className="p-2">LOB</th>
            <th className="p-2">Impressions</th>
            <th className="p-2">Clicks</th>
            <th className="p-2">CTR</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.lob} className="border-b text-sm">
              <td className="p-2">{row.lob}</td>
              <td className="p-2">{row.impressions}</td>
              <td className="p-2">{row.clicks}</td>
              <td className="p-2">{row.impressions ? ((row.clicks / row.impressions) * 100).toFixed(2) + '%' : '0%'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
};

export default Reports; 