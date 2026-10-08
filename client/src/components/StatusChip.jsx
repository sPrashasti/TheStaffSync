import { Box, Chip } from '@mui/material';

// Every status shown in the app, with its tone and label. Tones are muted: sage for good,
// champagne for waiting, burgundy for problems, ice blue for in-progress, neutral otherwise.
const STATUSES = {
  // leave
  pending: { label: 'Pending', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  // attendance
  present: { label: 'Present', tone: 'success' },
  'half-day': { label: 'Half day', tone: 'warning' },
  absent: { label: 'Absent', tone: 'danger' },
  'checked-in': { label: 'Checked in', tone: 'info' },
  'checked-out': { label: 'Checked out', tone: 'success' },
  'not-checked-in': { label: 'Not checked in', tone: 'neutral' },
  'on-leave': { label: 'On leave', tone: 'warning' },
  // training
  upcoming: { label: 'Upcoming', tone: 'info' },
  ongoing: { label: 'Ongoing', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' },
  // accounts
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Deactivated', tone: 'neutral' },
  // organisations (platform console)
  suspended: { label: 'Suspended', tone: 'danger' },
};

function StatusChip({ status, size = 'small' }) {
  const { label, tone } = STATUSES[status] || { label: status, tone: 'neutral' };
  return (
    <Chip
      size={size}
      label={label}
      icon={<Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: `var(--tone-${tone}-dot)`, ml: '10px !important' }} />}
      sx={{
        bgcolor: `var(--tone-${tone}-bg)`,
        color: `var(--tone-${tone}-fg)`,
        border: '1px solid transparent',
        fontWeight: 500,
        '& .MuiChip-label': { pl: 0.9, pr: 1.25 },
      }}
    />
  );
}

export default StatusChip;
