import { Alert } from '@mui/material';
import PageHeader from '../components/PageHeader';

// Stands in for pages that are built in Phase 13.
function PlaceholderPage({ title }) {
  return (
    <>
      <PageHeader title={title} />
      <Alert severity="info">This page is being built.</Alert>
    </>
  );
}

export default PlaceholderPage;
