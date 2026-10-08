import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useParams } from 'react-router-dom';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import StatCard, { StatGrid } from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import { useApi } from '../../hooks/useApi';
import { useSnackbar } from '../../hooks/useSnackbar';
import {
  getOrganisation,
  listAudit,
  reactivateOrganisation,
  renameOrganisation,
  suspendOrganisation,
} from '../../services/platformService';
import { selectDisplayTimeZone } from '../../store/preferencesSlice';
import { formatDateTime, formatDay } from '../../utils/format';
import AuditTable from './AuditTable';

function Row({ label, children }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ sm: 2 }} sx={{ py: 0.75 }}>
      <Typography color="text.secondary" sx={{ minWidth: 180 }}>{label}</Typography>
      <Box>{children}</Box>
    </Stack>
  );
}

// One form dialog for the three actions: rename (text), suspend (reason) and reactivate (confirm).
const ACTIONS = {
  rename: { title: 'Rename organisation', field: 'Organisation name', button: 'Rename' },
  suspend: {
    title: 'Suspend organisation',
    field: 'Reason (recorded in the audit log)',
    button: 'Suspend',
    danger: true,
    text: 'Every user of this organisation is signed out on their next request and cannot sign in until it is reactivated. No data is deleted.',
  },
  reactivate: { title: 'Reactivate organisation', button: 'Reactivate', text: 'Its users can sign in and carry on as before.' },
};

// An organisation as the platform sees it: usage counts and HR contacts, never employee records.
function PlatformOrganisationPage() {
  const { id } = useParams();
  const toast = useSnackbar();
  const timeZone = useSelector(selectDisplayTimeZone);
  const { data, loading, error, reload } = useApi(() => getOrganisation(id), [id]);
  const audit = useApi(() => listAudit({ organisationId: id, limit: 10 }), [id]);
  const [action, setAction] = useState(null);
  const [value, setValue] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (name) => {
    setAction(name);
    setValue(name === 'rename' ? data.name : '');
    setFormError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      if (action === 'rename') await renameOrganisation(id, value.trim());
      if (action === 'suspend') await suspendOrganisation(id, value.trim());
      if (action === 'reactivate') await reactivateOrganisation(id);
      toast.success({ rename: 'Organisation renamed', suspend: 'Organisation suspended', reactivate: 'Organisation reactivated' }[action]);
      setAction(null);
      reload();
      audit.reload();
    } catch (err) {
      setFormError(Object.values(err.fieldErrors || {})[0] || err.message);
    } finally {
      setBusy(false);
    }
  };

  const config = action && ACTIONS[action];

  return (
    <>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <Link component={RouterLink} to="/platform/organisations">← All organisations</Link>
      </Typography>
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        {data && (
          <>
            <PageHeader
              title={data.name}
              subtitle={`${data.slug} · signed up ${formatDay(data.createdAt)}${data.isDemo ? ' · public demo' : ''}`}
              actions={[
                <Button key="rename" variant="outlined" onClick={() => open('rename')}>Rename</Button>,
                data.status === 'active'
                  ? <Button key="suspend" variant="contained" color="error" onClick={() => open('suspend')}>Suspend</Button>
                  : <Button key="reactivate" variant="contained" onClick={() => open('reactivate')}>Reactivate</Button>,
              ]}
            />

            {data.suspension && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Suspended {formatDateTime(data.suspension.at, timeZone)}: {data.suspension.reason}
              </Alert>
            )}

            <StatGrid min={170}>
              <StatCard label="Active users" value={data.activeUsers} hint={`${data.usage.users.inactive} deactivated`} />
              <StatCard label="HR · Managers · Employees" value={`${data.usage.users.hr} · ${data.usage.users.manager} · ${data.usage.users.employee}`} />
              <StatCard label="Check-ins, last 30 days" value={data.usage.attendanceLast30Days} hint={`Last: ${formatDateTime(data.usage.lastCheckIn, timeZone)}`} />
              <StatCard label="Pending leave" value={data.usage.pendingLeave} />
              <StatCard label="Trainings · Announcements" value={`${data.usage.trainings} · ${data.usage.announcements}`} />
            </StatGrid>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, mb: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>Details</Typography>
                  <Row label="Status"><StatusChip status={data.status} /></Row>
                  <Row label="Time zone">{data.settings.timeZone}</Row>
                  <Row label="Working days">{data.settings.workingDays.join(', ')}</Row>
                  {data.isDemo && <Row label="Demo last reset">{formatDateTime(data.demoLastResetAt, timeZone)}</Row>}
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>HR contacts</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    The organisation&apos;s administrators, for support. Employee records stay private to the organisation.
                  </Typography>
                  {data.hrContacts.length === 0 && <Typography color="text.secondary">No HR accounts.</Typography>}
                  {data.hrContacts.map((c) => (
                    <Stack key={c.email} direction="row" spacing={1} sx={{ alignItems: 'center', py: 0.5 }}>
                      <Typography>{c.name}</Typography>
                      <Link href={`mailto:${c.email}`}>{c.email}</Link>
                      {!c.isActive && <StatusChip status="inactive" />}
                    </Stack>
                  ))}
                </CardContent>
              </Card>
            </Box>

            <Card variant="outlined">
              <CardContent sx={{ pb: 0 }}>
                <Typography variant="h6" component="h2">Recent platform actions</Typography>
              </CardContent>
              <LoadState loading={audit.loading} error={audit.error} data={audit.data} onRetry={audit.reload}>
                {audit.data && <AuditTable items={audit.data.items} showOrganisation={false} />}
              </LoadState>
            </Card>
          </>
        )}
      </LoadState>

      <Dialog open={Boolean(action)} onClose={busy ? undefined : () => setAction(null)} maxWidth="sm" fullWidth>
        {config && (
          <Box component="form" onSubmit={submit} noValidate>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                {config.text && <DialogContentText>{config.text}</DialogContentText>}
                {formError && <Alert severity="error">{formError}</Alert>}
                {config.field && (
                  <TextField
                    label={config.field}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    multiline={action === 'suspend'}
                    minRows={action === 'suspend' ? 2 : undefined}
                    required
                    autoFocus
                    sx={{ mt: 1 }}
                  />
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAction(null)} disabled={busy}>Cancel</Button>
              <Button
                type="submit"
                variant="contained"
                color={config.danger ? 'error' : 'primary'}
                disabled={busy || (config.field && value.trim().length < (action === 'suspend' ? 3 : 2))}
              >
                {config.button}
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>
    </>
  );
}

export default PlatformOrganisationPage;
