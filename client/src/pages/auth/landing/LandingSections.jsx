import { Box, Button, Stack, Typography } from '@mui/material';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import PieChartOutlineOutlinedIcon from '@mui/icons-material/PieChartOutlineOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import { clayPremium, expandOnScroll, frostedInset, frostedPanel, GOLD, iconTile, MUTED, SERIF, TEXT } from './landingStyles';

// Only features StaffSync actually has.
const FEATURES = [
  { icon: GroupsOutlinedIcon, title: 'Employee Management', text: 'Profiles, roles, departments and reporting lines in one place.' },
  { icon: AccessTimeOutlinedIcon, title: 'Attendance', text: 'One-click check-in and check-out, with team and company views.' },
  { icon: EventAvailableOutlinedIcon, title: 'Leave & Approvals', text: 'Requests go to the right manager and get a clear decision.' },
  { icon: SchoolOutlinedIcon, title: 'Training', text: 'Sessions with seats, enrolment and team assignments.' },
  { icon: CampaignOutlinedIcon, title: 'Announcements', text: 'Updates for the right audience, with in-app notifications.' },
  { icon: PieChartOutlineOutlinedIcon, title: 'Reports & Analytics', text: 'Attendance, leave and training figures from live records.' },
];

const ROLES = [
  { role: 'hr', title: 'HR', icon: BadgeOutlinedIcon, points: ['Manage people and roles', 'Approve leave, company-wide', 'Reports and analytics'] },
  { role: 'manager', title: 'Manager', icon: SupervisorAccountOutlinedIcon, points: ['Team attendance at a glance', 'Approve team leave', 'Assign team training'] },
  { role: 'employee', title: 'Employee', icon: InsightsOutlinedIcon, points: ['Check in and check out', 'Apply for leave, track status', 'Enrol in training'] },
];

const width = { width: '100%', maxWidth: 1320, mx: 'auto' };
const eyebrow = { color: GOLD, textTransform: 'uppercase', letterSpacing: '0.24em', fontSize: 12, fontWeight: 600 };
const headingColour = (theme) => ({ color: TEXT, ...theme.applyStyles('light', { color: 'var(--sapphire)' }) });
const sectionHeading = (theme) => ({ ...headingColour(theme), fontFamily: SERIF, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.01em', m: 0 });
const pill = { borderRadius: '999px', px: 3 };
const gold = (percent) => `color-mix(in srgb, var(--champagne) ${percent}%, transparent)`;

// Decorative only: a glass "dashboard" built from shapes, with no figures, to give the header a
// visual beside the text. Hidden from screen readers.
function DashboardPreview() {
  const bars = [46, 70, 58, 84, 64, 92, 76];
  return (
    <Box aria-hidden sx={{ ...frostedPanel, borderRadius: '28px', p: 3, width: '100%', maxWidth: 440, justifySelf: { md: 'end' }, ...expandOnScroll() }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
        <Box sx={iconTile(40)}><InsightsOutlinedIcon fontSize="small" /></Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ height: 9, width: '55%', borderRadius: 9, bgcolor: gold(45) }} />
          <Box sx={{ height: 7, width: '35%', borderRadius: 9, bgcolor: 'var(--glass-field-border)', mt: 1 }} />
        </Box>
        {[GroupsOutlinedIcon, EventAvailableOutlinedIcon].map((Icon, i) => (
          <Box key={i} sx={{ ...iconTile(32), '& svg': { fontSize: 17 } }}><Icon /></Box>
        ))}
      </Stack>
      <Box sx={{ ...frostedInset, borderRadius: '18px', p: 2, display: 'flex', alignItems: 'flex-end', gap: 1.25, height: 150 }}>
        {bars.map((h, i) => (
          <Box key={i} sx={{ flex: 1, height: `${h}%`, borderRadius: '8px 8px 4px 4px', background: i === 5 ? 'var(--metal)' : gold(i % 2 ? 38 : 26) }} />
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, mt: 2 }}>
        {[AccessTimeOutlinedIcon, EventAvailableOutlinedIcon, SchoolOutlinedIcon].map((Icon, i) => (
          <Stack key={i} direction="row" spacing={1} sx={{ ...frostedInset, borderRadius: '14px', p: 1.25, alignItems: 'center' }}>
            <Icon sx={{ color: GOLD, fontSize: 18 }} />
            <Box sx={{ flex: 1, height: 7, borderRadius: 9, bgcolor: 'var(--glass-field-border)' }} />
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

// Features: a header with the decorative preview, then one card per feature.
export function FeaturesSection() {
  return (
    <Box id="features" component="section" aria-labelledby="features-title" sx={{ ...width, scrollMarginTop: 24, pt: { xs: 6, md: 8 } }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.1fr) minmax(0, 0.9fr)' }, gap: { xs: 4, md: 6 }, alignItems: 'center' }}>
        <Box sx={expandOnScroll()}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography sx={eyebrow}>Features</Typography>
            <Box aria-hidden sx={{ width: 40, height: '1px', bgcolor: GOLD }} />
          </Stack>
          <Typography id="features-title" component="h2" sx={(theme) => ({ ...sectionHeading(theme), fontSize: { xs: 34, md: 46 }, mt: 1.5 })}>
            Everything You Need to <Box component="br" sx={{ display: { xs: 'none', sm: 'block' } }} />Manage Your Workforce.
          </Typography>
          <Typography sx={{ color: MUTED, fontSize: { xs: 16, md: 18 }, lineHeight: 1.6, mt: 2, maxWidth: 560 }}>
            Powerful tools designed for modern teams — simple, secure and easy to roll out.
          </Typography>
        </Box>
        <DashboardPreview />
      </Box>

      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: { xs: 4, md: 5 }, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' } }}>
        {FEATURES.map(({ icon: Icon, title, text }, i) => (
          <Box component="li" key={title} sx={{ ...frostedPanel, borderRadius: '22px', p: 2.25, ...expandOnScroll(i) }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={iconTile(42)}><Icon fontSize="small" /></Box>
              <Typography component="h3" sx={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.25 }}>{title}</Typography>
            </Stack>
            <Typography sx={{ color: MUTED, fontSize: 13.5, lineHeight: 1.5, mt: 1.25 }}>{text}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Solutions: an introduction and one card per role, each with its demo when the server has one.
export function SolutionsSection({ signupAction, onDemo, showDemo, busy }) {
  return (
    <Box
      id="solutions"
      component="section"
      aria-labelledby="solutions-title"
      sx={{
        ...width,
        ...frostedPanel,
        scrollMarginTop: 24,
        mt: { xs: 5, md: 7 },
        borderRadius: '32px',
        p: { xs: 2.5, sm: 3.5, lg: 4 },
        display: 'grid',
        gap: { xs: 2.5, md: 3 },
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'minmax(0, 1.05fr) repeat(3, minmax(0, 1fr))' },
        alignItems: 'stretch',
      }}
    >
      <Box sx={{ gridColumn: { sm: '1 / -1', lg: 'auto' }, alignSelf: 'center', pr: { lg: 1 }, ...expandOnScroll() }}>
        <Typography id="solutions-title" component="h2" sx={(theme) => ({ ...sectionHeading(theme), fontSize: { xs: 30, md: 36 } })}>
          Solutions for <Box component="br" sx={{ display: { xs: 'none', lg: 'block' } }} />Every Role.
        </Typography>
        <Typography sx={{ color: MUTED, fontSize: 15.5, lineHeight: 1.6, mt: 1.5, maxWidth: 420 }}>
          Tailored access and tools for HR, managers and employees — so everyone can do more.
        </Typography>
        <Button {...signupAction} variant="premium" endIcon={<ArrowForwardIcon />} sx={{ ...pill, ...clayPremium, mt: 3, py: 1.1 }}>
          Set up your organisation
        </Button>
      </Box>

      {ROLES.map(({ role, title, icon: Icon, points }, i) => (
        <Box key={role} sx={{ ...frostedInset, borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', ...expandOnScroll(i) }}>
          <Box aria-hidden sx={{ height: 120, display: 'grid', placeItems: 'center', background: `radial-gradient(90% 120% at 50% 100%, ${gold(30)} 0%, transparent 70%)`, borderBottom: '1px solid var(--glass-field-border)' }}>
            <Box sx={{ ...iconTile(72), '& svg': { fontSize: 36 } }}><Icon /></Box>
          </Box>
          <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Typography component="h3" sx={(theme) => ({ ...headingColour(theme), fontFamily: SERIF, fontWeight: 700, fontSize: 22 })}>{title}</Typography>
            <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0, mt: 1.5, mb: 2.5 }}>
              {points.map((point) => (
                <Stack component="li" key={point} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <CheckCircleRoundedIcon sx={{ color: GOLD, fontSize: 18 }} />
                  <Typography sx={{ fontSize: 14 }}>{point}</Typography>
                </Stack>
              ))}
            </Stack>
            {showDemo && (
              <Button
                fullWidth
                disabled={busy}
                onClick={() => onDemo(role)}
                endIcon={<ArrowForwardIcon />}
                sx={{ mt: 'auto', borderRadius: '14px', py: 1, fontWeight: 600, color: TEXT, bgcolor: gold(16), border: `1px solid ${gold(35)}`, '&:hover': { bgcolor: gold(26) } }}
              >
                Try {title} Demo
              </Button>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// Closing call to action.
export function CtaBand({ signupAction, showDemo }) {
  const points = ['Set up in minutes', 'Each company’s data kept separate', ...(showDemo ? ['Live demo, no sign-up'] : [])];
  return (
    <Box component="section" aria-labelledby="cta-title" sx={{ ...width, ...frostedPanel, mt: { xs: 5, md: 7 }, borderRadius: '32px', p: { xs: 3, md: 4.5 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'auto minmax(0, 1fr) auto' }, gap: { xs: 2.5, md: 4 }, alignItems: 'center', backgroundImage: `radial-gradient(60% 120% at 0% 50%, ${gold(14)} 0%, transparent 60%)`, ...expandOnScroll() }}>
      <Box aria-hidden sx={{ ...iconTile(84), display: { xs: 'none', md: 'grid' }, '& svg': { fontSize: 40 } }}><RocketLaunchOutlinedIcon /></Box>
      <Box>
        <Typography id="cta-title" component="h2" sx={(theme) => ({ ...sectionHeading(theme), fontSize: { xs: 28, md: 34 } })}>
          Ready to Simplify People Management?
        </Typography>
        <Typography sx={{ color: MUTED, fontSize: 15.5, mt: 1 }}>Bring HR, managers and employees together in one secure place.</Typography>
        <Stack component="ul" direction="row" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2, flexWrap: 'wrap', columnGap: 3, rowGap: 1 }}>
          {points.map((point) => (
            <Stack component="li" key={point} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <CheckCircleRoundedIcon sx={{ color: GOLD, fontSize: 18 }} />
              <Typography sx={{ fontSize: 14, color: MUTED }}>{point}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
      <Button {...signupAction} variant="premium" size="large" endIcon={<ArrowForwardIcon />} sx={{ ...pill, ...clayPremium, px: 4, py: 1.5, justifySelf: { xs: 'start', md: 'end' } }}>
        Get Started
      </Button>
    </Box>
  );
}
