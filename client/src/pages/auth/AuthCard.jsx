import { Box, Card, CardContent, Typography } from '@mui/material';
import BrandMark from '../../components/BrandMark';
import ThemeToggle from '../../components/ThemeToggle';

// Centred card used by the login and registration pages, on an ivory (light) or sapphire
// (dark) silk background.
function AuthCard({ title, subtitle, children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 4,
        background: 'var(--hero-silk)',
        position: 'relative',
      }}
    >
      <ThemeToggle sx={{ position: 'absolute', top: 16, right: 16, color: 'var(--hero-text)' }} />
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <BrandMark size="large" />
        </Box>
        <Card
          variant="outlined"
          sx={{ bgcolor: 'var(--elevated-bg)', boxShadow: 'var(--elevated-shadow)', borderRadius: '18px' }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
            <Typography variant="h4" component="h1">{title}</Typography>
            {subtitle && <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>{subtitle}</Typography>}
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default AuthCard;
