import { useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { platformLogin, selectPlatform } from '../../store/platformSlice';
import AuthCard from '../auth/AuthCard';

// Sign-in for StaffSync operators only. Organisation accounts, HR included, do not work here,
// and platform accounts do not work on the normal login page.
function PlatformLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notice } = useSelector(selectPlatform);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const credentials = { email: String(values.email).trim(), password: String(values.password) };
    if (!credentials.email || !credentials.password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await dispatch(platformLogin(credentials));
    setSubmitting(false);
    if (platformLogin.fulfilled.match(result)) navigate('/platform/dashboard', { replace: true });
    else setError(result.payload?.message || 'Login failed');
  };

  return (
    <AuthCard title="Platform console" subtitle="For StaffSync staff only. Company users sign in on the normal login page.">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {notice && <Alert severity="info">{notice}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField name="email" label="Email" type="email" autoComplete="username" required autoFocus />
        <TextField name="password" label="Password" type="password" autoComplete="current-password" required />
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </Stack>
    </AuthCard>
  );
}

export default PlatformLoginPage;
