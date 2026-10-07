import { Box, Button, Card, CardContent, CardHeader, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StatCard, { StatGrid } from '../../components/StatCard';
import { useApi } from '../../hooks/useApi';
import { listAnnouncements } from '../../services/announcementService';
import { selectUser } from '../../store/authSlice';
import { formatDay, formatDayRange, formatHours } from '../../utils/format';
import { leaveTypeLabel } from '../../utils/labels';

// A titled card with a list, used for "upcoming leave", "my trainings" and similar.
export function ListCard({ title, action, items, empty, render }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardHeader title={title} slotProps={{ title: { variant: 'subtitle1', fontWeight: 700 } }} action={action} />
      <Divider />
      {items.length === 0 ? (
        <CardContent><Typography color="text.secondary">{empty}</Typography></CardContent>
      ) : (
        <List dense>{items.map(render)}</List>
      )}
    </Card>
  );
}

// Two or three cards side by side on wide screens, stacked on phones.
export function CardRow({ children }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))' }, mb: 3 }}>
      {children}
    </Box>
  );
}

// Month-to-date attendance, leave and trainings for one person (employee dashboard and a
// manager's own section).
export function PersonalSummary({ summary }) {
  const user = useSelector(selectUser);
  const { thisMonth, leave, trainings } = summary;
  return (
    <>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        This month ({formatDay(thisMonth.from)} – {formatDay(thisMonth.to)})
      </Typography>
      <StatGrid>
        <StatCard label="Days present" value={thisMonth.present} icon={HowToRegIcon} accent="sage" />
        <StatCard label="Half days" value={thisMonth.halfDay} icon={AccessTimeIcon} accent="champagne" />
        <StatCard label="Absent" value={thisMonth.absent} color={thisMonth.absent ? 'error.main' : undefined} hint="Working days up to yesterday" icon={EventBusyIcon} accent="burgundy" />
        <StatCard label="On leave" value={thisMonth.onLeave} icon={BeachAccessIcon} accent="champagne" />
        <StatCard label="Hours worked" value={formatHours(thisMonth.totalHours)} icon={ScheduleIcon} accent="sapphire" />
      </StatGrid>
      <CardRow>
        <ListCard
          title={`Leave · ${leave.pending} pending · ${leave.approvedDaysThisYear} days taken this year`}
          action={<Button component={RouterLink} to={`/${user.role}/leaves`}>Open</Button>}
          items={leave.upcoming}
          empty="No upcoming approved leave."
          render={(l) => (
            <ListItem key={l._id}>
              <ListItemText primary={`${leaveTypeLabel(l.leaveType)} leave`} secondary={`${formatDayRange(l.startDate, l.endDate)} · ${l.days} day(s)`} />
            </ListItem>
          )}
        />
        <ListCard
          title="My trainings"
          action={<Button component={RouterLink} to={`/${user.role}/training`}>Browse</Button>}
          items={trainings.enrolled}
          empty="You are not enrolled in any upcoming training."
          render={(t) => (
            <ListItem key={t._id}>
              <ListItemText primary={t.title} secondary={`${formatDayRange(t.startDate, t.endDate)} · ${t.trainer}`} />
            </ListItem>
          )}
        />
      </CardRow>
    </>
  );
}

// The three most recent announcements for this user.
export function LatestAnnouncements() {
  const user = useSelector(selectUser);
  const { data } = useApi(() => listAnnouncements({ limit: 3 }));
  return (
    <ListCard
      title="Latest announcements"
      action={<Button component={RouterLink} to={`/${user.role}/announcements`}>All</Button>}
      items={data?.items || []}
      empty="No announcements yet."
      render={(a) => (
        <ListItem key={a._id}>
          <ListItemText primary={a.title} secondary={`${formatDay(a.createdAt)} · ${a.createdBy?.name || 'HR'}`} />
        </ListItem>
      )}
    />
  );
}
