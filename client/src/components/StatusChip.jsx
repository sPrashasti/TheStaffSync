import { Chip } from '@mui/material';

// Every status shown in the app, with its colour and label.
const STATUSES = {
  // leave
  pending: { label: 'Pending', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  // attendance
  present: { label: 'Present', color: 'success' },
  'half-day': { label: 'Half day', color: 'warning' },
  absent: { label: 'Absent', color: 'error' },
  'checked-in': { label: 'Checked in', color: 'info' },
  'checked-out': { label: 'Checked out', color: 'success' },
  'not-checked-in': { label: 'Not checked in', color: 'default' },
  'on-leave': { label: 'On leave', color: 'secondary' },
  // training
  upcoming: { label: 'Upcoming', color: 'info' },
  ongoing: { label: 'Ongoing', color: 'success' },
  completed: { label: 'Completed', color: 'default' },
  // accounts
  active: { label: 'Active', color: 'success' },
  inactive: { label: 'Deactivated', color: 'default' },
};

function StatusChip({ status, size = 'small' }) {
  const { label, color } = STATUSES[status] || { label: status, color: 'default' };
  return <Chip size={size} label={label} color={color} variant={color === 'default' ? 'outlined' : 'filled'} />;
}

export default StatusChip;
