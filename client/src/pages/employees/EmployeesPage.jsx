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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useSelector } from 'react-redux';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import Pager from '../../components/Pager';
import StatusChip from '../../components/StatusChip';
import TableMessage from '../../components/TableMessage';
import { useApi } from '../../hooks/useApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSnackbar } from '../../hooks/useSnackbar';
import { deactivateEmployee, listEmployees, updateEmployee } from '../../services/employeeService';
import { selectUser } from '../../store/authSlice';
import { ROLES } from '../../utils/labels';
import EmployeeFormDialog from './EmployeeFormDialog';

const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null));
const roleLabel = (role) => ROLES.find((r) => r.value === role)?.label || role;

// HR directory. fixedRole="manager" turns it into the Managers page.
function EmployeesPage({ fixedRole }) {
  const toast = useSnackbar();
  const me = useSelector(selectUser);
  const [filters, setFilters] = useState({ department: '', role: fixedRole || '', isActive: 'true', page: 1, limit: 10 });
  // The department box waits for a pause in typing before asking the server.
  const query = { ...filters, department: useDebouncedValue(filters.department) };
  const { data, loading, error, reload } = useApi(() => listEmployees(compact(query)), [query]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setFilters({ ...filters, [field]: e.target.value, page: 1 });

  const deactivate = async () => {
    setBusy(true);
    try {
      await deactivateEmployee(confirming._id);
      toast.success(`${confirming.userId.name} has been deactivated`);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const reactivate = async (employee) => {
    try {
      await updateEmployee(employee._id, { isActive: true });
      toast.success(`${employee.userId.name} has been reactivated`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const title = fixedRole === 'manager' ? 'Managers' : 'Employees';

  return (
    <>
      <PageHeader
        title={title}
        subtitle={fixedRole === 'manager' ? 'People with the manager role' : 'Everyone in the company'}
        actions={<Button variant="premium" startIcon={<AddIcon />} onClick={() => setCreating(true)}>Add {fixedRole === 'manager' ? 'manager' : 'person'}</Button>}
      />
      <Card variant="outlined">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2 }} flexWrap="wrap" useFlexGap>
          <TextField label="Department" size="small" value={filters.department} onChange={set('department')} />
          {!fixedRole && (
            <TextField select label="Role" size="small" value={filters.role} onChange={set('role')} sx={{ minWidth: 150 }}>
              <MenuItem value="">Any</MenuItem>
              {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
          )}
          <TextField select label="Status" size="small" value={filters.isActive} onChange={set('isActive')} sx={{ minWidth: 150 }}>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Deactivated</MenuItem>
            <MenuItem value="">Everyone</MenuItem>
          </TextField>
        </Stack>

        <LoadState loading={loading} error={error} data={data} onRetry={reload}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Designation</TableCell>
                  <TableCell>Reports to</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.length === 0 && <TableMessage colSpan={8}>No one matches these filters.</TableMessage>}
                {data?.items.map((e) => (
                  <TableRow key={e._id} hover>
                    <TableCell>{e.employeeId}</TableCell>
                    <TableCell>{e.userId.name}<br /><small>{e.userId.email}</small></TableCell>
                    <TableCell>{roleLabel(e.userId.role)}</TableCell>
                    <TableCell>{e.department}</TableCell>
                    <TableCell>{e.designation}</TableCell>
                    <TableCell>{e.managerId?.userId?.name || '—'}</TableCell>
                    <TableCell><StatusChip status={e.userId.isActive ? 'active' : 'inactive'} /></TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => setEditing(e)}>Edit</Button>
                        {e.userId.isActive && e.userId._id !== me._id && (
                          <Button size="small" color="error" onClick={() => setConfirming(e)}>Deactivate</Button>
                        )}
                        {!e.userId.isActive && <Button size="small" onClick={() => reactivate(e)}>Reactivate</Button>}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pager data={data} onChange={(p) => setFilters({ ...filters, ...p })} />
        </LoadState>
      </Card>

      <EmployeeFormDialog
        open={creating || Boolean(editing)}
        employee={editing}
        defaultRole={fixedRole || 'employee'}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={reload}
      />
      <ConfirmDialog
        open={Boolean(confirming)}
        title="Deactivate account?"
        message={confirming ? `${confirming.userId.name} will be signed out and unable to log in. Their history is kept, and you can reactivate them later.` : ''}
        confirmLabel="Deactivate"
        danger
        busy={busy}
        onConfirm={deactivate}
        onClose={() => setConfirming(null)}
      />
    </>
  );
}

export function ManagersPage() {
  return <EmployeesPage fixedRole="manager" />;
}

export default EmployeesPage;
