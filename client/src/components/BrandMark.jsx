import { Box, Stack, Typography } from '@mui/material';

// The StaffSync logo: a champagne metallic "S" tile with the name in the display font.
function BrandMark({ size = 'medium' }) {
  const tile = size === 'large' ? 44 : 32;
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Box
        aria-hidden
        sx={{
          width: tile,
          height: tile,
          borderRadius: '10px',
          background: 'var(--metal)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--on-metal)',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontWeight: 700,
          fontSize: tile * 0.62,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 12px rgba(128,103,71,0.25)',
        }}
      >
        S
      </Box>
      <Typography
        component="span"
        sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600, fontSize: size === 'large' ? 30 : 21, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
      >
        StaffSync
      </Typography>
    </Stack>
  );
}

export default BrandMark;
