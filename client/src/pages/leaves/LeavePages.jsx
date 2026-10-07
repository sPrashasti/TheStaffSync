import { useState } from 'react';
import { Button, Tab, Tabs } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { ApplyLeaveDialog } from './LeaveDialogs';
import LeaveTable from './LeaveTable';

// Own requests with the Apply button. Used by employees, and as a tab for managers.
function MyLeave({ withHeader = true }) {
  const [applying, setApplying] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const apply = <Button variant="premium" onClick={() => setApplying(true)}>Apply for leave</Button>;
  return (
    <>
      {withHeader ? <PageHeader title="Leave" subtitle="Your requests and their status" actions={apply} /> : <div style={{ marginBottom: 16 }}>{apply}</div>}
      <LeaveTable scope="my" refreshKey={refreshKey} />
      <ApplyLeaveDialog open={applying} onClose={() => setApplying(false)} onApplied={() => setRefreshKey((k) => k + 1)} />
    </>
  );
}

export function MyLeavesPage() {
  return <MyLeave />;
}

// Managers: the team's requests to decide (pending first), and their own leave.
export function ManagerLeavesPage() {
  const [tab, setTab] = useState(0);
  return (
    <>
      <PageHeader title="Leave" subtitle="Approve your team's requests and manage your own" />
      <Tabs value={tab} onChange={(_, t) => setTab(t)} sx={{ mb: 2 }}>
        <Tab label="Team requests" />
        <Tab label="My leave" />
      </Tabs>
      {tab === 0 ? <LeaveTable scope="team" defaultStatus="pending" /> : <MyLeave withHeader={false} />}
    </>
  );
}

// HR: every request in the company, pending first.
export function AllLeavesPage() {
  return (
    <>
      <PageHeader title="Leave" subtitle="All leave requests across the company" />
      <LeaveTable scope="all" defaultStatus="pending" />
    </>
  );
}
