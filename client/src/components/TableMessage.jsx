import { TableCell, TableRow, Typography } from '@mui/material';

// A full-width row for "nothing here" messages inside a table body.
function TableMessage({ colSpan, children }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
        <Typography color="text.secondary">{children}</Typography>
      </TableCell>
    </TableRow>
  );
}

export default TableMessage;
