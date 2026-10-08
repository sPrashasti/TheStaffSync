// How each platform audit action reads in the console.
export const AUDIT_ACTIONS = {
  'organisation.update': 'Renamed organisation',
  'organisation.suspend': 'Suspended organisation',
  'organisation.reactivate': 'Reactivated organisation',
  'admin.password': 'Changed own password',
};

// One line describing what changed, from the entry's details.
export const auditDetail = ({ action, details = {} }) => {
  if (action === 'organisation.update') return `“${details.from}” → “${details.to}”`;
  if (action === 'organisation.suspend') return `Reason: ${details.reason}`;
  if (action === 'organisation.reactivate') return details.previousReason ? `Was suspended for: ${details.previousReason}` : '';
  return '';
};
