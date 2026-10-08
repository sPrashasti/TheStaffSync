import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

// One headline number with a label, for dashboards and reports. `icon` (an MUI icon component)
// and `accent` (sapphire, ice, sage, champagne, olive, burgundy) add a small muted icon tile;
// the card itself stays neutral.
function StatCard({ label, value, hint, color = 'text.primary', icon: Icon, accent = 'sapphire' }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.75} sx={{ alignItems: 'flex-start' }}>
          {Icon && (
            <Box
              aria-hidden
              sx={{
                width: 42,
                height: 42,
                flexShrink: 0,
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: `var(--accent-${accent}-tile, var(--icon-tile-bg))`,
                color: `var(--accent-${accent})`,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Icon fontSize="small" />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" component="p" sx={{ lineHeight: 1.1, fontSize: { xs: '1.75rem', sm: '2rem' } }} color={color}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{label}</Typography>
            {hint && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{hint}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Lays StatCards out in a responsive row.
export function StatGrid({ children, min = 180 }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, mb: 3 }}>
      {children}
    </Box>
  );
}

export default StatCard;
