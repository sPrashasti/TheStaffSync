import { useState } from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { useSelector } from 'react-redux';
import { useApi } from '../../hooks/useApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSnackbar } from '../../hooks/useSnackbar';
import { getMyTeam, listEmployees } from '../../services/employeeService';
import { assignToTraining, removeFromTraining } from '../../services/trainingService';
import { selectAuth } from '../../store/authSlice';

// Who is enrolled, with Assign and Remove for HR (anyone) and managers (their own team).
// `training` is the API's view for this user: HR and the creator see everyone, another manager
// only their team. onChange receives the updated training after each change.
function ParticipantsDialog({ training, scope, onClose, onChange }) {
  const toast = useSnackbar();
  const { user, employee: me } = useSelector(selectAuth);
  const isHr = user.role === 'hr';
  const canAssign = user.role !== 'employee' && Boolean(training?.enrolmentOpen);
  const [department, setDepartment] = useState('');
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const open = Boolean(training);

  // Candidates: HR picks from active employees (narrowed by department); a manager from their team.
  const query = useDebouncedValue(department.trim());
  const people = useApi(
    () => {
      if (!open || !canAssign) return Promise.resolve([]);
      if (isHr) return listEmployees({ isActive: 'true', limit: 100, ...(query && { department: query }) }).then((p) => p.items);
      return getMyTeam().then((team) => team.filter((e) => e.userId.isActive));
    },
    [open, canAssign, isHr, query],
  );
  const enrolledIds = new Set((training?.participants || []).map((p) => p._id));
  const candidates = (people.data || []).filter((e) => !enrolledIds.has(e._id));
  const canRemove = (p) => isHr || (me && p.managerId === me._id);

  const run = async (action, message) => {
    setBusy(true);
    try {
      const updated = await action();
      toast.success(message);
      setChoice(null);
      onChange(updated);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {scope === 'team' ? 'Your team on this training' : 'Enrolled'} ({training?.participants?.length || 0}
        {scope === 'all' && training ? ` of ${training.capacity}` : ''})
      </DialogTitle>
      <DialogContent dividers>
        {training?.participants?.length ? (
          <List dense disablePadding>
            {training.participants.map((p) => (
              <ListItem
                key={p._id}
                secondaryAction={canAssign && canRemove(p) && (
                  <Tooltip title="Remove from training">
                    <IconButton edge="end" size="small" aria-label={`Remove ${p.userId?.name}`} disabled={busy} onClick={() => run(() => removeFromTraining(training._id, p._id), `${p.userId?.name} removed`)}>
                      <PersonOffIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              >
                <ListItemText primary={p.userId?.name} secondary={`${p.employeeId} · ${p.department}`} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">
            {scope === 'team' ? 'No one from your team is enrolled yet.' : 'No one has enrolled yet.'}
          </Typography>
        )}

        {canAssign && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {isHr ? 'Assign an employee' : 'Assign someone from your team'}
            </Typography>
            <Stack spacing={1.5}>
              {isHr && <TextField size="small" label="Filter by department" value={department} onChange={(e) => setDepartment(e.target.value)} />}
              <Autocomplete
                size="small"
                options={candidates}
                value={choice}
                onChange={(_, value) => setChoice(value)}
                loading={people.loading}
                getOptionLabel={(e) => `${e.userId.name} (${e.employeeId}, ${e.department})`}
                isOptionEqualToValue={(a, b) => a._id === b._id}
                noOptionsText={people.data ? 'No one left to assign' : 'Loading…'}
                renderInput={(params) => <TextField {...params} label="Person" />}
              />
              <Button
                variant="contained"
                disabled={!choice || busy || training.seatsLeft === 0}
                onClick={() => run(() => assignToTraining(training._id, choice._id), `${choice.userId.name} enrolled`)}
              >
                {training?.seatsLeft === 0 ? 'Training is full' : 'Assign'}
              </Button>
            </Stack>
          </>
        )}
        {training && !training.enrolmentOpen && user.role !== 'employee' && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Enrolment closed when the training started.
          </Typography>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={busy}>Close</Button></DialogActions>
    </Dialog>
  );
}

export default ParticipantsDialog;
