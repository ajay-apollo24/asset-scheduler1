// src/components/AgendaEventRow.js
const AgendaEventRow = ({ event }) => (
  <span>
    <span className="font-medium">{event.asset_name}</span>
    {" • "}
    <span className="text-sm">{event.lob}</span>
    {" – "}
    <span className="text-xs text-gray-500">{event.title}</span>
  </span>
);

export default AgendaEventRow; 