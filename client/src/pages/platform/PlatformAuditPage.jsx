import { useState } from 'react';
import { Card, MenuItem, TextField } from '@mui/material';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import Pager from '../../components/Pager';
import { useApi } from '../../hooks/useApi';
import { listAudit } from '../../services/platformService';
import AuditTable from './AuditTable';
import { AUDIT_ACTIONS } from './auditLabels';

// Every change made through the platform console. Append-only: entries cannot be edited or removed.
function PlatformAuditPage() {
  const [filters, setFilters] = useState({ action: '', page: 1, limit: 25 });
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
  const { data, loading, error, reload } = useApi(() => listAudit(params), [params]);

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every change platform admins have made. Entries cannot be edited or removed." />
      <TextField
        select
        label="Action"
        size="small"
        value={filters.action}
        onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
        // Show "All" rather than an empty box when no filter is chosen.
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        sx={{ minWidth: 260, mb: 2 }}
      >
        <MenuItem value="">All actions</MenuItem>
        {Object.entries(AUDIT_ACTIONS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        {data && (
          <Card variant="outlined">
            <AuditTable items={data.items} />
            <Pager data={data} onChange={(p) => setFilters({ ...filters, ...p })} rowsPerPageOptions={[25, 50, 100]} />
          </Card>
        )}
      </LoadState>
    </>
  );
}

export default PlatformAuditPage;
