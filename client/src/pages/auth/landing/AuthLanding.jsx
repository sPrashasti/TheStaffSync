import { Box, Button, Stack, Typography, useMediaQuery } from '@mui/material';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import { Link as RouterLink } from 'react-router-dom';
import BrandMark from '../../../components/BrandMark';
import DemoShowcase from './DemoShowcase';
import ThemeToggle from '../../../components/ThemeToggle';
import { clayButton, clayPremium, clayVars, expandOnScroll, frostedPanel, GOLD, MUTED, officeScene, SERIF, SHORT, SHORTER, TEXT } from './landingStyles';

const eyebrow = { color: GOLD, textTransform: 'uppercase', letterSpacing: '0.24em', fontSize: 12, fontWeight: 600 };
const width = { width: '100%', maxWidth: 1320, mx: 'auto' };
const pill = { borderRadius: '999px', px: 3 };
// Deep sapphire headings on the ivory theme, ivory on the sapphire one.
const headingColour = (theme) => ({ color: TEXT, ...theme.applyStyles('light', { color: 'var(--sapphire)' }) });

const gutter = { px: { xs: 2, sm: 4, md: 6, xl: 8 } };

// Hero fills the screen.
const fullHeroLayout = { minHeight: { md: '100vh' }, display: 'flex', flexDirection: 'column', pb: { xs: 4, md: 6 } };


// The public landing shared by login and sign-up: one scrolling page on the office scene, with a
// form (`card`) beside the pitch. On the login page that is a log-in / sign-up panel, and the hero
// buttons open its sign-up tab (`onSignup`) instead of leaving the page. `demo` is
// { available, organisationName } from the server, `onDemo(role)` signs in as that role and
// `demoError` reports a failed attempt.
function AuthLanding({ card, cardSx, mode = 'login', onSignup, demo, onDemo, demoError, busy = false }) {
  const showDemo = Boolean(demo?.available && onDemo);
  // The demo sits under the pitch where the screen is wide enough for its compact four columns,
  // and in its own section below the hero everywhere else. Only one of the two is ever rendered.
  const demoInHero = useMediaQuery('(min-width: 1280px)', { noSsr: true });
  const demoProps = showDemo && mode === 'login' && { organisationName: demo.organisationName, onDemo, demoError, busy };
  const fullHero = mode === 'login';
  // Sign-up buttons open the panel's sign-up tab where there is one, or go to the sign-up page.
  const signupAction = onSignup ? { onClick: onSignup } : { component: RouterLink, to: '/signup' };
  return (
    <Box
      id="top"
      component="main"
      sx={(theme) => ({ ...clayVars(theme), ...officeScene(theme), minHeight: '100vh', color: TEXT })}
    >
      <Box sx={{ ...gutter, pt: { xs: 2, md: 2.5 }, color: TEXT, ...(fullHero && fullHeroLayout) }}>
        {/* Header: brand and the theme switch. Signing in happens in the panel below. */}
        <Stack direction="row" spacing={2} sx={{ ...width, alignItems: 'center', justifyContent: 'space-between' }}>
          <BrandMark size="large" />
          <ThemeToggle sx={{ color: TEXT }} />
        </Stack>

        {/* Hero: the pitch on the left; the scene (or the sign-up form) on the right. */}
        <Box
          sx={{
            ...width,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: card ? 'minmax(0, 1.2fr) minmax(340px, 420px)' : 'minmax(0, 0.9fr) minmax(0, 1.1fr)' },
            alignItems: 'center',
            columnGap: { md: 6, lg: 8 },
            rowGap: 5,
            flex: 1,
            pt: { xs: 5, md: 4 },
            pb: { xs: 5, md: 5 },
            [SHORTER]: { pt: 2, pb: 3 },
          }}
        >
          <Box sx={{ order: { xs: 2, md: 1 }, minWidth: 0 }}>
            <Stack aria-hidden direction="row" spacing={1.5} sx={{ visibility: 'hidden', alignItems: 'center', mt: { xs: 1, md: 3 }, mb: 2.5, [SHORTER]: { mt: 1.5, mb: 1.5 } }}>
              <Typography sx={{ ...eyebrow, letterSpacing: { xs: '0.05em', sm: '0.16em', lg: eyebrow.letterSpacing }, fontSize: { xs: 10.5, sm: 12 } }}>Everything your organisation needs, in one place</Typography>
              <Box aria-hidden sx={{ width: 40, height: '1px', flexShrink: 0, display: { xs: 'none', lg: 'block' } }} />
            </Stack>
            <Typography
              component="h1"
              sx={(theme) => ({
                ...headingColour(theme),
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: 'clamp(2.9rem, 5.4vw, 5.2rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.02em',
                m: 0,
                [SHORT]: { fontSize: 'clamp(2.6rem, 4.6vw, 4.4rem)' },
                [SHORTER]: { fontSize: 'clamp(2.3rem, 4vw, 3.6rem)' },
              })}
            >
              People
              <br />
              Management
              <br />
              <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 600, color: GOLD }}>Made Simple.</Box>
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: { xs: 17, md: 19 }, lineHeight: 1.6, maxWidth: 680, mt: 3, [SHORTER]: { mt: 2, fontSize: 17 } }}>
              Everything your organisation needs — from HR and team management to leave, attendance and
              approvals, in one secure platform.
            </Typography>

            {mode === 'login' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap sx={{ flexWrap: 'wrap', mt: 4, [SHORTER]: { mt: 2.5 } }}>
                <Button {...signupAction} variant="premium" size="large" endIcon={<ArrowForwardIcon />} sx={{ ...pill, ...clayPremium, px: 4, py: 1.5 }}>
                  Get Started
                </Button>
                <Button
                  {...signupAction}
                  variant="outlined"
                  size="large"
                  startIcon={<ApartmentOutlinedIcon />}
                  sx={(theme) => ({ ...pill, ...clayButton, ...headingColour(theme), py: 1.5, px: 3.5 })}
                >
                  Set up your organisation
                </Button>
              </Stack>
            )}

            <Stack component="ul" direction="row" sx={{ listStyle: 'none', p: 0, m: 0, mt: 3.5, flexWrap: 'wrap', columnGap: 3, rowGap: 1, [SHORTER]: { mt: 2.5 } }}>
              {['Set up in minutes', ...(showDemo ? ['Live demo, no sign-up'] : [])].map((point) => (
                <Stack component="li" key={point} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 18, color: GOLD }} />
                  <Typography sx={{ color: MUTED, fontSize: 14 }}>{point}</Typography>
                </Stack>
              ))}
            </Stack>

            {/* Fills the text column; without a form beside it, it reaches into the scene. */}
            {demoProps && demoInHero && (
              <DemoShowcase compact {...demoProps} sx={{ zIndex: 1, width: card ? '100%' : 'calc(100% + 160px)', mt: 4, [SHORTER]: { mt: 2.5 } }} />
            )}
          </Box>

          {card ? (
            <Box
              sx={{
                ...frostedPanel,
                // On phones the sign-up page leads with its form; the login page leads with the pitch.
                order: { xs: mode === 'login' ? 3 : 1, md: 2 },
                width: '100%',
                maxWidth: 420,
                justifySelf: { xs: 'center', md: 'end' },
                borderRadius: '32px',
                p: { xs: 3, sm: 4 },
                [SHORT]: { p: 3.5 },
                [SHORTER]: { p: 3 },
                ...cardSx,
              }}
            >
              {card}
            </Box>
          ) : (
            // The scene's own people and dashboards fill this side.
            <Box aria-hidden sx={{ order: 2 }} />
          )}
        </Box>
      </Box>

      {demoProps && !demoInHero && (
        <Box sx={{ ...gutter, pt: 2, pb: 4 }}>
          <DemoShowcase {...demoProps} sx={{ ...width, ...expandOnScroll(0, { tall: true }) }} />
        </Box>
      )}
    </Box>
  );
}

export default AuthLanding;
