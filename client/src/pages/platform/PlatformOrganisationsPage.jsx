import { useEffect, useState } from 'react';
import {
  Card,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import Pager from '../../components/Pager';
import StatusChip from '../../components/StatusChip';
import TableMessage from '../../components/TableMessage';
import { useApi } from '../../hooks/useApi';
import { listOrganisations } from '../../services/platformService';
import { formatDay } from '../../utils/format';

// Every customer organisation, searchable by name and filterable by status.
function PlatformOrganisationsPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ q: '', status: '', page: 1, limit: 25 });

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim(), page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
  const { data, loading, error, reload } = useApi(() => listOrganisations(params), [params]);

  return (
    <>
      <PageHeader title="Organisations" subtitle="Companies using StaffSync. Open one to see its usage, rename, suspend or reactivate it." />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 260 }} />
        <TextField
          select
          label="Status"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          size="small"
          // Show "All" rather than an empty box when no filter is chosen.
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="suspended">Suspended</MenuItem>
        </TextField>
      </Stack>
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        {data && (
          <Card variant="outlined">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Organisation</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Users</TableCell>
                    <TableCell align="right">Active users</TableCell>
                    <TableCell>Signed up</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.length === 0 && <TableMessage colSpan={5}>No organisations match.</TableMessage>}
                  {data.items.map((o) => (
                    <TableRow key={o._id} hover>
                      <TableCell>
                        <Link component={RouterLink} to={`/platform/organisations/${o._id}`} sx={{ fontWeight: 600 }}>{o.name}</Link>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {o.slug}{o.isDemo ? ' · public demo' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell><StatusChip status={o.status} /></TableCell>
                      <TableCell align="right">{o.users}</TableCell>
                      <TableCell align="right">{o.activeUsers}</TableCell>
                      <TableCell>{formatDay(o.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Pager data={data} onChange={(p) => setFilters({ ...filters, ...p })} rowsPerPageOptions={[25, 50, 100]} />
          </Card>
        )}
      </LoadState>
    </>
  );
}

export default PlatformOrganisationsPage;
