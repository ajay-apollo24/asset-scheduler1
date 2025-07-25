// src/components/AgendaPlus.js
import React from 'react';
import {
  startOfDay,
  endOfDay,
  endOfWeek,
  startOfWeek,
  addDays,
  isWithinInterval,
  format,
} from 'date-fns';

// Custom Agenda view with Date | Time | Asset | LOB | Title columns
const AgendaPlus = ({ events, range, date, localizer }) => {
  // helper labels
  const dayLabel = (date) => localizer.format(date, 'EEE MMM dd');
  const timeLabel = (ev) =>
    ev.allDay
      ? 'all-day'
      : `${localizer.format(ev.start, 'p')} – ${localizer.format(ev.end, 'p')}`;

  // build list of days to render
  const days = range && range.length ? range : (() => {
    const tmp = [];
    let d = startOfWeek(date, { locale: localizer.locale });
    const endDate = endOfWeek(date, { locale: localizer.locale });
    while (d <= endDate) {
      tmp.push(d);
      d = addDays(d, 1);
    }
    return tmp;
  })();

  const eventsForDay = (d) =>
    events.filter((e) =>
      isWithinInterval(d, {
        start: startOfDay(e.start),
        end: endOfDay(e.end),
      })
    );

  return (
    <table className="rbc-agenda-table min-w-full bg-white text-sm">
      <thead>
        <tr className="bg-gray-100 text-left">
          <th className="p-2 w-32">Date</th>
          <th className="p-2 w-32">Time</th>
          <th className="p-2">Asset</th>
          <th className="p-2">LOB</th>
          <th className="p-2">Title</th>
        </tr>
      </thead>
      <tbody>
        {days.map((d) => {
          const dayEvents = eventsForDay(d);
          return dayEvents.length === 0 ? (
            <tr key={d}>
              <td className="border-t p-2">{dayLabel(d)}</td>
              <td className="border-t p-2" colSpan={4} />
            </tr>
          ) : (
            dayEvents.map((ev, idx) => (
              <tr key={`${d}-${idx}`}>
                {idx === 0 && (
                  <td
                    rowSpan={dayEvents.length}
                    className="border-t p-2 align-top"
                  >
                    {dayLabel(d)}
                  </td>
                )}
                <td className="border-t p-2">{timeLabel(ev)}</td>
                <td className="border-t p-2">{ev.asset_name}</td>
                <td className="border-t p-2">{ev.lob}</td>
                <td className="border-t p-2">{ev.title}</td>
              </tr>
            ))
          );
        })}
      </tbody>
    </table>
  );
};

// ------------ Required static helpers for custom view ------------
AgendaPlus.range = (date, { localizer }) => {
  const start = startOfWeek(date, { locale: localizer.locale });
  const end = endOfWeek(date, { locale: localizer.locale });
  const days = [];
  let day = start;
  while (day <= end) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
};

AgendaPlus.navigate = (date, action) => {
  const diff = action === 'PREV' ? -7 : action === 'NEXT' ? 7 : 0;
  return addDays(date, diff);
};

AgendaPlus.title = (date, { localizer }) => {
  const start = startOfWeek(date, { locale: localizer.locale });
  const end = endOfWeek(date, { locale: localizer.locale });
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
};

export default AgendaPlus; 