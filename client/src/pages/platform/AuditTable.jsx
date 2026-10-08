import { Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import TableMessage from '../../components/TableMessage';
import { selectDisplayTimeZone } from '../../store/preferencesSlice';
import { formatDateTime } from '../../utils/format';
import { AUDIT_ACTIONS, auditDetail } from './auditLabels';

// Platform audit entries, newest first. `showOrganisation` adds a column linking to it.
function AuditTable({ items, showOrganisation = true }) {
  const timeZone = useSelector(selectDisplayTimeZone);
  const columns = showOrganisation ? 5 : 4;
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>When</TableCell>
            <TableCell>Who</TableCell>
            <TableCell>Action</TableCell>
            {showOrganisation && <TableCell>Organisation</TableCell>}
            <TableCell>Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && <TableMessage colSpan={columns}>Nothing recorded yet.</TableMessage>}
          {items.map((entry) => (
            <TableRow key={entry._id}>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(entry.createdAt, timeZone)}</TableCell>
              <TableCell>{entry.adminEmail}</TableCell>
              <TableCell>{AUDIT_ACTIONS[entry.action] || entry.action}</TableCell>
              {showOrganisation && (
                <TableCell>
                  {entry.organisationId
                    ? <Link component={RouterLink} to={`/platform/organisations/${entry.organisationId}`}>{entry.organisationName}</Link>
                    : '—'}
                </TableCell>
              )}
              <TableCell>{auditDetail(entry) || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default AuditTable;
