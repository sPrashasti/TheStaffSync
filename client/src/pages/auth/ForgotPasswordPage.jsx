import { useState } from 'react';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { forgotPassword } from '../../services/authService';
import AuthCard from './AuthCard';

// Asks for a reset link. The reply is the same whether or not the email has an account.
function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const value = (new FormData(e.currentTarget).get('email') || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { message } = await forgotPassword(value);
      setSent(message);
    } catch (err) {
      setError(err.fieldErrors?.email || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your work email and we will send you a link to choose a new one.">
      {sent ? (
        <Stack spacing={2}>
          <Alert severity="success">{sent}</Alert>
          <Typography variant="body2" color="text.secondary">
            The link expires in 30 minutes. Check your spam folder if it does not arrive.
          </Typography>
          <Button component={RouterLink} to="/login" variant="contained">Back to log in</Button>
        </Stack>
      ) : (
        <Stack component="form" spacing={2} onSubmit={submit} noValidate>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
          <Typography variant="body2" textAlign="center">
            Remembered it? <Link component={RouterLink} to="/login">Log in</Link>
          </Typography>
        </Stack>
      )}
    </AuthCard>
  );
}

export default ForgotPasswordPage;
