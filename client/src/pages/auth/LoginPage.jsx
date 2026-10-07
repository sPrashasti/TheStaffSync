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
    setSubmitting(true);
    setError('');
    setFieldErrors({});
    const result = await dispatch(login(form));
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
    <AuthCard title="Log in" subtitle="Welcome back. Sign in to continue.">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {notice && <Alert severity="info">{notice}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
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
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={change('password')}
          error={Boolean(fieldErrors.password)}
          helperText={fieldErrors.password}
          required
        />
        <Button type="submit" variant="contained" size="large" disabled={submitting || !form.email || !form.password}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
        <Typography variant="body2" textAlign="center">
          New employee?{' '}
          <Link component={RouterLink} to="/register">Create an account</Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

export default LoginPage;
