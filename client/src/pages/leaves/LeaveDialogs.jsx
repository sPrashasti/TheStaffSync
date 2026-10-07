import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { useSnackbar } from '../../hooks/useSnackbar';
import { applyLeave, rejectLeave } from '../../services/leaveService';
import { LEAVE_TYPES } from '../../utils/labels';

const EMPTY = { leaveType: 'casual', startDate: '', endDate: '', reason: '' };

// Leave request form. Business rules (no past dates, 60-day limit, overlaps) are enforced by
// the API; its messages appear against the matching field.
export function ApplyLeaveDialog({ open, onClose, onApplied }) {
  const toast = useSnackbar();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => {
    const value = e.target.value;
    // Picking a start date after the current end date moves the end date along.
    const next = { ...form, [field]: value };
    if (field === 'startDate' && (!form.endDate || form.endDate < value)) next.endDate = value;
    setForm(next);
    setErrors({ ...errors, [field]: undefined });
  };

  const close = () => {
    setForm(EMPTY);
    setErrors({});
    setError('');
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await applyLeave({ ...form, reason: form.reason.trim() });
      toast.success('Leave request submitted');
      onApplied?.();
      close();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (!Object.keys(err.fieldErrors || {}).length) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : close} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>Apply for leave</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField select label="Leave type" value={form.leaveType} onChange={set('leaveType')} error={Boolean(errors.leaveType)} helperText={errors.leaveType || (form.leaveType === 'sick' ? 'Sick leave can start up to 30 days ago' : '')}>
              {LEAVE_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="From" type="date" value={form.startDate} onChange={set('startDate')} error={Boolean(errors.startDate)} helperText={errors.startDate} required fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="To" type="date" value={form.endDate} onChange={set('endDate')} error={Boolean(errors.endDate)} helperText={errors.endDate} required fullWidth slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: form.startDate || undefined } }} />
            </Stack>
            <TextField label="Reason" value={form.reason} onChange={set('reason')} error={Boolean(errors.reason)} helperText={errors.reason || `${form.reason.length}/500`} multiline minRows={3} required slotProps={{ htmlInput: { maxLength: 500 } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || !form.startDate || !form.endDate || !form.reason.trim()}>
            Submit request
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Rejection needs a reason, which the applicant sees.
export function RejectLeaveDialog({ leave, onClose, onRejected }) {
  const toast = useSnackbar();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setReason('');
    setError('');
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await rejectLeave(leave._id, reason.trim());
      toast.success('Leave rejected');
      onRejected?.();
      close();
    } catch (err) {
      setError(err.fieldErrors?.rejectionReason || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(leave)} onClose={busy ? undefined : close} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>Reject leave request</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason (shown to the employee)"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            error={Boolean(error)}
            helperText={error || `${reason.length}/500`}
            multiline
            minRows={3}
            fullWidth
            required
            autoFocus
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" color="error" disabled={busy || !reason.trim()}>Reject</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
