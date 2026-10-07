import { useState } from 'react';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import LoadState from '../../components/LoadState';
import StatusChip from '../../components/StatusChip';
import { useApi } from '../../hooks/useApi';
import { useSnackbar } from '../../hooks/useSnackbar';
import { checkIn, checkOut, getToday } from '../../services/attendanceService';
import { selectDisplayTimeZone } from '../../store/preferencesSlice';
import { formatDay, formatHours, formatTime, timeZoneLabel } from '../../utils/format';

// Today's attendance with the check-in / check-out button. onChange runs after either action,
// so a dashboard can refresh its numbers.
function TodayCard({ onChange }) {
  const toast = useSnackbar();
  const displayTimeZone = useSelector(selectDisplayTimeZone);
  const { data, loading, error, reload } = useApi(getToday);
  const [busy, setBusy] = useState(false);

  const act = async (action, message) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      reload();
      onChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const record = data?.record;
  const status = !record ? 'not-checked-in' : record.checkOut ? 'checked-out' : 'checked-in';

  return (
    <Card variant="outlined">
      <CardContent>
        <LoadState loading={loading} error={error} data={data} onRetry={reload}>
          {data && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
              <div>
                <Typography variant="overline" color="text.secondary">Today</Typography>
                <Typography variant="h6" fontWeight={700}>{formatDay(data.date)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Your working day follows {data.timeZone}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <StatusChip status={status} />
                  {record && (
                    <Typography variant="body2">
                      In {formatTime(record.checkIn, displayTimeZone)}
                      {record.checkOut && ` · Out ${formatTime(record.checkOut, displayTimeZone)} · ${formatHours(record.workingHours)}`}
                      {' '}({timeZoneLabel(displayTimeZone)})
                    </Typography>
                  )}
                </Stack>
              </div>
              {!record && (
                <Button variant="premium" size="large" disabled={busy} onClick={() => act(checkIn, 'Checked in')}>
                  Check in
                </Button>
              )}
              {record && !record.checkOut && (
                <Button variant="contained" color="secondary" size="large" disabled={busy} onClick={() => act(checkOut, 'Checked out')}>
                  Check out
                </Button>
              )}
            </Stack>
          )}
        </LoadState>
      </CardContent>
    </Card>
  );
}

export default TodayCard;
