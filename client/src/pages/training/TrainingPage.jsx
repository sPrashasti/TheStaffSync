import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useSelector } from 'react-redux';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import Pager from '../../components/Pager';
import StatusChip from '../../components/StatusChip';
import { useApi } from '../../hooks/useApi';
import { useSnackbar } from '../../hooks/useSnackbar';
import {
  createTraining,
  deleteTraining,
  enrollInTraining,
  listTrainings,
  updateTraining,
  withdrawFromTraining,
} from '../../services/trainingService';
import { selectUser } from '../../store/authSlice';
import { formatDayRange } from '../../utils/format';

const EMPTY = { title: '', description: '', trainer: '', startDate: '', endDate: '', capacity: 20 };
const TABS = [
  { label: 'Upcoming', params: { status: 'upcoming' } },
  { label: 'Running now', params: { status: 'ongoing' } },
  { label: 'My trainings', params: { enrolled: 'true' }, enrolOnly: true },
  { label: 'Completed', params: { status: 'completed' } },
];

function TrainingDialog({ open, training, onClose, onSaved }) {
  const toast = useSnackbar();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null);

  const key = open ? training?._id || 'new' : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    setForm(training
      ? { title: training.title, description: training.description || '', trainer: training.trainer, startDate: training.startDate.slice(0, 10), endDate: training.endDate.slice(0, 10), capacity: training.capacity }
      : EMPTY);
    setErrors({});
    setError('');
  }

  const set = (field) => (e) => {
    const next = { ...form, [field]: e.target.value };
    if (field === 'startDate' && (!form.endDate || form.endDate < e.target.value)) next.endDate = e.target.value;
    setForm(next);
    setErrors({ ...errors, [field]: undefined });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = { ...form, title: form.title.trim(), trainer: form.trainer.trim(), description: form.description.trim() || null, capacity: Number(form.capacity) };
    if (!training && body.description === null) delete body.description;
    try {
      if (training) await updateTraining(training._id, body);
      else await createTraining(body);
      toast.success(training ? 'Training updated' : 'Training created');
      onSaved();
      onClose();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setError(Object.keys(err.fieldErrors || {}).length ? '' : err.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, props = {}) => (
    <TextField label={label} value={form[name]} onChange={set(name)} error={Boolean(errors[name])} helperText={errors[name] || props.helperText} fullWidth {...props} />
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>{training ? 'Edit training' : 'New training'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {training && training.enrolledCount > 0 && (
              <Alert severity="info">{training.enrolledCount} enrolled people will be notified if you change the title, trainer or dates.</Alert>
            )}
            {field('title', 'Title', { required: true })}
            {field('trainer', 'Trainer', { required: true })}
            {field('description', 'Description', { multiline: true, minRows: 3 })}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {field('startDate', 'Starts', { type: 'date', required: true, slotProps: { inputLabel: { shrink: true } } })}
              {field('endDate', 'Ends', { type: 'date', required: true, slotProps: { inputLabel: { shrink: true }, htmlInput: { min: form.startDate || undefined } } })}
              {field('capacity', 'Seats', { type: 'number', required: true, slotProps: { htmlInput: { min: 1, max: 1000 } } })}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{training ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ParticipantsDialog({ training, onClose }) {
  return (
    <Dialog open={Boolean(training)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Enrolled ({training?.participants?.length || 0})</DialogTitle>
      <DialogContent dividers>
        {training?.participants?.length ? (
          <List dense>
            {training.participants.map((p) => (
              <ListItem key={p._id}>
                <ListItemText primary={p.userId?.name} secondary={`${p.employeeId} · ${p.department}`} />
              </ListItem>
            ))}
          </List>
        ) : <Typography color="text.secondary">No one has enrolled yet.</Typography>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

// Everyone browses; employees and managers enrol; HR and managers run trainings
// (managers only their own).
function TrainingPage() {
  const toast = useSnackbar();
  const user = useSelector(selectUser);
  const canEnrol = user.role !== 'hr';
  const canCreate = user.role !== 'employee';
  const tabs = TABS.filter((t) => canEnrol || !t.enrolOnly);
  const [tab, setTab] = useState(0);
  const [paging, setPaging] = useState({ page: 1, limit: 10 });
  const { data, loading, error, reload } = useApi(() => listTrainings({ ...tabs[tab].params, ...paging }), [tab, paging]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const canManage = (t) => user.role === 'hr' || t.createdBy?._id === user._id;

  const act = async (t, action, message) => {
    setBusyId(t._id);
    try {
      await action(t._id);
      toast.success(message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
      reload();
    }
  };

  const remove = async () => {
    await act(deleting, deleteTraining, 'Training deleted');
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Training"
        subtitle={canEnrol ? 'Find a course and save your seat' : 'Plan and track company training'}
        actions={canCreate && <Button variant="contained" onClick={() => setCreating(true)}>New training</Button>}
      />
      <Tabs value={tab} onChange={(_, t) => { setTab(t); setPaging({ page: 1, limit: 10 }); }} variant="scrollable" sx={{ mb: 2 }}>
        {tabs.map((t) => <Tab key={t.label} label={t.label} />)}
      </Tabs>
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        {data?.items.length === 0 && <Alert severity="info">No trainings here.</Alert>}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' } }}>
          {data?.items.map((t) => {
            const notStarted = t.status === 'upcoming';
            return (
              <Card key={t._id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography variant="h6" fontWeight={700}>{t.title}</Typography>
                    <StatusChip status={t.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {formatDayRange(t.startDate, t.endDate)} · {t.trainer}
                  </Typography>
                  {t.description && <Typography variant="body2" sx={{ mt: 1 }}>{t.description}</Typography>}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t.enrolledCount} of {t.capacity} seats taken{t.seatsLeft === 0 ? ' · full' : ''}
                    </Typography>
                    <LinearProgress variant="determinate" value={Math.min(100, (t.enrolledCount / t.capacity) * 100)} sx={{ mt: 0.5 }} />
                  </Box>
                  {t.isEnrolled && <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>You are enrolled</Typography>}
                </CardContent>
                <CardActions sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {canEnrol && t.enrolmentOpen && (t.isEnrolled ? (
                    <Button size="small" disabled={busyId === t._id} onClick={() => act(t, withdrawFromTraining, 'You have withdrawn')}>Withdraw</Button>
                  ) : (
                    <Button size="small" variant="contained" disabled={busyId === t._id || t.seatsLeft === 0} onClick={() => act(t, enrollInTraining, 'Enrolled')}>
                      {t.seatsLeft === 0 ? 'Full' : 'Enrol'}
                    </Button>
                  ))}
                  {canManage(t) && (
                    <>
                      <Button size="small" onClick={() => setViewing(t)}>Participants</Button>
                      {t.status !== 'completed' && <Button size="small" onClick={() => setEditing(t)}>Edit</Button>}
                      {notStarted && <Button size="small" color="error" onClick={() => setDeleting(t)}>Delete</Button>}
                    </>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Box>
        <Pager data={data} onChange={setPaging} />
      </LoadState>

      {canCreate && (
        <TrainingDialog
          open={creating || Boolean(editing)}
          training={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={reload}
        />
      )}
      <ParticipantsDialog training={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete training?"
        message={deleting ? `"${deleting.title}" will be cancelled and its ${deleting.enrolledCount} enrolled people notified.` : ''}
        confirmLabel="Delete"
        danger
        busy={Boolean(busyId)}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

export default TrainingPage;
