import { createSlice } from '@reduxjs/toolkit';
import { timeZoneStorage } from '../utils/storage';

// Time zones offered in the top bar for showing clock times. Calendar dates never change.
export const DEFAULT_DISPLAY_TIME_ZONE = 'Asia/Kolkata';
const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const DISPLAY_TIME_ZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Europe/London', label: 'London (UK)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (US East)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AET)' },
];
if (browserTimeZone && !DISPLAY_TIME_ZONES.some((z) => z.value === browserTimeZone)) {
  DISPLAY_TIME_ZONES.push({ value: browserTimeZone, label: `This device (${browserTimeZone})` });
}

const saved = timeZoneStorage.get();

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: {
    displayTimeZone: DISPLAY_TIME_ZONES.some((z) => z.value === saved) ? saved : DEFAULT_DISPLAY_TIME_ZONE,
  },
  reducers: {
    setDisplayTimeZone: (state, action) => {
      state.displayTimeZone = action.payload;
      timeZoneStorage.set(action.payload);
    },
  },
});

export const { setDisplayTimeZone } = preferencesSlice.actions;
export default preferencesSlice.reducer;
export const selectDisplayTimeZone = (state) => state.preferences.displayTimeZone;
