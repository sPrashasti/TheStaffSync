import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectDisplayTimeZone } from '../store/preferencesSlice';

const greetingFor = (hour) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Dashboard welcome on a satin background (ivory in light mode, sapphire in dark). The time of
// day follows the display time zone chosen in the top bar.
function GreetingBanner({ name, subtitle }) {
  const timeZone = useSelector(selectDisplayTimeZone);
  const [now] = useState(() => new Date());
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now));
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long', timeZone });
  const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone });

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '18px',
        border: '1px solid var(--card-border)',
        background: 'var(--hero-silk)',
        boxShadow: 'var(--card-shadow)',
        px: { xs: 2.5, sm: 4 },
        py: { xs: 2.5, sm: 3.5 },
        mb: 3,
        // Thin champagne line along the bottom edge.
        '&::after': { content: '""', position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: 'var(--metal)', opacity: 0.7 },
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ color: 'var(--hero-text)', fontSize: { xs: '1.6rem', sm: '2.1rem' } }}>
            {greetingFor(hour)}, {name.split(' ')[0]}
          </Typography>
          {subtitle && <Typography sx={{ color: 'var(--hero-subtext)', mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
        <Box sx={{ textAlign: { sm: 'right' } }}>
          <Typography variant="body2" sx={{ color: 'var(--hero-subtext)' }}>{weekday}</Typography>
          <Typography sx={{ color: 'var(--hero-text)', fontWeight: 600 }}>{date}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default GreetingBanner;
