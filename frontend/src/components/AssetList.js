// src/components/AssetList.js
const AssetList = ({ assets }) => (
  <div className="overflow-x-auto">
    <table className="table table-zebra w-full text-sm">
      <thead>
        <tr>
          <th>Name</th>
          <th>Location</th>
          <th>Type</th>
          <th>Level</th>
          <th>Slots</th>
          <th>Importance</th>
          <th>Value / Day</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((a) => (
          <tr key={a.id}>
            <td>{a.name}</td>
            <td>{a.location}</td>
            <td>{a.type}</td>
            <td>
              <span className={`badge ${
                a.level === 'primary' ? 'badge-primary' :
                a.level === 'secondary' ? 'badge-secondary' :
                'badge-accent'
              }`}>
                {a.level}
              </span>
            </td>
            <td>{a.max_slots}</td>
            <td>{a.importance}</td>
            <td>${a.value_per_day}</td>
            <td className={a.is_active ? 'text-success' : 'text-error'}>{a.is_active ? 'Active' : 'Inactive'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AssetList;