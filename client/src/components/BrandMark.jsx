import { Box, Stack, Typography } from '@mui/material';

// The StaffSync dual-suited orbital emblem
function StaffSyncEmblem({ size = 36 }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 100 100"
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'block',
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bmGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0C79E" />
          <stop offset="50%" stopColor="#C3A477" />
          <stop offset="100%" stopColor="#856A47" />
        </linearGradient>
      </defs>

      {/* Sweeping Orbital Arcs */}
      <path
        d="M 48,10 C 72,10 94,28 98,52 C 99,60 97,68 94,74 C 91,62 86,40 70,26 C 58,16 42,14 30,17 C 35,12 41,10 48,10 Z"
        fill="url(#bmGoldGrad)"
      />
      <Box
        component="path"
        d="M 52,90 C 28,90 6,72 2,48 C 1,40 3,32 6,26 C 9,38 14,60 30,74 C 42,84 58,86 70,83 C 65,88 59,90 52,90 Z"
        sx={(theme) => ({
          fill: '#102C4A',
          ...theme.applyStyles('dark', { fill: '#78ABC3' }),
        })}
      />

      {/* Figure 1 (Upper Left - Suited) */}
      <Box
        component="circle"
        cx="34"
        cy="24"
        r="10.5"
        sx={(theme) => ({
          fill: '#102C4A',
          ...theme.applyStyles('dark', { fill: '#78ABC3' }),
        })}
      />
      <Box
        component="path"
        d="M 23,40 C 23,40 26,59 34,68 C 42,59 45,40 45,40 L 40,40 L 37.5,46 L 34,44 L 30.5,46 L 28,40 Z"
        sx={(theme) => ({
          fill: '#102C4A',
          ...theme.applyStyles('dark', { fill: '#78ABC3' }),
        })}
      />
      {/* Figure 1 Tie */}
      <path d="M 32.5,44 L 35.5,44 L 36,52 L 34,57 L 32,52 Z" fill="url(#bmGoldGrad)" />

      {/* Figure 2 (Lower Right - Suited) */}
      <circle cx="66" cy="76" r="10.5" fill="url(#bmGoldGrad)" />
      <path
        d="M 77,60 C 77,60 74,41 66,32 C 58,41 55,60 55,60 L 60,60 L 62.5,54 L 66,56 L 69.5,54 L 72,60 Z"
        fill="url(#bmGoldGrad)"
      />
      {/* Figure 2 Tie */}
      <Box
        component="path"
        d="M 67.5,56 L 64.5,56 L 64,48 L 66,43 L 68,48 Z"
        sx={(theme) => ({
          fill: '#102C4A',
          ...theme.applyStyles('dark', { fill: '#09213A' }),
        })}
      />
    </Box>
  );
}

// The production StaffSync brand mark: dual-suited figures orbital emblem + geometric dual-tone wordmark
function BrandMark({ size = 'medium', showTagline = false }) {
  const emblemSize = size === 'large' ? 44 : size === 'small' ? 24 : 34;
  const fontSize = size === 'large' ? 28 : size === 'small' ? 16 : 21;

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <StaffSyncEmblem size={emblemSize} />
      <Stack spacing={0}>
        <Typography
          component="span"
          sx={{
            fontFamily: '"Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif',
            fontWeight: 700,
            fontSize,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          <Box
            component="span"
            sx={(theme) => ({
              color: 'var(--sapphire, #102C4A)',
              ...theme.applyStyles('dark', { color: 'var(--hero-text, #F4EEE4)' }),
            })}
          >
            Staff
          </Box>
          <Box
            component="span"
            sx={{
              color: 'var(--accent-champagne, #B89A70)',
            }}
          >
            Sync
          </Box>
        </Typography>
        {showTagline && (
          <Typography
            component="span"
            sx={{
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: '0.24em',
              color: 'var(--hero-subtext, var(--text-muted))',
              textTransform: 'uppercase',
              mt: 0.25,
            }}
          >
            People • Process • Progress
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

export { StaffSyncEmblem };
export default BrandMark;
