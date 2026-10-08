import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSelector } from 'react-redux';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import { useApi } from '../../hooks/useApi';
import { useSnackbar } from '../../hooks/useSnackbar';
import { getMyProfile, updateEmployee } from '../../services/employeeService';
import { selectOrganisation } from '../../store/authSlice';
import { formatDay } from '../../utils/format';
import { ROLES } from '../../utils/labels';
import ChangePasswordDialog from './ChangePasswordDialog';

function Row({ label, value }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ sm: 2 }} sx={{ py: 1 }}>
      <Typography color="text.secondary" sx={{ minWidth: 180 }}>{label}</Typography>
      <Typography>{value || '—'}</Typography>
    </Stack>
  );
}

// Everyone's own profile. Only phone and address can be changed here; HR changes the rest.
function ProfilePage() {
  const toast = useSnackbar();
  const { data, loading, error, reload } = useApi(getMyProfile);
  const organisation = useSelector(selectOrganisation);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', address: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const open = () => {
    setForm({ phone: data.phone || '', address: data.address || '' });
    setErrors({});
    setFormError('');
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateEmployee(data._id, {
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });
      toast.success('Contact details updated');
      setEditing(false);
      reload();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(Object.keys(err.fieldErrors || {}).length ? '' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="My profile"
        actions={data && (
          <>
            {/* Demo accounts are shared, so the server refuses password changes there. */}
            {!organisation?.isDemo && <Button variant="outlined" onClick={() => setChangingPassword(true)}>Change password</Button>}
            <Button variant="contained" onClick={open}>Edit contact details</Button>
          </>
        )}
      />
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        {data && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{data.userId.name}</Typography>
              <Typography color="text.secondary">{data.designation} · {data.department}</Typography>
              <Divider sx={{ my: 2 }} />
              <Row label="Employee ID" value={data.employeeId} />
              <Row label="Email" value={data.userId.email} />
              <Row label="Role" value={ROLES.find((r) => r.value === data.userId.role)?.label} />
              <Row label="Reports to" value={data.managerId?.userId?.name} />
              <Row label="Joining date" value={formatDay(data.joiningDate)} />
              <Row label="Date of birth" value={data.dateOfBirth && formatDay(data.dateOfBirth)} />
              <Row label="Time zone" value={data.timeZone || 'Company default'} />
              <Row label="Phone" value={data.phone} />
              <Row label="Address" value={data.address} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                To change your name, role, department or time zone, contact HR.
              </Typography>
            </CardContent>
          </Card>
        )}
      </LoadState>

      <ChangePasswordDialog open={changingPassword} onClose={() => setChangingPassword(false)} />

      <Dialog open={editing} onClose={busy ? undefined : () => setEditing(false)} maxWidth="sm" fullWidth>
        <form onSubmit={save} noValidate>
          <DialogTitle>Edit contact details</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={Boolean(errors.phone)} helperText={errors.phone || 'e.g. +91 98765 43210'} />
              <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} error={Boolean(errors.address)} helperText={errors.address} multiline minRows={2} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={busy}>Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

export default ProfilePage;
