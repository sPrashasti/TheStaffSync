import { Box, Card, CardContent, Typography } from '@mui/material';

// Centred card used by the login and registration pages.
function AuthCard({ title, subtitle, children }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, py: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Typography variant="h4" component="p" fontWeight={800} color="primary" textAlign="center" sx={{ mb: 3 }}>
          StaffSync
        </Typography>
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h5" component="h1" fontWeight={700}>{title}</Typography>
            {subtitle && <Typography color="text.secondary" sx={{ mb: 3 }}>{subtitle}</Typography>}
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default AuthCard;
