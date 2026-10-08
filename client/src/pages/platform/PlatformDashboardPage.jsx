import { Card, CardContent, Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BlockIcon from '@mui/icons-material/Block';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import GroupsIcon from '@mui/icons-material/Groups';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import StatCard, { StatGrid } from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import { useApi } from '../../hooks/useApi';
import { getStats } from '../../services/platformService';
import { selectDisplayTimeZone } from '../../store/preferencesSlice';
import { formatDateTime, formatDay } from '../../utils/format';

// The whole platform at a glance: organisations, users and the newest sign-ups.
function PlatformDashboardPage() {
  const { data, loading, error, reload } = useApi(getStats);
  const timeZone = useSelector(selectDisplayTimeZone);

  return (
    <>
      <PageHeader title="Overview" subtitle="Every organisation using StaffSync." />
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        {data && (
          <Stack spacing={3}>
            <StatGrid min={200}>
              <StatCard label="Organisations" value={data.organisations.total} hint={`${data.organisations.active} active`} icon={ApartmentIcon} />
              <StatCard label="Suspended" value={data.organisations.suspended} icon={BlockIcon} accent="burgundy" />
              <StatCard label="New in the last 30 days" value={data.organisations.newLast30Days} icon={FiberNewIcon} accent="sage" />
              <StatCard label="User accounts" value={data.users.total} hint={`${data.users.active} active`} icon={GroupsIcon} accent="ice" />
            </StatGrid>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>Newest organisations</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Organisation</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Users</TableCell>
                      <TableCell>Signed up</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentOrganisations.map((o) => (
                      <TableRow key={o._id} hover>
                        <TableCell>
                          <Link component={RouterLink} to={`/platform/organisations/${o._id}`}>{o.name}</Link>
                          {o.isDemo && <Typography component="span" variant="caption" color="text.secondary"> · public demo</Typography>}
                        </TableCell>
                        <TableCell><StatusChip status={o.status} /></TableCell>
                        <TableCell align="right">{o.users}</TableCell>
                        <TableCell>{formatDay(o.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {data.demo && (
              <Typography variant="body2" color="text.secondary">
                Public demo: {data.demo.name}, last reset {formatDateTime(data.demo.lastResetAt, timeZone)}.
              </Typography>
            )}
          </Stack>
        )}
      </LoadState>
    </>
  );
}

export default PlatformDashboardPage;
