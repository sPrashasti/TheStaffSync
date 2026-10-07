// "Today" for attendance and leave is a calendar day in a time zone, worked out on the server,
// so a client's clock can never move a record to another day. Each employee uses their own
// time zone if HR has set one, otherwise the company default (TIMEZONE, IST if unset).
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

// The company default time zone.
const getTimeZone = () => process.env.TIMEZONE || DEFAULT_TIMEZONE;

// True for an IANA time zone name the runtime knows, e.g. Asia/Kolkata or Europe/London.
const isValidTimeZone = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

// Called once at startup so a misspelt TIMEZONE stops the server instead of failing on first check-in.
const assertTimeZone = () => {
  if (!isValidTimeZone(getTimeZone())) {
    throw new Error(`TIMEZONE "${getTimeZone()}" is not a valid IANA time zone, e.g. Asia/Kolkata.`);
  }
};

// The time zone that decides an employee's dates: their own if set, else the company default.
const employeeTimeZone = (employee) => (employee && employee.timeZone) || getTimeZone();

// The YYYY-MM-DD calendar date of `date` in `timeZone` (company default if omitted).
const toDateString = (date = new Date(), timeZone = getTimeZone()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
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

// Moves a YYYY-MM-DD date by whole days (negative goes back). Pure calendar arithmetic, no time zones.
const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// A YYYY-MM-DD string as a Date at midnight UTC, so the stored value never shifts a day.
const dateStringToDate = (dateString) => new Date(`${dateString}T00:00:00Z`);

module.exports = {
  getTimeZone,
  isValidTimeZone,
  assertTimeZone,
  employeeTimeZone,
  toDateString,
  isDateString,
  addDays,
  dateStringToDate,
  DEFAULT_TIMEZONE,
};
