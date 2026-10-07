import { useState } from 'react';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import PageHeader from '../../components/PageHeader';
import { selectDisplayTimeZone } from '../../store/preferencesSlice';
import { timeZoneLabel } from '../../utils/format';
import AttendanceHistory from './AttendanceHistory';
import TodayCard from './TodayCard';

function TimesNote() {
  const displayTimeZone = useSelector(selectDisplayTimeZone);
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Times are shown in {displayTimeZone} ({timeZoneLabel(displayTimeZone)}). Change this in the top bar.
    </Typography>
  );
}

// Own check-in plus history. Used on its own by employees and as a tab for managers and HR.
function MyAttendance() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <Stack spacing={3}>
      <TodayCard onChange={() => setRefreshKey((k) => k + 1)} />
      <AttendanceHistory key={refreshKey} scope="my" />
    </Stack>
  );
}

export function MyAttendancePage() {
  return (
    <>
      <PageHeader title="Attendance" subtitle="Check in, check out and see your history" />
      <TimesNote />
      <MyAttendance />
    </>
  );
}

// Managers and HR: someone else's records in the first tab, their own in the second.
function TabbedAttendance({ title, othersLabel, scope }) {
  const [tab, setTab] = useState(0);
  return (
    <>
      <PageHeader title={title} />
      <Tabs value={tab} onChange={(_, t) => setTab(t)} sx={{ mb: 2 }}>
        <Tab label={othersLabel} />
        <Tab label="My attendance" />
      </Tabs>
      <TimesNote />
      <Box>{tab === 0 ? <AttendanceHistory scope={scope} /> : <MyAttendance />}</Box>
    </>
  );
}

export function ManagerAttendancePage() {
  return <TabbedAttendance title="Attendance" othersLabel="My team" scope="team" />;
}

export function AllAttendancePage() {
  return <TabbedAttendance title="Attendance" othersLabel="Company" scope="all" />;
}
