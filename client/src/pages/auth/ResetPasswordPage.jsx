import { useState } from 'react';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../services/authService';
import { logout } from '../../store/authSlice';
import { passwordProblem } from '../../utils/passwordPolicy';
import AuthCard from './AuthCard';

// Opened from the emailed link (/reset-password?token=…). On success every existing session is
// signed out, including one in this browser, and the user logs in with the new password.
function ResetPasswordPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: undefined });
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
      const { message } = await resetPassword({ token, newPassword: form.newPassword });
      dispatch(logout());
      navigate('/login', { replace: true, state: { message } });
    } catch (err) {
      setErrors(err.fieldErrors?.newPassword ? { newPassword: err.fieldErrors.newPassword } : {});
      setError(err.fieldErrors?.token || (err.fieldErrors?.newPassword ? '' : err.message));
    } finally {
      setBusy(false);
    }
  };

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <AuthCard title="This link is not valid" subtitle="Reset links come from the email we send. Request a new one below.">
        <Button component={RouterLink} to="/forgot-password" variant="contained">Request a new link</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="You will be signed out everywhere and can then log in with the new password.">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {error && (
          <Alert severity="error" action={<Button color="inherit" size="small" component={RouterLink} to="/forgot-password">New link</Button>}>
            {error}
          </Alert>
        )}
        <TextField
          type="password"
          label="New password"
          value={form.newPassword}
          onChange={set('newPassword')}
          error={Boolean(errors.newPassword)}
          helperText={errors.newPassword || '8+ characters with a letter and a number'}
          autoComplete="new-password"
          required
          autoFocus
        />
        <TextField
          type="password"
          label="Confirm new password"
          value={form.confirm}
          onChange={set('confirm')}
          error={Boolean(errors.confirm)}
          helperText={errors.confirm}
          autoComplete="new-password"
          required
        />
        <Button type="submit" variant="contained" size="large" disabled={busy}>
          {busy ? 'Saving…' : 'Reset password'}
        </Button>
        <Typography variant="body2" textAlign="center">
          <Link component={RouterLink} to="/login">Back to log in</Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

export default ResetPasswordPage;
