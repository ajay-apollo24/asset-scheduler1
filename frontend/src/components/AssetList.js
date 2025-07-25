// src/components/AssetList.js
const AssetList = ({ assets }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <div key={asset.id} className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <h2 className="card-title">{asset.name}</h2>
            <p className="text-sm">{asset.location} • {asset.type}</p>
            <p className="text-sm">Slots: {asset.max_slots}</p>
            <p className="text-sm">Importance: {asset.importance}</p>
            <p className="text-sm">Value/Day: ${asset.value_per_day}</p>
            <p className={`text-sm ${asset.is_active ? 'text-success' : 'text-error'}`}>{asset.is_active ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssetList;