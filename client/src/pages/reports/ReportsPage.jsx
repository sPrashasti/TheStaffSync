import { useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  Divider,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import Pager from '../../components/Pager';
import StatCard, { StatGrid } from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import TableMessage from '../../components/TableMessage';
import { useApi } from '../../hooks/useApi';
import {
  getAttendanceSummary,
  getDepartmentStats,
  getLeaveSummary,
  getTrainingSummary,
} from '../../services/reportService';
import { formatDayRange, formatHours } from '../../utils/format';
import { leaveTypeLabel } from '../../utils/labels';

const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null));
const thisYear = new Date().getFullYear();
const YEARS = [thisYear + 1, thisYear, thisYear - 1, thisYear - 2];

function Section({ title, children }) {
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardHeader title={title} slotProps={{ title: { variant: 'subtitle1', fontWeight: 700 } }} />
      <Divider />
      <TableContainer>{children}</TableContainer>
    </Card>
  );
}

function SimpleTable({ columns, rows, empty = 'No data.' }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>{columns.map((c) => <TableCell key={c.key} align={c.align}>{c.label}</TableCell>)}</TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 && <TableMessage colSpan={columns.length}>{empty}</TableMessage>}
        {rows.map((row, i) => (
          <TableRow key={row.key || i} hover>
            {columns.map((c) => <TableCell key={c.key} align={c.align}>{c.render ? c.render(row) : row[c.key]}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const num = (key, label) => ({ key, label, align: 'right' });
const attendanceColumns = [
  num('present', 'Present'),
  num('halfDay', 'Half days'),
  num('absent', 'Absent'),
  num('onLeave', 'On leave'),
  { key: 'totalHours', label: 'Hours', align: 'right', render: (r) => formatHours(r.totalHours) },
];

function DepartmentsReport() {
  const { data, loading, error, reload } = useApi(getDepartmentStats);
  return (
    <LoadState loading={loading} error={error} data={data} onRetry={reload}>
      {data && (
        <>
          <StatGrid>
            <StatCard label="People" value={data.totals.total} />
            <StatCard label="Active" value={data.totals.active} color="success.main" />
            <StatCard label="Deactivated" value={data.totals.inactive} />
          </StatGrid>
          <Section title="By department">
            <SimpleTable
              rows={data.departments}
              columns={[
                { key: 'department', label: 'Department' },
                num('active', 'Active'), num('employees', 'Employees'), num('managers', 'Managers'), num('hr', 'HR'), num('inactive', 'Deactivated'),
              ]}
            />
          </Section>
        </>
      )}
    </LoadState>
  );
}

function AttendanceReport() {
  const [filters, setFilters] = useState({ from: '', to: '', department: '', page: 1, limit: 25 });
  const { data, loading, error, reload } = useApi(() => getAttendanceSummary(compact(filters)), [filters]);
  const set = (field) => (e) => setFilters({ ...filters, [field]: e.target.value, page: 1 });
  return (
    <>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="From" type="date" size="small" value={filters.from} onChange={set('from')} slotProps={{ inputLabel: { shrink: true } }} helperText="Default: 1st of this month" />
        <TextField label="To" type="date" size="small" value={filters.to} onChange={set('to')} slotProps={{ inputLabel: { shrink: true } }} helperText="Default: today" />
        <TextField label="Department" size="small" value={filters.department} onChange={set('department')} />
      </Stack>
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        {data && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {formatDayRange(data.from, data.to)} · working days {data.workingDays.join(', ')} · absences counted up to yesterday
            </Typography>
            <StatGrid>
              <StatCard label="People" value={data.totals.employees} />
              <StatCard label="Days present" value={data.totals.present} color="success.main" />
              <StatCard label="Half days" value={data.totals.halfDay} />
              <StatCard label="Absences" value={data.totals.absent} color={data.totals.absent ? 'error.main' : undefined} />
              <StatCard label="Days on leave" value={data.totals.onLeave} />
              <StatCard label="Average day" value={formatHours(data.totals.avgHoursPerDay)} />
            </StatGrid>
            <Section title="By department">
              <SimpleTable rows={data.byDepartment} columns={[{ key: 'department', label: 'Department' }, num('employees', 'People'), ...attendanceColumns]} />
            </Section>
            <Section title="By person">
              <SimpleTable
                rows={data.byEmployee.items}
                columns={[
                  { key: 'name', label: 'Name', render: (r) => <>{r.employee.name}<br /><small>{r.employee.employeeId} · {r.employee.department}</small></> },
                  ...attendanceColumns,
                ]}
              />
              <Pager data={data.byEmployee} onChange={(p) => setFilters({ ...filters, ...p })} rowsPerPageOptions={[25, 50, 100]} />
            </Section>
          </>
        )}
      </LoadState>
    </>
  );
}

function YearPicker({ value, onChange }) {
  return (
    <TextField select label="Year" size="small" value={value} onChange={(e) => onChange(Number(e.target.value))} sx={{ mb: 2, minWidth: 120 }}>
      {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
    </TextField>
  );
}

function LeaveReport() {
  const [year, setYear] = useState(thisYear);
  const { data, loading, error, reload } = useApi(() => getLeaveSummary({ year }), [year]);
  const maxDays = Math.max(1, ...(data?.byMonth || []).map((m) => m.approvedDays));
  return (
    <>
      <YearPicker value={year} onChange={setYear} />
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        {data && (
          <>
            <StatGrid>
              <StatCard label="Requests" value={data.totals.requests} />
              <StatCard label="Pending" value={data.byStatus.pending.requests} color={data.byStatus.pending.requests ? 'warning.main' : undefined} />
              <StatCard label="Approved" value={data.byStatus.approved.requests} color="success.main" hint={`${data.byStatus.approved.days} days`} />
              <StatCard label="Rejected" value={data.byStatus.rejected.requests} />
            </StatGrid>
            <Section title="By type">
              <SimpleTable rows={data.byType} columns={[{ key: 'leaveType', label: 'Type', render: (r) => leaveTypeLabel(r.leaveType) }, num('requests', 'Requests'), num('approvedDays', 'Approved days')]} />
            </Section>
            <Section title="By department">
              <SimpleTable rows={data.byDepartment} columns={[{ key: 'department', label: 'Department' }, num('requests', 'Requests'), num('pending', 'Pending'), num('approvedDays', 'Approved days')]} empty="No leave this year." />
            </Section>
            <Section title="Approved leave by month">
              <SimpleTable
                rows={data.byMonth}
                columns={[
                  { key: 'month', label: 'Month' },
                  num('requests', 'Requests'),
                  num('approvedDays', 'Days'),
                  { key: 'bar', label: '', render: (r) => <Box sx={{ minWidth: 120 }}><LinearProgress variant="determinate" value={(r.approvedDays / maxDays) * 100} /></Box> },
                ]}
              />
            </Section>
          </>
        )}
      </LoadState>
    </>
  );
}

function TrainingReport() {
  const [year, setYear] = useState(thisYear);
  const { data, loading, error, reload } = useApi(() => getTrainingSummary({ year }), [year]);
  return (
    <>
      <YearPicker value={year} onChange={setYear} />
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        {data && (
          <>
            <StatGrid>
              <StatCard label="Trainings" value={data.totals.trainings} hint={`${data.totals.upcoming} upcoming · ${data.totals.ongoing} running · ${data.totals.completed} done`} />
              <StatCard label="Seats" value={data.totals.seats} />
              <StatCard label="Enrolments" value={data.totals.enrolments} />
              <StatCard label="Seats filled" value={`${data.totals.fillRate}%`} />
            </StatGrid>
            <Section title="Trainings">
              <SimpleTable
                rows={data.trainings}
                empty="No trainings start this year."
                columns={[
                  { key: 'title', label: 'Title', render: (t) => <>{t.title}<br /><small>{t.trainer}</small></> },
                  { key: 'dates', label: 'Dates', render: (t) => formatDayRange(t.startDate, t.endDate) },
                  { key: 'status', label: 'Status', render: (t) => <StatusChip status={t.status} /> },
                  { key: 'seats', label: 'Enrolled', align: 'right', render: (t) => `${t.enrolled} / ${t.capacity}` },
                  { key: 'fill', label: 'Filled', render: (t) => <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 140 }}><LinearProgress variant="determinate" value={t.fillRate} sx={{ flexGrow: 1 }} /><span>{t.fillRate}%</span></Stack> },
                ]}
              />
            </Section>
          </>
        )}
      </LoadState>
    </>
  );
}

const REPORTS = [
  { label: 'Departments', Component: DepartmentsReport },
  { label: 'Attendance', Component: AttendanceReport },
  { label: 'Leave', Component: LeaveReport },
  { label: 'Training', Component: TrainingReport },
];

function ReportsPage() {
  const [tab, setTab] = useState(0);
  const { Component } = REPORTS[tab];
  return (
    <>
      <PageHeader title="Reports" subtitle="Calculated live from the database each time you open a report" />
      <Tabs value={tab} onChange={(_, t) => setTab(t)} variant="scrollable" sx={{ mb: 3 }}>
        {REPORTS.map((r) => <Tab key={r.label} label={r.label} />)}
      </Tabs>
      <Component />
    </>
  );
}

export default ReportsPage;
