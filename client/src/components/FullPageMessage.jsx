import { Box, CircularProgress, Stack, Typography } from '@mui/material';

// Centred message for start-up, errors and empty routes. Pass `loading` for a spinner.
function FullPageMessage({ title, children, loading = false, action }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Stack spacing={2} sx={{ alignItems: 'center', maxWidth: 420, textAlign: 'center' }}>
        {loading && <CircularProgress aria-label="Loading" />}
        {title && <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>{title}</Typography>}
        {children && <Typography color="text.secondary">{children}</Typography>}
        {action}
      </Stack>
    </Box>
  );
}

export default FullPageMessage;
