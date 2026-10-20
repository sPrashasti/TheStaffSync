import { useState } from 'react';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import { selectUser } from '../store/authSlice';
import { selectDisplayTimeZone } from '../store/preferencesSlice';
import { ROLE_LABELS } from '../routes/navigation';

const greetingFor = (hour) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Dashboard welcome on a satin background (ivory in light mode, sapphire in dark). The time of
// day follows the display time zone chosen in the top bar. Features the user's profile picture.
function GreetingBanner({ name, subtitle }) {
  const storeUser = useSelector(selectUser);
  const user = storeUser || {};
  const displayName = name || user.name || 'there';
  const timeZone = useSelector(selectDisplayTimeZone);
  const [now] = useState(() => new Date());
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now));
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long', timeZone });
  const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone });
  const profileLink = user.role ? `/${user.role}/profile` : undefined;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        border: '1px solid var(--card-border)',
        background: 'var(--hero-silk)',
        boxShadow: 'var(--card-shadow)',
        px: { xs: 2.5, sm: 3.5, md: 4 },
        py: { xs: 2.5, sm: 3 },
        mb: 3,
        // Thin champagne line along the bottom edge.
        '&::after': { content: '""', position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: 'var(--metal)', opacity: 0.7 },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Stack direction="row" spacing={{ xs: 2, sm: 2.5 }} sx={{ alignItems: 'center' }}>
          <Tooltip title="View your profile" arrow>
            <Box
              component={profileLink ? RouterLink : 'div'}
              to={profileLink}
              sx={{
                position: 'relative',
                display: 'inline-flex',
                borderRadius: '50%',
                textDecoration: 'none',
                cursor: profileLink ? 'pointer' : 'default',
                p: '3px',
                background: 'linear-gradient(135deg, var(--champagne), var(--border-strong))',
                boxShadow: '0 4px 16px var(--card-shadow)',
                transition: 'transform 200ms ease, box-shadow 200ms ease',
                '&:hover': profileLink ? {
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 20px var(--card-shadow), 0 0 12px color-mix(in srgb, var(--champagne) 40%, transparent)',
                } : {},
              }}
            >
              <UserAvatar
                userId={user._id}
                name={displayName}
                photoUpdatedAt={user.photoUpdatedAt}
                size={58}
                sx={{
                  border: '2px solid var(--card-bg)',
                  boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.25)',
                }}
              />
            </Box>
          </Tooltip>

          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.25 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  color: 'var(--hero-text)',
                  fontSize: { xs: '1.45rem', sm: '1.85rem', md: '2.05rem' },
                  fontWeight: 700,
                  lineHeight: 1.15,
                }}
              >
                {greetingFor(hour)}, {displayName.split(' ')[0]}
              </Typography>
              {user.role && (
                <Chip
                  label={ROLE_LABELS[user.role] || user.role}
                  size="small"
                  sx={{
                    display: { xs: 'none', md: 'inline-flex' },
                    height: 22,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    bgcolor: 'var(--hover-tint)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                />
              )}
            </Stack>
            {subtitle && (
              <Typography sx={{ color: 'var(--hero-subtext)', fontSize: { xs: '0.88rem', sm: '0.95rem' }, mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        <Box sx={{ textAlign: { sm: 'right' }, pl: { xs: 0, sm: 2 } }}>
          <Typography variant="body2" sx={{ color: 'var(--hero-subtext)', fontSize: '0.82rem' }}>{weekday}</Typography>
          <Typography sx={{ color: 'var(--hero-text)', fontWeight: 600, fontSize: { xs: '0.92rem', sm: '1rem' } }}>{date}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default GreetingBanner;
