// src/components/CalendarView.js
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

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

  // Keep track of the current date being displayed and the active view (month / week / day)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');

  useEffect(() => {
    apiClient.get('/bookings')
      .then((res) => {
        const calendarEvents = res.data.map((b) => ({
          id: b.id,
          title: `${b.title} [${b.lob}] (${b.status})`,
          start: new Date(b.start_date),
          end: new Date(b.end_date),
          resource: b
        }));
        setEvents(calendarEvents);
      });
  }, []);

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-4">Booking Calendar</h2>
      <Calendar
        localizer={localizer}
        events={events}
        date={currentDate}
        view={currentView}
        onNavigate={(date) => setCurrentDate(date)}
        onView={(view) => setCurrentView(view)}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        eventPropGetter={(event) => {
          const color = event.resource.status === 'approved' ? '#16a34a' : event.resource.status === 'rejected' ? '#dc2626' : '#f59e0b';
          return { style: { backgroundColor: color, color: 'white' } };
        }}
      />
    </div>
  );
};

export default CalendarView;