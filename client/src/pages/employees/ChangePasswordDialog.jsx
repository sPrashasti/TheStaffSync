import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useDispatch } from 'react-redux';
import { useSnackbar } from '../../hooks/useSnackbar';
import { changePassword } from '../../services/authService';
import { tokenReplaced } from '../../store/authSlice';
import { passwordProblem } from '../../utils/passwordPolicy';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

// Changing the password signs out every other session; this one carries on with a new token.
function ChangePasswordDialog({ open, onClose }) {
  const dispatch = useDispatch();
  const toast = useSnackbar();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
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
    const problem = passwordProblem(form.newPassword);
    const local = {
      ...(problem && { newPassword: problem }),
      ...(form.confirm !== form.newPassword && { confirm: 'Passwords do not match' }),
    };
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { token } = await changePassword(form);
      dispatch(tokenReplaced(token));
      toast.success('Password changed. Other devices have been signed out.');
      close();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (!Object.keys(err.fieldErrors || {}).length) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, autoComplete) => (
    <TextField
      type="password"
      label={label}
      value={form[name]}
      onChange={set(name)}
      error={Boolean(errors[name])}
      helperText={errors[name] || (name === 'newPassword' ? '8+ characters with a letter and a number' : '')}
      autoComplete={autoComplete}
      required
      fullWidth
    />
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : close} maxWidth="xs" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>Change password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {field('currentPassword', 'Current password', 'current-password')}
            {field('newPassword', 'New password', 'new-password')}
            {field('confirm', 'Confirm new password', 'new-password')}
            <Alert severity="info">You will stay signed in here; other devices will need to log in again.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || !form.currentPassword || !form.newPassword}>
            Change password
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default ChangePasswordDialog;
