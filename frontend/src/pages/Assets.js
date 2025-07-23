import { useEffect, useState } from 'react';
import AssetList from '../components/AssetList';
import AssetForm from '../components/AssetForm';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const fetchAssets = () => {
    apiClient.get('/assets')
      .then((res) => setAssets(res.data))
      .catch(() => setError('Failed to load assets'));
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-6">Assets</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {user?.role === 'admin' && <AssetForm onCreated={fetchAssets} />}
      <AssetList assets={assets} />
    </Layout>
  );
};

export default Assets;