import {
  Button,
  Card,
  CardHeader,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import LoadState from '../../components/LoadState';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import GroupsIcon from '@mui/icons-material/Groups';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import SchoolIcon from '@mui/icons-material/School';
import GreetingBanner from '../../components/GreetingBanner';
import StatCard, { StatGrid } from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import TableMessage from '../../components/TableMessage';
import { useApi } from '../../hooks/useApi';
import { getEmployeeDashboard, getHrDashboard, getManagerDashboard } from '../../services/dashboardService';
import { selectUser } from '../../store/authSlice';
import { selectDisplayTimeZone } from '../../store/preferencesSlice';
import { formatDay, formatDayRange, formatTime } from '../../utils/format';
import { leaveTypeLabel } from '../../utils/labels';
import TodayCard from '../attendance/TodayCard';
import { CardRow, LatestAnnouncements, PersonalSummary } from './DashboardParts';

export function EmployeeDashboard() {
  const user = useSelector(selectUser);
  const { data, loading, error, reload } = useApi(getEmployeeDashboard);
  return (
    <>
      <GreetingBanner name={user.name} subtitle="Here's your day at a glance." />
      <Stack spacing={3}>
        <TodayCard onChange={reload} />
        <LoadState loading={loading} error={error} data={data} onRetry={reload}>
          {data && <PersonalSummary summary={data} />}
        </LoadState>
        <LatestAnnouncements />
      </Stack>
    </>
  );
}

export function ManagerDashboard() {
  const user = useSelector(selectUser);
  const displayTimeZone = useSelector(selectDisplayTimeZone);
  const { data, loading, error, reload } = useApi(getManagerDashboard);

  return (
    <>
      <GreetingBanner name={user.name} subtitle="Here's what's happening with your team today." />
      <Stack spacing={3}>
        <TodayCard onChange={reload} />
        <LoadState loading={loading} error={error} data={data} onRetry={reload}>
          {data && (
            <>
              <StatGrid>
                <StatCard label="Team size" value={data.team.size} icon={GroupsIcon} accent="sapphire" />
                <StatCard label="Checked in" value={data.team.today.checkedIn} icon={HowToRegIcon} accent="sage" />
                <StatCard label="On leave" value={data.team.today.onLeave} icon={BeachAccessIcon} accent="champagne" />
                <StatCard label="Not checked in" value={data.team.today.notCheckedIn} icon={AccessTimeIcon} accent="olive" />
                <StatCard label="Leave to review" value={data.pendingLeave.count} color={data.pendingLeave.count ? 'warning.main' : undefined} icon={PendingActionsIcon} accent="champagne" />
              </StatGrid>

              <CardRow>
                <Card variant="outlined">
                  <CardHeader title="Team today" slotProps={{ title: { variant: 'subtitle1', fontWeight: 700 } }} action={<Button component={RouterLink} to="/manager/team">Team</Button>} />
                  <Divider />
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow><TableCell>Name</TableCell><TableCell>Status</TableCell><TableCell>In</TableCell><TableCell>Out</TableCell></TableRow>
                      </TableHead>
                      <TableBody>
                        {data.team.members.length === 0 && <TableMessage colSpan={4}>No one reports to you yet.</TableMessage>}
                        {data.team.members.map((m) => (
                          <TableRow key={m.employee._id}>
                            <TableCell>{m.employee.name}</TableCell>
                            <TableCell><StatusChip status={m.status} /></TableCell>
                            <TableCell>{formatTime(m.checkIn, displayTimeZone)}</TableCell>
                            <TableCell>{formatTime(m.checkOut, displayTimeZone)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>

                <Card variant="outlined">
                  <CardHeader title="Waiting longest for a decision" slotProps={{ title: { variant: 'subtitle1', fontWeight: 700 } }} action={<Button component={RouterLink} to="/manager/leaves">Review</Button>} />
                  <Divider />
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {data.pendingLeave.oldest.length === 0 && <TableMessage colSpan={3}>Nothing to review.</TableMessage>}
                        {data.pendingLeave.oldest.map((l) => (
                          <TableRow key={l._id}>
                            <TableCell>{l.employeeId?.userId?.name}</TableCell>
                            <TableCell>{leaveTypeLabel(l.leaveType)}</TableCell>
                            <TableCell>{formatDayRange(l.startDate, l.endDate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </CardRow>

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>You</Typography>
              <PersonalSummary summary={data.me} />
            </>
          )}
        </LoadState>
        <LatestAnnouncements />
      </Stack>
    </>
  );
}

export function HrDashboard() {
  const user = useSelector(selectUser);
  const { data, loading, error, reload } = useApi(getHrDashboard);
  return (
    <>
      <GreetingBanner name={user.name} subtitle="Here's what's happening across the company today." />
      <Stack spacing={3}>
        <LoadState loading={loading} error={error} data={data} onRetry={reload}>
          {data && (
            <>
              <StatGrid>
                <StatCard label="Active people" value={data.headcount.active} hint={`${data.headcount.byRole.employee} employees · ${data.headcount.byRole.manager} managers · ${data.headcount.byRole.hr} HR`} icon={PeopleIcon} accent="sapphire" />
                <StatCard label="Departments" value={data.headcount.departments} icon={ApartmentIcon} accent="ice" />
                <StatCard label="Joined this month" value={data.headcount.joinedThisMonth} icon={PersonAddIcon} accent="sage" />
                <StatCard label="Deactivated" value={data.headcount.inactive} icon={PersonOffIcon} accent="olive" />
              </StatGrid>
              <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>Today · {formatDay(data.date)}</Typography>
              <StatGrid>
                <StatCard label="Checked in" value={data.today.checkedIn} icon={HowToRegIcon} accent="sage" />
                <StatCard label="On leave" value={data.today.onLeave} icon={BeachAccessIcon} accent="champagne" />
                <StatCard label="Not checked in" value={data.today.notCheckedIn} icon={AccessTimeIcon} accent="olive" />
                <StatCard label="Leave pending" value={data.leave.pending} hint={`${data.leave.approvedThisMonth} approved this month`} color={data.leave.pending ? 'warning.main' : undefined} icon={PendingActionsIcon} accent="champagne" />
                <StatCard label="Trainings" value={data.training.upcoming} hint={`upcoming · ${data.training.ongoing} running now`} icon={SchoolIcon} accent="ice" />
              </StatGrid>
              <Card variant="outlined">
                <CardHeader title="Recent joiners" slotProps={{ title: { variant: 'subtitle1', fontWeight: 700 } }} action={<Button component={RouterLink} to="/hr/employees">All employees</Button>} />
                <Divider />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow><TableCell>Name</TableCell><TableCell>ID</TableCell><TableCell>Department</TableCell><TableCell>Designation</TableCell><TableCell>Joined</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {data.recentJoiners.map((e) => (
                        <TableRow key={e._id}>
                          <TableCell>{e.userId?.name}</TableCell>
                          <TableCell>{e.employeeId}</TableCell>
                          <TableCell>{e.department}</TableCell>
                          <TableCell>{e.designation}</TableCell>
                          <TableCell>{formatDay(e.joiningDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </>
          )}
        </LoadState>
        <LatestAnnouncements />
      </Stack>
    </>
  );
}
