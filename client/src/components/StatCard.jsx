import { Card, CardContent, Typography } from '@mui/material';

// One headline number with a label, for dashboards and reports.
function StatCard({ label, value, hint, color = 'text.primary' }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h4" component="p" fontWeight={700} color={color}>{value}</Typography>
        {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
      </CardContent>
    </Card>
  );
}

// Lays StatCards out in a responsive row.
export function StatGrid({ children, min = 160 }) {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, marginBottom: 24 }}>
      {children}
    </div>
  );
}

export default StatCard;
