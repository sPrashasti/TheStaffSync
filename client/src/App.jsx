import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { getHealth } from './services/healthService';

// Phase 1 placeholder: proves React → Axios → Express works end to end.
// Replaced by the router and role dashboards in Phase 12.
function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then((result) => {
        if (cancelled) return;
        setHealth(result);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setHealth(null);
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const handleRetry = () => {
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 } }}>
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        StaffSync
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        API connection check
      </Typography>

      <Card variant="outlined">
        <CardContent>
          {loading && (
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={20} />
              <Typography>Contacting the API…</Typography>
            </Stack>
          )}

          {!loading && error && <Alert severity="error">{error}</Alert>}

          {!loading && health && (
            <Stack spacing={1.5}>
              <Alert severity="success">{health.message}</Alert>
              <Box>
                <Typography variant="body2" component="span" sx={{ mr: 1 }}>
                  Database:
                </Typography>
                <Chip
                  size="small"
                  label={health.data.database}
                  color={health.data.database === 'connected' ? 'success' : 'warning'}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Environment: {health.data.environment} · Server time: {new Date(health.data.timestamp).toLocaleString('en-GB', { hour12: false })}
              </Typography>
            </Stack>
          )}

          <Button variant="contained" onClick={handleRetry} disabled={loading} sx={{ mt: 2 }}>
            Check again
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}

export default App;
