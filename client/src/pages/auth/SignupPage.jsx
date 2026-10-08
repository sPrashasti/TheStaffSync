import { useState } from 'react';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { signup } from '../../store/authSlice';
import { homePathFor } from '../../routes/navigation';
import { passwordProblem } from '../../utils/passwordPolicy';
import AuthCard from './AuthCard';

// A company starts using StaffSync. The person signing up becomes the new organisation's first HR
// user and adds everyone else; employees never create their own accounts.
function SignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '', confirm: '' });
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
    companyName: form.companyName.trim().length >= 2 ? '' : 'Company name is required',
    name: form.name.trim() ? '' : 'Name is required',
    email: /^\S+@\S+\.\S+$/.test(form.email) ? '' : 'Enter a valid email',
    password: passwordProblem(form.password),
    confirm: form.confirm === form.password ? '' : 'Passwords do not match',
  };
  const shown = (field) => serverErrors[field] || (touched[field] ? clientErrors[field] : '');
  const valid = Object.values(clientErrors).every((m) => !m);

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ companyName: true, name: true, email: true, password: true, confirm: true });
    if (!valid) return;
    setSubmitting(true);
    setError('');
    const { companyName, name, email, password } = form;
    const result = await dispatch(signup({ companyName, name, email, password }));
    setSubmitting(false);
    if (signup.fulfilled.match(result)) {
      navigate(homePathFor(result.payload.user.role), { replace: true });
    } else {
      setError(result.payload?.message || 'Sign-up failed');
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
    <AuthCard title="Set up your organisation" subtitle="Start StaffSync for your company. You will be its HR administrator and can then add your managers and employees.">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        {field('companyName', 'Company name', { autoComplete: 'organization', autoFocus: true })}
        {field('name', 'Your full name', { autoComplete: 'name' })}
        {field('email', 'Work email', { type: 'email', autoComplete: 'email' })}
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password', helperText: '8+ characters with a letter and a number' })}
        {field('confirm', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Setting up…' : 'Create organisation'}
        </Button>
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          Already using StaffSync?{' '}
          <Link component={RouterLink} to="/login">Log in</Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

export default SignupPage;
