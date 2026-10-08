import { useState } from 'react';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import PageHeader from '../../components/PageHeader';
import { useSnackbar } from '../../hooks/useSnackbar';
import { changePassword } from '../../services/platformService';
import { platformTokenReplaced, selectPlatform } from '../../store/platformSlice';
import { passwordProblem } from '../../utils/passwordPolicy';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

// The platform admin's own account. Platform admins are created only from the command line.
function PlatformAccountPage() {
  const dispatch = useDispatch();
  const toast = useSnackbar();
  const { admin } = useSelector(selectPlatform);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: undefined });
  };

  const submit = async (e) => {
    e.preventDefault();
    const problems = {
      newPassword: passwordProblem(form.newPassword),
      confirm: form.confirm === form.newPassword ? '' : 'Passwords do not match',
    };
    if (problems.newPassword || problems.confirm) {
      setErrors(problems);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { token } = await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      dispatch(platformTokenReplaced(token));
      setForm(EMPTY);
      toast.success('Password changed. Other sessions have been signed out.');
    } catch (err) {
      setError(err.message);
      setErrors(err.fieldErrors || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My account" />
      <Stack spacing={3} sx={{ maxWidth: 560 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography sx={{ fontWeight: 600 }}>{admin?.name}</Typography>
            <Typography color="text.secondary">{admin?.email}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Platform admin. New platform admins are created from the command line: npm run platform:create-admin.
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>Change password</Typography>
            <Stack component="form" spacing={2} onSubmit={submit} noValidate>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={Boolean(errors.currentPassword)} helperText={errors.currentPassword} required />
              <TextField label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={Boolean(errors.newPassword)} helperText={errors.newPassword || '8+ characters with a letter and a number'} required />
              <TextField label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={Boolean(errors.confirm)} helperText={errors.confirm} required />
              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" disabled={busy || !form.currentPassword}>
                  {busy ? 'Saving…' : 'Change password'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </>
  );
}

export default PlatformAccountPage;
