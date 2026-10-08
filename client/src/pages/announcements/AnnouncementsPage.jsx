import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSelector } from 'react-redux';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import Pager from '../../components/Pager';
import { useApi } from '../../hooks/useApi';
import { useSnackbar } from '../../hooks/useSnackbar';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from '../../services/announcementService';
import { selectUser } from '../../store/authSlice';
import { selectDisplayTimeZone } from '../../store/preferencesSlice';
import { formatDateTime } from '../../utils/format';
import { AUDIENCES, audienceLabel } from '../../utils/labels';

const EMPTY = { title: '', content: '', targetAudience: 'all' };

function AnnouncementDialog({ open, announcement, onClose, onSaved }) {
  const toast = useSnackbar();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null);

  // Fill the form each time the dialog opens for a different announcement.
  const key = open ? announcement?._id || 'new' : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    setForm(announcement ? { title: announcement.title, content: announcement.content, targetAudience: announcement.targetAudience } : EMPTY);
    setErrors({});
    setError('');
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (announcement) await updateAnnouncement(announcement._id, form);
      else await createAnnouncement(form);
      toast.success(announcement ? 'Announcement updated' : 'Announcement published');
      onSaved();
      onClose();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setError(Object.keys(err.fieldErrors || {}).length ? '' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>{announcement ? 'Edit announcement' : 'New announcement'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Title" value={form.title} onChange={set('title')} error={Boolean(errors.title)} helperText={errors.title} required slotProps={{ htmlInput: { maxLength: 150 } }} />
            <TextField label="Message" value={form.content} onChange={set('content')} error={Boolean(errors.content)} helperText={errors.content || `${form.content.length}/5000`} multiline minRows={5} required slotProps={{ htmlInput: { maxLength: 5000 } }} />
            <TextField select label="Who should see it" value={form.targetAudience} onChange={set('targetAudience')} helperText="Everyone in this group is notified when you publish">
              {AUDIENCES.map((a) => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || !form.title.trim() || !form.content.trim()}>
            {announcement ? 'Save' : 'Publish'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Everyone reads the announcements meant for them. HR and managers post; HR may edit or delete
// any post, a manager only their own.
function AnnouncementsPage() {
  const toast = useSnackbar();
  const user = useSelector(selectUser);
  const displayTimeZone = useSelector(selectDisplayTimeZone);
  const isHr = user.role === 'hr';
  const canPost = user.role !== 'employee';
  const canEdit = (a) => isHr || a.createdBy?._id === user._id;
  const [paging, setPaging] = useState({ page: 1, limit: 10 });
  const { data, loading, error, reload } = useApi(() => listAnnouncements(paging), [paging]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await deleteAnnouncement(deleting._id);
      toast.success('Announcement deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Announcements"
        subtitle={canPost ? 'Publish news to everyone, employees or managers' : 'News from HR and your managers'}
        actions={canPost && <Button variant="premium" onClick={() => setCreating(true)}>New announcement</Button>}
      />
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        <Stack spacing={2}>
          {data?.items.length === 0 && <Alert severity="info">No announcements yet.</Alert>}
          {data?.items.map((a) => (
            <Card key={a._id} variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{a.title}</Typography>
                  {canPost && <Chip size="small" label={audienceLabel(a.targetAudience)} />}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {a.createdBy?.name || 'HR'} · {formatDateTime(a.createdAt, displayTimeZone)}
                  {a.updatedAt !== a.createdAt && ' · edited'}
                </Typography>
                <Typography sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>{a.content}</Typography>
              </CardContent>
              {canEdit(a) && (
                <CardActions>
                  <Button size="small" onClick={() => setEditing(a)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => setDeleting(a)}>Delete</Button>
                </CardActions>
              )}
            </Card>
          ))}
          <Pager data={data} onChange={setPaging} />
        </Stack>
      </LoadState>

      {canPost && (
        <>
          <AnnouncementDialog
            open={creating || Boolean(editing)}
            announcement={editing}
            onClose={() => { setCreating(false); setEditing(null); }}
            onSaved={reload}
          />
          <ConfirmDialog
            open={Boolean(deleting)}
            title="Delete announcement?"
            message={deleting ? `"${deleting.title}" will be removed for everyone, along with its notifications.` : ''}
            confirmLabel="Delete"
            danger
            busy={busy}
            onConfirm={remove}
            onClose={() => setDeleting(null)}
          />
        </>
      )}
    </>
  );
}

export default AnnouncementsPage;
