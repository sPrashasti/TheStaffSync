import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Stack,
  TextField,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import PageHeader from '../../components/PageHeader';
import { useSnackbar } from '../../hooks/useSnackbar';
import { updateMyOrganisation } from '../../services/organisationService';
import { organisationUpdated, selectOrganisation } from '../../store/authSlice';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ALL_TIME_ZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Asia/Kolkata', 'Europe/London', 'UTC'];

// HR only: the company name and the defaults that decide attendance and leave dates for
// everyone in the organisation (employees can still have their own time zone, set by HR).
function OrganisationSettingsPage() {
  const dispatch = useDispatch();
  const toast = useSnackbar();
  const organisation = useSelector(selectOrganisation);
  const [form, setForm] = useState(() => ({
    name: organisation.name,
    timeZone: organisation.settings.timeZone,
    workingDays: organisation.settings.workingDays,
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const timeZones = useMemo(
    () => (ALL_TIME_ZONES.includes(form.timeZone) ? ALL_TIME_ZONES : [form.timeZone, ...ALL_TIME_ZONES]),
    [form.timeZone]
  );

  const toggleDay = (day) => setForm((f) => ({
    ...f,
    // Kept in calendar order whatever order they are ticked in.
    workingDays: f.workingDays.includes(day) ? f.workingDays.filter((d) => d !== day) : DAYS.filter((d) => d === day || f.workingDays.includes(d)),
  }));

  const clientErrors = {
    name: form.name.trim().length >= 2 ? '' : 'Company name is required',
    workingDays: form.workingDays.length > 0 ? '' : 'Choose at least one working day',
  };
  const valid = Object.values(clientErrors).every((m) => !m);

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setFormError('');
    try {
      const saved = await updateMyOrganisation({
        name: form.name.trim(),
        settings: { timeZone: form.timeZone, workingDays: form.workingDays },
      });
      dispatch(organisationUpdated(saved));
      setErrors({});
      toast.success('Company settings saved');
    } catch (err) {
      setFormError(err.message);
      setErrors(err.fieldErrors || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Company settings" subtitle="Your organisation's name and working week. Only HR can change these." />
      <Card sx={{ maxWidth: 640 }}>
        <CardContent>
          <Stack component="form" spacing={3} onSubmit={save} noValidate>
            {organisation.isDemo && <Alert severity="info">Company settings are read-only in the demo.</Alert>}
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Company name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={Boolean(errors.name || clientErrors.name)}
              helperText={errors.name || clientErrors.name}
              required
            />
            <Autocomplete
              options={timeZones}
              value={form.timeZone}
              onChange={(e, value) => value && setForm({ ...form, timeZone: value })}
              disableClearable
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Company time zone"
                  error={Boolean(errors['settings.timeZone'])}
                  helperText={errors['settings.timeZone'] || 'Decides "today" for attendance and leave, unless an employee has their own time zone.'}
                />
              )}
            />
            <Stack spacing={0.5}>
              <FormLabel component="legend" error={Boolean(clientErrors.workingDays)}>Working days</FormLabel>
              <FormGroup row>
                {DAYS.map((day) => (
                  <FormControlLabel
                    key={day}
                    label={day}
                    control={<Checkbox checked={form.workingDays.includes(day)} onChange={() => toggleDay(day)} />}
                  />
                ))}
              </FormGroup>
              <FormHelperText error={Boolean(clientErrors.workingDays || errors['settings.workingDays'])}>
                {clientErrors.workingDays || errors['settings.workingDays'] || 'Used to count absences in reports.'}
              </FormHelperText>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <Button type="submit" variant="contained" disabled={busy || !valid || organisation.isDemo}>
                {busy ? 'Saving…' : 'Save settings'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}

export default OrganisationSettingsPage;
