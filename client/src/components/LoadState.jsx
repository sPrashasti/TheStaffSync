import { Alert, Box, Button, CircularProgress, LinearProgress } from '@mui/material';

// Wraps content that comes from useApi: spinner on first load, error with retry, a thin bar
// while refreshing. Children render once there is data.
function LoadState({ loading, error, data, onRetry, children }) {
  if (error && !data) {
    return (
      <Alert severity="error" action={onRetry && <Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}>
        {error}
      </Alert>
    );
  }
  if (!data) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress aria-label="Loading" /></Box>;
  }
  return (
    <>
      <Box sx={{ height: 4, mb: 1 }}>{loading && <LinearProgress aria-label="Refreshing" />}</Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {children}
    </>
  );
}

export default LoadState;
