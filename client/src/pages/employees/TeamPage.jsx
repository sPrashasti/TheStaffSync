import { Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import TableMessage from '../../components/TableMessage';
import { useApi } from '../../hooks/useApi';
import { getMyTeam } from '../../services/employeeService';
import { formatDay } from '../../utils/format';

// Manager: their direct reports.
function TeamPage() {
  const { data, loading, error, reload } = useApi(getMyTeam);
  return (
    <>
      <PageHeader title="My team" subtitle="People who report to you" />
      <Card variant="outlined">
        <LoadState loading={loading} error={error} data={data} onRetry={reload}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Designation</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.length === 0 && <TableMessage colSpan={7}>No one reports to you yet. HR assigns team members.</TableMessage>}
                {data?.map((e) => (
                  <TableRow key={e._id} hover>
                    <TableCell>{e.employeeId}</TableCell>
                    <TableCell>{e.userId.name}<br /><small>{e.userId.email}</small></TableCell>
                    <TableCell>{e.designation}</TableCell>
                    <TableCell>{e.department}</TableCell>
                    <TableCell>{e.phone || '—'}</TableCell>
                    <TableCell>{formatDay(e.joiningDate)}</TableCell>
                    <TableCell><StatusChip status={e.userId.isActive ? 'active' : 'inactive'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </LoadState>
      </Card>
    </>
  );
}

export default TeamPage;
