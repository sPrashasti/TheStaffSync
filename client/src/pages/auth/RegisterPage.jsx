import { useState } from 'react';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { register } from '../../store/authSlice';
import { homePathFor } from '../../routes/navigation';
import { passwordProblem } from '../../utils/passwordPolicy';
import AuthCard from './AuthCard';

function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [serverErrors, setServerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setServerErrors({ ...serverErrors, [field]: undefined });
  };
  const blur = (field) => () => setTouched({ ...touched, [field]: true });

  const clientErrors = {
    name: form.name.trim() ? '' : 'Name is required',
    email: /^\S+@\S+\.\S+$/.test(form.email) ? '' : 'Enter a valid email',
    password: passwordProblem(form.password),
    confirm: form.confirm === form.password ? '' : 'Passwords do not match',
  };
  const shown = (field) => serverErrors[field] || (touched[field] ? clientErrors[field] : '');
  const valid = Object.values(clientErrors).every((m) => !m);

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (!valid) return;
    setSubmitting(true);
    setError('');
    const { name, email, password } = form;
    const result = await dispatch(register({ name, email, password }));
    setSubmitting(false);
    if (register.fulfilled.match(result)) {
      navigate(homePathFor(result.payload.user.role), { replace: true });
    } else {
      setError(result.payload?.message || 'Registration failed');
      setServerErrors(result.payload?.fieldErrors || {});
    }
  };

  const field = (name, label, props = {}) => (
    <TextField
      label={label}
      value={form[name]}
      onChange={change(name)}
      onBlur={blur(name)}
      error={Boolean(shown(name))}
      helperText={shown(name) || props.helperText}
      required
      {...props}
    />
  );

  return (
    <AuthCard title="Create your account" subtitle="For employees. Managers and HR accounts are set up by HR.">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        {field('name', 'Full name', { autoComplete: 'name', autoFocus: true })}
        {field('email', 'Work email', { type: 'email', autoComplete: 'email' })}
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password', helperText: '8+ characters with a letter and a number' })}
        {field('confirm', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <Typography variant="body2" textAlign="center">
          Already registered?{' '}
          <Link component={RouterLink} to="/login">Log in</Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

export default RegisterPage;
