import { useState } from 'react';
import {
  Card,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { useSelector } from 'react-redux';
import LoadState from '../../components/LoadState';
import Pager from '../../components/Pager';
import StatusChip from '../../components/StatusChip';
import TableMessage from '../../components/TableMessage';
import { useApi } from '../../hooks/useApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getAllAttendance, getMyAttendance, getTeamAttendance } from '../../services/attendanceService';
import { getMyTeam } from '../../services/employeeService';
import { selectDisplayTimeZone } from '../../store/preferencesSlice';
import { formatDay, formatHours, formatTime } from '../../utils/format';

const FETCHERS = { my: getMyAttendance, team: getTeamAttendance, all: getAllAttendance };

// Drops empty filters so they are not sent as ?from=&to=.
const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null));

// Attendance records with date-range filters. scope: 'my' (own), 'team' (manager) or 'all' (HR).
function AttendanceHistory({ scope = 'my' }) {
  const displayTimeZone = useSelector(selectDisplayTimeZone);
  const [filters, setFilters] = useState({ from: '', to: '', employeeId: '', department: '', status: '', page: 1, limit: 10 });
  // The department box waits for a pause in typing before asking the server.
  const query = { ...filters, department: useDebouncedValue(filters.department) };
  const { data, loading, error, reload } = useApi(() => FETCHERS[scope](compact(query)), [scope, query]);
  const team = useApi(() => (scope === 'team' ? getMyTeam() : Promise.resolve([])), [scope]);

  const set = (field) => (e) => setFilters({ ...filters, [field]: e.target.value, page: 1 });
  const showEmployee = scope !== 'my';
  const columns = showEmployee ? 7 : 6;

  return (
    <Card variant="outlined">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexWrap: 'wrap', p: 2 }} useFlexGap>
        <TextField label="From" type="date" size="small" value={filters.from} onChange={set('from')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="To" type="date" size="small" value={filters.to} onChange={set('to')} slotProps={{ inputLabel: { shrink: true } }} />
        {scope === 'team' && (
          <TextField select label="Team member" size="small" value={filters.employeeId} onChange={set('employeeId')} sx={{ minWidth: 200 }}>
            <MenuItem value="">Everyone</MenuItem>
            {(team.data || []).map((e) => <MenuItem key={e._id} value={e._id}>{e.userId.name}</MenuItem>)}
          </TextField>
        )}
        {scope === 'all' && (
          <>
            <TextField label="Department" size="small" value={filters.department} onChange={set('department')} />
            <TextField select label="Status" size="small" value={filters.status} onChange={set('status')} sx={{ minWidth: 150 }}>
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="present">Present</MenuItem>
              <MenuItem value="half-day">Half day</MenuItem>
            </TextField>
          </>
        )}
      </Stack>

      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                {showEmployee && <TableCell>Employee</TableCell>}
                <TableCell>Check in</TableCell>
                <TableCell>Check out</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Time zone</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.length === 0 && <TableMessage colSpan={columns}>No attendance records for these filters.</TableMessage>}
              {data?.items.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>{formatDay(r.date)}</TableCell>
                  {showEmployee && (
                    <TableCell>
                      {r.employeeId?.userId?.name}
                      <br />
                      <small>{r.employeeId?.employeeId} · {r.employeeId?.department}</small>
                    </TableCell>
                  )}
                  <TableCell>{formatTime(r.checkIn, displayTimeZone)}</TableCell>
                  <TableCell>{r.checkOut ? formatTime(r.checkOut, displayTimeZone) : <StatusChip status="checked-in" />}</TableCell>
                  <TableCell>{r.checkOut ? formatHours(r.workingHours) : '—'}</TableCell>
                  <TableCell><StatusChip status={r.status} /></TableCell>
                  <TableCell>{r.timeZone || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Pager data={data} onChange={(p) => setFilters({ ...filters, ...p })} />
      </LoadState>
    </Card>
  );
}

export default AttendanceHistory;
