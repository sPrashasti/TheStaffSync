import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { useApi } from '../../hooks/useApi';
import { useSnackbar } from '../../hooks/useSnackbar';
import { createEmployee, listEmployees, updateEmployee } from '../../services/employeeService';
import { DISPLAY_TIME_ZONES } from '../../store/preferencesSlice';
import { ROLES } from '../../utils/labels';

const BLANK = {
  name: '', email: '', password: '', role: 'employee', department: '', designation: '', joiningDate: '',
  managerId: '', phone: '', address: '', dateOfBirth: '', timeZone: '',
};
// Optional fields: an empty box means "clear it" (null) when editing, "leave out" when creating.
const OPTIONAL = ['managerId', 'phone', 'address', 'dateOfBirth', 'timeZone'];
const day = (value) => (value ? String(value).slice(0, 10) : '');

const fromEmployee = (e) => ({
  ...BLANK,
  name: e.userId.name,
  email: e.userId.email,
  role: e.userId.role,
  department: e.department,
  designation: e.designation,
  joiningDate: day(e.joiningDate),
  managerId: e.managerId?._id || e.managerId || '',
  phone: e.phone || '',
  address: e.address || '',
  dateOfBirth: day(e.dateOfBirth),
  timeZone: e.timeZone || '',
});

// HR form for creating an employee (any role) or editing one. `employee` set = edit mode.
function EmployeeFormDialog({ open, employee, defaultRole = 'employee', onClose, onSaved }) {
  const toast = useSnackbar();
  const editing = Boolean(employee);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const managers = useApi(() => (open ? listEmployees({ role: 'manager', isActive: 'true', limit: 100 }) : Promise.resolve(null)), [open]);
  const [loadedFor, setLoadedFor] = useState(null);

  // Fill the form each time the dialog opens for a different person.
  const formKey = open ? employee?._id || `new-${defaultRole}` : null;
  if (formKey !== loadedFor) {
    setLoadedFor(formKey);
    setForm(employee ? fromEmployee(employee) : { ...BLANK, role: defaultRole });
    setErrors({});
    setError('');
  }

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: undefined });
  };

  const buildBody = () => {
    const original = employee ? fromEmployee(employee) : null;
    const body = {};
    Object.entries(form).forEach(([field, value]) => {
      if (editing && field === 'password') return;
      if (editing && value === original[field]) return; // unchanged
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (trimmed === '' && OPTIONAL.includes(field)) {
        if (editing) body[field] = null;
        return;
      }
      if (trimmed === '' && field === 'joiningDate') return;
      body[field] = trimmed;
    });
    return body;
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = buildBody();
    if (editing && Object.keys(body).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editing) await updateEmployee(employee._id, body);
      else await createEmployee(body);
      toast.success(editing ? 'Employee updated' : 'Employee created');
      onSaved?.();
      onClose();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setError(err.message === 'Validation failed' ? 'Please correct the highlighted fields.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  const text = (name, label, props = {}) => (
    <TextField label={label} value={form[name]} onChange={set(name)} error={Boolean(errors[name])} helperText={errors[name] || props.helperText} fullWidth {...props} />
  );
  const date = (name, label) => text(name, label, { type: 'date', slotProps: { inputLabel: { shrink: true } } });
  const managerOptions = (managers.data?.items || []).filter((m) => m._id !== employee?._id);
  const zoneOptions = DISPLAY_TIME_ZONES.some((z) => z.value === form.timeZone) || !form.timeZone
    ? DISPLAY_TIME_ZONES
    : [...DISPLAY_TIME_ZONES, { value: form.timeZone, label: form.timeZone }];

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>{editing ? `Edit ${employee.userId.name} (${employee.employeeId})` : 'Add a person'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {text('name', 'Full name', { required: true })}
              {text('email', 'Email', { type: 'email', required: true })}
            </Stack>
            {!editing && text('password', 'Initial password', { type: 'password', required: true, helperText: '8+ characters with a letter and a number. Share it securely.' })}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {text('role', 'Role', { select: true, children: ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>) })}
              {text('department', 'Department', { required: true })}
              {text('designation', 'Designation', { required: true })}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {text('managerId', 'Reports to', {
                select: true,
                children: [
                  <MenuItem key="" value="">No manager</MenuItem>,
                  ...managerOptions.map((m) => <MenuItem key={m._id} value={m._id}>{m.userId.name} · {m.department}</MenuItem>),
                ],
              })}
              {text('timeZone', 'Time zone', {
                select: true,
                helperText: errors.timeZone || 'Decides which day their check-ins and leave fall on',
                children: [
                  <MenuItem key="" value="">Company default</MenuItem>,
                  ...zoneOptions.map((z) => <MenuItem key={z.value} value={z.value}>{z.label}</MenuItem>),
                ],
              })}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {date('joiningDate', 'Joining date')}
              {date('dateOfBirth', 'Date of birth')}
              {text('phone', 'Phone')}
            </Stack>
            {text('address', 'Address', { multiline: true, minRows: 2 })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{editing ? 'Save changes' : 'Create'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default EmployeeFormDialog;
