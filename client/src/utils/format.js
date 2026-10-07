// British formatting with 24-hour times throughout the app.
const LOCALE = 'en-GB';

// Calendar dates (leave, attendance days, training dates) are stored as midnight UTC or as
// YYYY-MM-DD strings. They are shown in UTC so they never shift by a day.
export const formatDay = (value) => {
  if (!value) return '—';
  const date = typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00Z`) : new Date(value);
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const formatDayRange = (start, end) => {
  const from = formatDay(start);
  const to = formatDay(end);
  return from === to ? from : `${from} – ${to}`;
};

// Moments in time (check-in, created at) are shown in the chosen display time zone.
export const formatTime = (value, timeZone) =>
  (value ? new Date(value).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }) : '—');

export const formatDateTime = (value, timeZone) =>
  (value
    ? new Date(value).toLocaleString(LOCALE, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone,
    })
    : '—');

export const formatHours = (hours) => (hours || hours === 0 ? `${Number(hours).toFixed(2)} h` : '—');

// The short name of a time zone right now, e.g. "IST" or "GMT+5:30".
export const timeZoneLabel = (timeZone) => {
  try {
    const part = new Intl.DateTimeFormat(LOCALE, { timeZone, timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part ? part.value : timeZone;
  } catch {
    return timeZone;
  }
};

export const capitalise = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '');

// Today as YYYY-MM-DD in a time zone, for default form values.
export const todayIn = (timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
