// Display labels for values that come from the API.
export const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual' },
  { value: 'sick', label: 'Sick' },
  { value: 'earned', label: 'Earned' },
  { value: 'unpaid', label: 'Unpaid' },
];
export const leaveTypeLabel = (type) => LEAVE_TYPES.find((t) => t.value === type)?.label || type;

export const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'employees', label: 'Employees' },
  { value: 'managers', label: 'Managers' },
];
export const audienceLabel = (value) => AUDIENCES.find((a) => a.value === value)?.label || value;

export const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
];
