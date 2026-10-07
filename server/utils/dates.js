// "Today" for attendance is the calendar day in the company's time zone, worked out on the
// server, so a client's clock or time zone can never move a record to another day.
const DEFAULT_TIMEZONE = 'Europe/London';

const getTimeZone = () => process.env.TIMEZONE || DEFAULT_TIMEZONE;

// Called once at startup so a misspelt TIMEZONE stops the server instead of failing on first check-in.
const assertTimeZone = () => {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: getTimeZone() });
  } catch {
    throw new Error(`TIMEZONE "${getTimeZone()}" is not a valid IANA time zone, e.g. Europe/London.`);
  }
};

// The YYYY-MM-DD calendar date of `date` in the company time zone.
const toDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

// True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30).
const isDateString = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
};

module.exports = { getTimeZone, assertTimeZone, toDateString, isDateString, DEFAULT_TIMEZONE };
