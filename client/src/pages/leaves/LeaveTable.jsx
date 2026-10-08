import { useState } from 'react';
import {
  Button,
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
  Tooltip,
  Typography,
} from '@mui/material';
import LoadState from '../../components/LoadState';
import Pager from '../../components/Pager';
import StatusChip from '../../components/StatusChip';
import TableMessage from '../../components/TableMessage';
import { useApi } from '../../hooks/useApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSnackbar } from '../../hooks/useSnackbar';
import { getMyTeam } from '../../services/employeeService';
import { approveLeave, getAllLeaves, getMyLeaves, getTeamLeaves } from '../../services/leaveService';
import { formatDayRange } from '../../utils/format';
import { LEAVE_TYPES, leaveTypeLabel } from '../../utils/labels';
import { RejectLeaveDialog } from './LeaveDialogs';

const FETCHERS = { my: getMyLeaves, team: getTeamLeaves, all: getAllLeaves };
const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null));

// Leave requests with filters. scope 'my' lists your own; 'team' (manager) and 'all' (HR) add
// the applicant and Approve / Reject buttons on pending requests.
// refreshKey: change it to reload (e.g. after applying).
function LeaveTable({ scope = 'my', defaultStatus = '', refreshKey = 0 }) {
  const toast = useSnackbar();
  const [filters, setFilters] = useState({ status: defaultStatus, leaveType: '', employeeId: '', department: '', page: 1, limit: 10 });
  // The department box waits for a pause in typing before asking the server.
  const query = { ...filters, department: useDebouncedValue(filters.department) };
  const { data, loading, error, reload } = useApi(() => FETCHERS[scope](compact(query)), [scope, query, refreshKey]);
  const team = useApi(() => (scope === 'team' ? getMyTeam() : Promise.resolve([])), [scope]);
  const [rejecting, setRejecting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const canDecide = scope !== 'my';
  const set = (field) => (e) => setFilters({ ...filters, [field]: e.target.value, page: 1 });

  const approve = async (leave) => {
    setBusyId(leave._id);
    try {
      await approveLeave(leave._id);
      toast.success('Leave approved');
      reload();
    } catch (err) {
      toast.error(err.message);
      reload();
    } finally {
      setBusyId(null);
    }
  };

  const columns = canDecide ? 7 : 6;

  return (
    <Card variant="outlined">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexWrap: 'wrap', p: 2 }} useFlexGap>
        <TextField select label="Status" size="small" value={filters.status} onChange={set('status')} sx={{ minWidth: 150 }}>
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </TextField>
        <TextField select label="Type" size="small" value={filters.leaveType} onChange={set('leaveType')} sx={{ minWidth: 150 }}>
          <MenuItem value="">Any</MenuItem>
          {LEAVE_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
        {scope === 'team' && (
          <TextField select label="Team member" size="small" value={filters.employeeId} onChange={set('employeeId')} sx={{ minWidth: 200 }}>
            <MenuItem value="">Everyone</MenuItem>
            {(team.data || []).map((e) => <MenuItem key={e._id} value={e._id}>{e.userId.name}</MenuItem>)}
          </TextField>
        )}
        {scope === 'all' && <TextField label="Department" size="small" value={filters.department} onChange={set('department')} />}
      </Stack>

      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {canDecide && <TableCell>Employee</TableCell>}
                <TableCell>Type</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell align="right">Days</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                {canDecide && <TableCell align="right">Actions</TableCell>}
                {!canDecide && <TableCell>Decided by</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.length === 0 && <TableMessage colSpan={columns}>No leave requests for these filters.</TableMessage>}
              {data?.items.map((l) => (
                <TableRow key={l._id} hover>
                  {canDecide && (
                    <TableCell>
                      {l.employeeId?.userId?.name}
                      <br />
                      <small>{l.employeeId?.employeeId} · {l.employeeId?.department}</small>
                    </TableCell>
                  )}
                  <TableCell>{leaveTypeLabel(l.leaveType)}</TableCell>
                  <TableCell>{formatDayRange(l.startDate, l.endDate)}</TableCell>
                  <TableCell align="right">{l.days}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography variant="body2" noWrap title={l.reason}>{l.reason}</Typography>
                    {l.rejectionReason && (
                      <Typography variant="caption" color="error" title={l.rejectionReason} sx={{ display: 'block' }}>
                        Rejected: {l.rejectionReason}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell><StatusChip status={l.status} /></TableCell>
                  {canDecide && (
                    <TableCell align="right">
                      {l.status === 'pending' ? (
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Button size="small" variant="contained" disabled={busyId === l._id} onClick={() => approve(l)}>Approve</Button>
                          <Button size="small" color="error" disabled={busyId === l._id} onClick={() => setRejecting(l)}>Reject</Button>
                        </Stack>
                      ) : (
                        <Tooltip title={l.approvedBy ? `By ${l.approvedBy.name}` : ''}>
                          <Typography variant="body2" color="text.secondary">{l.approvedBy?.name || '—'}</Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                  )}
                  {!canDecide && <TableCell>{l.approvedBy?.name || '—'}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Pager data={data} onChange={(p) => setFilters({ ...filters, ...p })} />
      </LoadState>

      <RejectLeaveDialog leave={rejecting} onClose={() => setRejecting(null)} onRejected={reload} />
    </Card>
  );
}

export default LeaveTable;
