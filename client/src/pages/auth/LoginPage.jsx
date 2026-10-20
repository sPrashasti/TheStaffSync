import { useEffect, useState } from 'react';
import { Alert, Box, Button, Link, Stack, Tab, Tabs, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { clearNotice, demoLogin, login, selectAuth } from '../../store/authSlice';
import { getDemo } from '../../services/demoService';
import { homePathFor } from '../../routes/navigation';
import AuthLanding from './landing/AuthLanding';
import LandingField from './landing/LandingField';
import { clayPremium, frostedInset, GOLD, MUTED, SERIF } from './landing/landingStyles';
import SignupForm from './SignupForm';

function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { notice } = useSelector(selectAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [demo, setDemo] = useState(null);
  const [demoError, setDemoError] = useState('');
  // The forms sit in a panel beside the pitch, with a tab for each. The login field takes focus by
  // itself only when there is a reason: a redirect from a protected page, a message from another
  // page, or a session-expired notice. Hero buttons and the sign-up form ask for a tab with `show`.
  const [tab, setTab] = useState('login');
  const [focusRequest, setFocusRequest] = useState(
    location.state?.from || location.state?.message || location.state?.openLogin || notice ? 1 : 0,
  );
  const show = (next) => {
    setTab(next);
    setFocusRequest((n) => n + 1);
  };
  useEffect(() => {
    if (!focusRequest) return;
    const input = document.getElementById(tab === 'login' ? 'login-email' : 'signup-companyName');
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusRequest, tab]);

  // Offer the public demo only when the server has one; a failure just hides the buttons.
  useEffect(() => {
    getDemo().then(setDemo).catch(() => setDemo(null));
  }, []);

  const tryDemo = async (role) => {
    setSubmitting(true);
    setDemoError('');
    const result = await dispatch(demoLogin(role));
    setSubmitting(false);
    if (demoLogin.fulfilled.match(result)) {
      navigate(homePathFor(result.payload.user.role), { replace: true });
    } else {
      setDemoError(result.payload?.message || 'The demo is not available right now.');
    }
  };

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

  const loginForm = (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate>
      <Stack spacing={0.5} sx={{ alignItems: 'center', textAlign: 'center', mb: 0.5 }}>
        <Typography id="login-title" component="h2" sx={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600 }}>Welcome back</Typography>
        <Typography sx={{ color: MUTED, fontSize: 13.5 }}>Log in to your account to continue</Typography>
      </Stack>
      {location.state?.message && <Alert severity="success">{location.state.message}</Alert>}
      {notice && <Alert severity="info">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <LandingField
        id="login-email"
        name="email"
        label="Email"
        icon={MailOutlineIcon}
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        value={form.email}
        onChange={change('email')}
        error={fieldErrors.email}
        dense
        required
      />
      <LandingField
        id="login-password"
        name="password"
        label="Password"
        icon={LockOutlinedIcon}
        type="password"
        autoComplete="current-password"
        value={form.password}
        onChange={change('password')}
        error={fieldErrors.password}
        dense
        required
      />
      <Typography variant="body2" sx={{ textAlign: 'right', mt: '4px !important' }}>
        <Link component={RouterLink} to="/forgot-password" sx={{ color: GOLD, textDecorationColor: 'currentColor', fontSize: 13 }}>Forgot password?</Link>
      </Typography>
      <Button type="submit" variant="premium" size="large" fullWidth disabled={submitting} endIcon={!submitting && <ArrowForwardIcon />} sx={{ ...clayPremium, borderRadius: '14px', py: 1.2 }}>
        {submitting ? 'Logging in…' : 'Log in'}
      </Button>
    </Stack>
  );

  const panel = (
    <Box>
      <Tabs
        value={tab}
        onChange={(e, next) => setTab(next)}
        variant="fullWidth"
        aria-label="Log in or sign up"
        sx={{
          mb: 3,
          minHeight: 0,
          borderRadius: '14px',
          p: 0.5,
          ...frostedInset,
          '& .MuiTabs-indicator': { height: '100%', borderRadius: '10px', background: 'var(--metal)', zIndex: 0 },
          '& .MuiTab-root': { zIndex: 1, minHeight: 40, py: 1, borderRadius: '10px', fontWeight: 600, textTransform: 'none', color: MUTED, transition: 'color 200ms ease' },
          '& .MuiTab-root.Mui-selected': { color: 'var(--on-metal)' },
        }}
      >
        <Tab value="login" label="Log in" id="auth-tab-login" aria-controls="auth-panel-login" />
        <Tab value="signup" label="Sign up" id="auth-tab-signup" aria-controls="auth-panel-signup" />
      </Tabs>
      <Box role="tabpanel" id={`auth-panel-${tab}`} aria-labelledby={`auth-tab-${tab}`}>
        {tab === 'login' ? loginForm : <SignupForm compact onLogin={() => show('login')} />}
      </Box>
    </Box>
  );

  return (
    <AuthLanding
      mode="login"
      card={panel}
      cardSx={{ maxWidth: tab === 'login' ? 385 : 420, transition: 'max-width 220ms ease' }}
      onSignup={() => show('signup')}
      demo={demo}
      onDemo={tryDemo}
      demoError={demoError}
      busy={submitting}
    />
  );
}

export default LoginPage;
