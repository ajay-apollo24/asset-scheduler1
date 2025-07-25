// src/components/CalendarView.js
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import AgendaEventRow from './AgendaEventRow';
import AgendaPlus from './AgendaPlus';
import apiClient from '../api/apiClient';
import { format as formatDateFn } from 'date-fns';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { user } = useAuth();

  // filters
  const [assets, setAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]); // array of id
  const [lobs, setLobs] = useState([]);
  const [selectedLobs, setSelectedLobs] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Keep track of the current date being displayed and the active view (month / week / day)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');

  useEffect(() => {
    // fetch assets list (for filter dropdown)
    apiClient.get('/assets').then((res) => {
      setAssets(res.data);
      setSelectedAssets(res.data.map((a) => a.name));
    });

    apiClient.get('/bookings')
      .then((res) => {
        const calendarEvents = res.data.map((b) => ({
          id: b.id,
          title: `${b.title}`,
          asset_name: b.asset_name,
          lob: b.lob,
          start: new Date(b.start_date),
          end: new Date(b.end_date),
          resource: b
        }));
        setEvents(calendarEvents);

        const uniqueLobs = [...new Set(res.data.map((b) => b.lob))];
        setLobs(uniqueLobs);
        setSelectedLobs(uniqueLobs);
      });
  }, []);

  // handlers for filter change
  const handleLobChange = (e) => {
    const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
    setSelectedLobs(opts.length ? opts : lobs);
  };

  const handleAssetChange = (e) => {
    const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
    setSelectedAssets(opts.length ? opts : assets.map((a) => a.name));
  };

  const filteredEvents = events.filter(
    (ev) => selectedLobs.includes(ev.lob) && selectedAssets.includes(ev.asset_name)
  );

  const lobColors = {
    Pharmacy: '#16a34a',
    Diagnostics: '#1d4ed8',
    Insurance: '#9333ea',
    Consult: '#2563eb',
    'Credit Card': '#e11d48',
    Monetization: '#f59e0b',
    'Ask Apollo': '#dc2626',
    Circle: '#0d9488',
  };

  const DnDCalendar = withDragAndDrop(Calendar);

  const updateBooking = async (event, start, end) => {
    try {
      await apiClient.put(`/bookings/${event.id}/dates`, {
        start_date: formatDateFn(start, 'yyyy-MM-dd'),
        end_date: formatDateFn(end, 'yyyy-MM-dd'),
      });
      // refresh
      const res = await apiClient.get('/bookings');
      const calendarEvents = res.data.map((b) => ({
        id: b.id,
        title: `${b.title}`,
        asset_name: b.asset_name,
        lob: b.lob,
        start: new Date(b.start_date),
        end: new Date(b.end_date),
        resource: b,
      }));
      setEvents(calendarEvents);
    } catch (err) {
      if (err.response && err.response.data) {
        const { message, errors } = err.response.data;
        alert((errors && errors.join('\n')) || message || 'Failed to update booking');
      } else {
        alert('Failed to update booking');
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-4">Booking Calendar</h2>
      {/* Filter toggle */}
      <button onClick={() => setShowFilters(!showFilters)} className="mb-4 btn btn-sm btn-outline">
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

      {showFilters && (
      <div className="flex gap-4 mb-4 transition-all">
        {/* LOB filter */}
        <div>
          <label className="block text-sm font-medium mb-1">LOB Filter</label>
          <select multiple value={selectedLobs} onChange={handleLobChange} className="select select-bordered h-32 w-48" size={8}>
            {lobs.map((lob) => (
              <option key={lob} value={lob}>{lob}</option>
            ))}
          </select>
        </div>
        {/* Asset filter */}
        <div>
          <label className="block text-sm font-medium mb-1">Asset Filter</label>
          <select multiple value={selectedAssets} onChange={handleAssetChange} className="select select-bordered h-32 w-48" size={8}>
            {assets.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>) }

      <DnDCalendar
        localizer={localizer}
        events={filteredEvents}
        date={currentDate}
        view={currentView}
        onNavigate={(date) => setCurrentDate(date)}
        onView={(view) => setCurrentView(view)}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        selectable
        eventPropGetter={(event) => {
          const color = lobColors[event.resource.lob] || '#6366f1';
          return { style: { backgroundColor: color, color: 'white' } };
        }}
        onSelectEvent={(event) => setSelectedEvent(event.resource)}
        onEventDrop={({ event, start, end }) => updateBooking(event, start, end)}
        onEventResize={({ event, start, end }) => updateBooking(event, start, end)}
        views={{ month: true, week: true, day: true, agenda: true, agendaPlus: AgendaPlus }}
        messages={{ agendaPlus: 'Agenda +' }}
        components={{
          agenda: { event: AgendaEventRow },
          agendaPlus: { event: AgendaPlus },
        }}
      />
      {selectedEvent && (
        <Modal onClose={() => setSelectedEvent(null)}>
          <h3 className="text-lg font-semibold mb-2">{selectedEvent.title}</h3>
          <p><strong>Asset:</strong> {selectedEvent.asset_name}</p>
          <p><strong>LOB:</strong> {selectedEvent.lob}</p>
          <p><strong>Purpose:</strong> {selectedEvent.purpose}</p>
          <p><strong>Status:</strong> {selectedEvent.status}</p>
          <p><strong>Dates:</strong> {format(new Date(selectedEvent.start_date), 'PP')} → {format(new Date(selectedEvent.end_date), 'PP')}</p>
          {selectedEvent.estimated_cost && <p><strong>Estimated cost:</strong> ${selectedEvent.estimated_cost}</p>}
          {selectedEvent.creative_url && (
            <p className="mt-2"><a href={selectedEvent.creative_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View creative</a></p>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={async () => {
                if (window.confirm('Delete this booking?')) {
                  await apiClient.delete(`/bookings/${selectedEvent.id}`);
                  // Refresh events
                  const res = await apiClient.get('/bookings');
                  const calendarEvents = res.data.map((b) => ({
                    id: b.id,
                    title: `${b.title} [${b.lob}] (${b.status})`,
                    start: new Date(b.start_date),
                    end: new Date(b.end_date),
                    resource: b,
                  }));
                  setEvents(calendarEvents);
                  setSelectedEvent(null);
                }
              }}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            >
              Delete Booking
            </button>
          )}
        </Modal>
      )}
    </div>
  );
};

export default CalendarView;