import { TablePagination } from '@mui/material';

// Pagination for API lists ({ page, limit, total }). The API counts pages from 1, MUI from 0.
function Pager({ data, onChange, rowsPerPageOptions = [10, 25, 50] }) {
  if (!data) return null;
  return (
    <TablePagination
      component="div"
      count={data.total}
      page={Math.max(0, data.page - 1)}
      rowsPerPage={data.limit}
      rowsPerPageOptions={rowsPerPageOptions}
      onPageChange={(_, page) => onChange({ page: page + 1, limit: data.limit })}
      onRowsPerPageChange={(e) => onChange({ page: 1, limit: Number(e.target.value) })}
    />
  );
}

export default Pager;
