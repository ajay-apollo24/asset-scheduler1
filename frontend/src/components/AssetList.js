// src/components/AssetList.js
const AssetList = ({ assets }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <div key={asset.id} className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-bold mb-1">{asset.name}</h2>
          <p className="text-sm text-gray-600 mb-1">{asset.location} • {asset.type}</p>
          <p className="text-sm">Slots: {asset.max_slots}</p>
          <p className={`text-sm ${asset.is_active ? 'text-green-600' : 'text-red-600'}`}>
            {asset.is_active ? 'Active' : 'Inactive'}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AssetList;