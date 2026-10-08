import { useEffect, useState } from 'react';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { clearNotice, login, selectAuth } from '../../store/authSlice';
import { homePathFor } from '../../routes/navigation';
import AuthCard from './AuthCard';

function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { notice } = useSelector(selectAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // A session-expired notice is shown once, then cleared.
  useEffect(() => () => { dispatch(clearNotice()); }, [dispatch]);

  const change = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    // Read the inputs directly: browser autofill fills them without telling React.
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const credentials = { email: values.email.trim(), password: values.password };
    setForm(credentials);
    setError('');
    setFieldErrors({});
    if (!credentials.email || !credentials.password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    const result = await dispatch(login(credentials));
    setSubmitting(false);
    if (login.fulfilled.match(result)) {
      // Back to the page that asked for a login, if it belongs to this role.
      const from = location.state?.from?.pathname;
      const home = homePathFor(result.payload.user.role);
      navigate(from && from.startsWith(`/${result.payload.user.role}/`) ? from : home, { replace: true });
    } else {
      setError(result.payload?.message || 'Login failed');
      setFieldErrors(result.payload?.fieldErrors || {});
    }
  };

  return (
    <AuthCard title="Log in" subtitle="One login for everyone. You will go straight to your HR, manager or employee dashboard.">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {location.state?.message && <Alert severity="success">{location.state.message}</Alert>}
        {notice && <Alert severity="info">{notice}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={change('email')}
          error={Boolean(fieldErrors.email)}
          helperText={fieldErrors.email}
          required
          autoFocus
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={change('password')}
          error={Boolean(fieldErrors.password)}
          helperText={fieldErrors.password}
          required
        />
        <Typography variant="body2" textAlign="right" sx={{ mt: -1 }}>
          <Link component={RouterLink} to="/forgot-password">Forgot password?</Link>
        </Typography>
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
        <Typography variant="body2" textAlign="center">
          New to StaffSync?{' '}
          <Link component={RouterLink} to="/signup">Set up your organisation</Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

export default LoginPage;
