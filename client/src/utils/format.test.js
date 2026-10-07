// Run with: npm test (Node's built-in test runner; no browser needed).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  capitalise,
  formatDateTime,
  formatDay,
  formatDayRange,
  formatHours,
  formatTime,
  timeZoneLabel,
  todayIn,
} from './format.js';
import { audienceLabel, leaveTypeLabel } from './labels.js';

describe('calendar dates', () => {
  it('formats British style and never shifts the day', () => {
    assert.equal(formatDay('2026-10-07'), '7 Oct 2026');
    // Stored at midnight UTC: must stay the 7th whatever the viewer's time zone.
    assert.equal(formatDay('2026-10-07T00:00:00.000Z'), '7 Oct 2026');
    assert.equal(formatDay(null), '—');
  });

  it('collapses single-day ranges', () => {
    assert.equal(formatDayRange('2026-10-20', '2026-10-22'), '20 Oct 2026 – 22 Oct 2026');
    assert.equal(formatDayRange('2026-10-20T00:00:00.000Z', '2026-10-20'), '20 Oct 2026');
  });
});

describe('times', () => {
  const moment = '2026-10-07T13:05:00.000Z';

  it('uses the 24-hour clock in the chosen time zone', () => {
    assert.equal(formatTime(moment, 'UTC'), '13:05');
    assert.equal(formatTime(moment, 'Asia/Kolkata'), '18:35');
    assert.equal(formatTime(moment, 'Europe/London'), '14:05');
    assert.equal(formatTime('2026-10-07T00:30:00.000Z', 'UTC'), '00:30', 'midnight is 00, not 24');
    assert.equal(formatTime(null, 'UTC'), '—');
  });

  it('formats date and time together, which can move the date', () => {
    assert.equal(formatDateTime(moment, 'Asia/Kolkata'), '7 Oct 2026, 18:35');
    assert.equal(formatDateTime('2026-10-07T20:00:00.000Z', 'Asia/Kolkata'), '8 Oct 2026, 01:30');
  });

  it('works out today in a time zone', () => {
    assert.match(todayIn('Asia/Kolkata'), /^\d{4}-\d{2}-\d{2}$/);
    assert.notEqual(todayIn('Pacific/Kiritimati'), todayIn('Pacific/Pago_Pago'), 'these zones are always a day apart');
  });

  it('labels time zones and falls back to the name', () => {
    assert.ok(['IST', 'GMT+5:30'].includes(timeZoneLabel('Asia/Kolkata')));
    assert.equal(timeZoneLabel('Not/AZone'), 'Not/AZone');
  });
});

describe('small helpers', () => {
  it('formats hours and labels', () => {
    assert.equal(formatHours(8.5), '8.50 h');
    assert.equal(formatHours(0), '0.00 h');
    assert.equal(formatHours(null), '—');
    assert.equal(capitalise('pending'), 'Pending');
    assert.equal(leaveTypeLabel('earned'), 'Earned');
    assert.equal(audienceLabel('all'), 'Everyone');
    assert.equal(leaveTypeLabel('mystery'), 'mystery');
  });
});
