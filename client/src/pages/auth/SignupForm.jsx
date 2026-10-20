import { useState } from 'react';
import { Alert, Box, Button, Link, Stack, Typography } from '@mui/material';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import { useDispatch } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { signup } from '../../store/authSlice';
import { homePathFor } from '../../routes/navigation';
import { passwordProblem } from '../../utils/passwordPolicy';
import LandingField from './landing/LandingField';
import { clayPremium, GOLD, MUTED, SERIF } from './landing/landingStyles';

// A company starts using StaffSync. The person signing up becomes the new organisation's first HR
// user and adds everyone else; employees never create their own accounts.
// Used on the sign-up page and in the login page's panel. `onLogin`, when given, switches to the
// login form in place instead of linking to the login page; `compact` uses a smaller heading.
function SignupForm({ onLogin, compact = false, autoFocus = false }) {
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

  const field = (name, label, icon, props = {}) => (
    <LandingField
      id={`signup-${name}`}
      name={name}
      label={label}
      icon={icon}
      value={form[name]}
      onChange={change(name)}
      onBlur={blur(name)}
      error={shown(name)}
      helperText={shown(name) || props.helperText}
      required
      dense={compact}
      {...props}
    />
  );
  // Compact (the landing panel): two fields per row from tablet width up, so the form fits on one screen.
  const pair = (a, b) => (compact ? (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 1.5, sm: 1.25 }, alignItems: 'start' }}>{a}{b}</Box>
  ) : <>{a}{b}</>);
  const passwordHint = '8+ characters with a letter and a number';

  return (
    <Stack component="form" spacing={compact ? 1.5 : 2} onSubmit={submit} noValidate>
      <Box sx={{ textAlign: 'center' }}>
        <Typography component="h2" sx={{ fontFamily: SERIF, fontSize: compact ? 24 : 32, fontWeight: 600 }}>Set up your organisation</Typography>
        <Typography sx={{ color: MUTED, fontSize: compact ? 13.5 : undefined }}>
          {compact ? 'You will be its HR administrator.' : 'You will be its HR administrator and can then add your managers and employees.'}
        </Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {pair(
        field('companyName', 'Company name', ApartmentOutlinedIcon, { autoComplete: 'organization', autoFocus }),
        field('name', 'Your full name', PersonOutlineIcon, { autoComplete: 'name' }),
      )}
      {field('email', 'Work email', MailOutlineIcon, { type: 'email', autoComplete: 'email' })}
      {pair(
        field('password', 'Password', LockOutlinedIcon, { type: 'password', autoComplete: 'new-password', helperText: compact ? undefined : passwordHint }),
        field('confirm', compact ? 'Confirm' : 'Confirm password', LockOutlinedIcon, { type: 'password', autoComplete: 'new-password' }),
      )}
      {compact && !shown('password') && !shown('confirm') && (
        <Typography variant="caption" sx={{ color: MUTED, mt: '6px !important' }}>{passwordHint}</Typography>
      )}
      <Button type="submit" variant="premium" size="large" fullWidth disabled={submitting} endIcon={!submitting && <ArrowForwardIcon />} sx={{ ...clayPremium, borderRadius: compact ? '14px' : '16px', py: compact ? 1.2 : 1.6 }}>
        {submitting ? 'Setting up…' : 'Create organisation'}
      </Button>
      <Typography variant="body2" sx={{ textAlign: 'center', color: MUTED }}>
        Already using StaffSync?{' '}
        {onLogin ? (
          <Link component="button" type="button" onClick={onLogin} sx={{ color: GOLD, verticalAlign: 'baseline' }}>Log in</Link>
        ) : (
          <Link component={RouterLink} to="/login" sx={{ color: GOLD }}>Log in</Link>
        )}
      </Typography>
    </Stack>
  );
}

export default SignupForm;
