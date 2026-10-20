import { Alert, Box, ButtonBase, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { gradients } from '../../../theme/tokens';
import { GOLD, LINE, MUTED, panel, SERIF, TEXT } from './landingStyles';

// One card per demo role. `badge` is the small accent that sets each card's illustration apart;
// `tilt` turns the faint orbit ring behind it; `short` labels the compact card.
const ROLES = [
  { role: 'hr', title: 'HR', short: 'People & policies', text: 'Manage people, policies and organisation data.', icon: GroupsRoundedIcon, badge: ListAltRoundedIcon, tilt: -14 },
  { role: 'manager', title: 'Manager', short: 'Team insights', text: 'Track team performance, projects and insights.', icon: InsightsRoundedIcon, badge: TrendingUpRoundedIcon, tilt: 0 },
  { role: 'employee', title: 'Employee', short: 'Your workspace', text: 'Access your workspace, tasks and personal data.', icon: BadgeOutlinedIcon, badge: ScheduleRoundedIcon, tilt: 14 },
];

const BENEFITS = [
  { icon: BoltIcon, label: 'No sign‑up' },
  { icon: StorageRoundedIcon, label: 'Sample data' },
  { icon: AutorenewIcon, label: 'Resets daily' },
];

// Champagne mixed into transparency, so every tint follows the active theme's own champagne.
const gold = (percent) => `color-mix(in srgb, var(--champagne) ${percent}%, transparent)`;

const WIDE = '@media (min-width: 1280px)';
const TABLET = '@media (min-width: 600px)';
const DESKTOP = '@media (min-width: 900px)';
const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

// Two sizes: `full` is a section of its own; `compact` is a short strip under the hero pitch (about
// 660–730px wide, wide screens only) with the introduction beside three small cards.
const SIZES = {
  full: {
    illustration: { width: 128, height: 100 }, ring: { width: 136, height: 48 }, stage: 84, stageRadius: '24px', icon: 46, badge: 34, badgeIcon: 19,
    title: { xs: 28, md: 30 }, text: 14.5, cta: { xs: 14.5, md: 14 }, arrow: 36, arrowIcon: 19, cardRadius: '28px', gap: 1.25,
  },
  compact: {
    stage: 52, stageRadius: '15px', icon: 30, title: 13, arrow: 24, arrowIcon: 14, cardRadius: '16px', gap: 1.5,
  },
};

// Read by screen readers, not shown.
const visuallyHidden = { position: 'absolute', width: 1, height: 1, p: 0, m: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 };

const eyebrow = { color: GOLD, textTransform: 'uppercase', letterSpacing: '0.24em', fontSize: 12, fontWeight: 600 };
const headingColour = (theme) => ({ color: TEXT, ...theme.applyStyles('light', { color: 'var(--sapphire)' }) });

function RoleIllustration({ icon: Icon, badge: Badge, tilt, size }) {
  return (
    <Box aria-hidden sx={{ position: 'relative', ...size.illustration, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      {/* Soft glow and a faint orbit ring behind the framed icon. */}
      <Box sx={{ position: 'absolute', inset: -8, borderRadius: '50%', background: `radial-gradient(circle, ${gold(22)} 0%, transparent 68%)` }} />
      <Box sx={{ position: 'absolute', ...size.ring, top: '58%', borderRadius: '50%', border: `1px solid ${gold(30)}`, transform: `rotate(${tilt}deg)` }} />
      <Box
        sx={{
          position: 'relative',
          width: size.stage,
          height: size.stage,
          borderRadius: size.stageRadius,
          display: 'grid',
          placeItems: 'center',
          color: GOLD,
          background: 'linear-gradient(145deg, var(--icon-tile-bg), var(--card-bg))',
          border: `1px solid ${gold(34)}`,
          boxShadow: 'inset 2px 2px 5px var(--clay-hi), inset -3px -3px 7px var(--clay-lo), 6px 10px 22px var(--clay-drop)',
        }}
      >
        <Icon sx={{ fontSize: size.icon, filter: `drop-shadow(0 4px 8px ${gold(35)})` }} />
        <Box
          sx={{
            position: 'absolute',
            right: -size.badge / 3,
            bottom: -size.badge / 3.5,
            width: size.badge,
            height: size.badge,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: gradients.champagneMetallic,
            color: 'var(--navy)',
            boxShadow: '0 4px 12px var(--clay-drop), inset 1px 1px 2px rgba(255, 255, 255, 0.45)',
          }}
        >
          <Badge sx={{ fontSize: size.badgeIcon }} />
        </Box>
      </Box>
    </Box>
  );
}

// The champagne arrow on each card; it nudges right when the card is hovered or focused.
// `outlined` starts as a fine gold ring and fills with champagne when its card is hovered or focused.
function DemoArrow({ size, outlined = false }) {
  return (
    <Box
      component="span"
      className="demo-arrow"
      sx={{
        flexShrink: 0,
        width: size.arrow,
        height: size.arrow,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        ...(outlined
          ? { border: `1px solid ${gold(45)}`, color: GOLD, backgroundColor: 'transparent' }
          : { background: gradients.champagneMetallic, color: 'var(--navy)' }),
        transition: 'transform 250ms ease, background-color 250ms ease, color 250ms ease, border-color 250ms ease',
      }}
    >
      <ArrowForwardIcon sx={{ fontSize: size.arrowIcon }} />
    </Box>
  );
}

function RoleCard({ role, title, short, text, icon, badge, tilt, compact, disabled, onOpen }) {
  const size = compact ? SIZES.compact : SIZES.full;
  const descriptionId = `demo-${role}-text`;
  const Icon = icon;
  return (
    <ButtonBase
      focusRipple
      disabled={disabled}
      onClick={() => onOpen(role)}
      aria-label={`Open ${title} demo`}
      aria-describedby={descriptionId}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: compact ? 'stretch' : 'center',
        textAlign: compact ? 'left' : 'center',
        gap: size.gap,
        width: '100%',
        // Full size: square where the width allows it; the content can still make a card taller.
        ...(compact
          ? { px: 1.5, py: 2 }
          : { minHeight: 300, p: { xs: 2.5, sm: 3, md: 2.5 }, pt: { xs: 3, sm: 3.5, md: 2.5 }, [DESKTOP]: { aspectRatio: '1 / 1', minHeight: 'auto' } }),
        borderRadius: size.cardRadius,
        color: TEXT,
        // Richer layered background: a deep navy base with a warm champagne tint at the top.
        background: compact
          ? `linear-gradient(175deg, color-mix(in srgb, var(--champagne) 9%, var(--elevated-bg)) 0%, var(--card-bg) 55%, color-mix(in srgb, var(--champagne) 3%, var(--card-bg)) 100%)`
          : `linear-gradient(165deg, color-mix(in srgb, var(--champagne) 6%, var(--elevated-bg)) 0%, var(--card-bg) 100%)`,
        border: `1px solid ${gold(compact ? 22 : 18)}`,
        boxShadow: compact
          ? `0 8px 20px var(--clay-drop), 0 2px 6px var(--clay-drop), inset 0 1px 0 ${gold(28)}`
          : '0 18px 40px var(--clay-drop), inset 0 1px 0 var(--clay-hi)',
        transition: 'transform 280ms cubic-bezier(0.34,1.56,0.64,1), border-color 250ms ease, box-shadow 250ms ease',
        // Glow layer revealed on hover.
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: compact
            ? `radial-gradient(80% 80% at 50% 0%, ${gold(22)} 0%, transparent 70%)`
            : `radial-gradient(120% 70% at 50% 0%, ${gold(16)} 0%, transparent 60%)`,
          opacity: 0,
          transition: 'opacity 300ms ease',
          pointerEvents: 'none',
        },
        // Thin shimmer stripe across the very top edge.
        ...(compact && {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '1px',
            borderRadius: '0 0 4px 4px',
            background: `linear-gradient(90deg, transparent, ${gold(70)}, transparent)`,
            pointerEvents: 'none',
          },
        }),
        '& > *': { position: 'relative' },
        '&:hover, &.Mui-focusVisible': {
          transform: compact ? 'translateY(-4px) scale(1.015)' : 'translateY(-4px)',
          borderColor: gold(compact ? 65 : 55),
          boxShadow: compact
            ? `0 14px 32px var(--clay-drop), 0 0 0 1px ${gold(28)}, inset 0 1px 0 ${gold(35)}`
            : `0 20px 40px var(--clay-drop), 0 0 0 1px ${gold(20)}, inset 0 1px 0 var(--clay-hi)`,
          '&::before': { opacity: 1 },
          '& .demo-arrow': {
            transform: compact ? 'translateX(2px) scale(1.08)' : 'translateX(3px)',
            ...(compact && { background: gradients.champagneMetallic, color: 'var(--navy)', borderColor: 'transparent' }),
          },
          '& .role-icon-tile': {
            boxShadow: `inset 1px 1px 3px var(--clay-hi), inset -2px -2px 5px var(--clay-lo), 0 0 16px ${gold(30)}`,
          },
        },
        '&.Mui-focusVisible': { outline: `2px solid ${GOLD}`, outlineOffset: 3 },
        '&.Mui-disabled': { opacity: 0.6 },
        [REDUCED_MOTION]: {
          transition: 'none',
          '&::before, & .demo-arrow': { transition: 'none' },
          '&:hover, &.Mui-focusVisible': { transform: 'none', '& .demo-arrow': { transform: 'none' } },
        },
      }}
    >
      {compact ? (
        // Compact: centered icon tile with glow, arrow pinned top-right, centered label block.
        <>
          {/* Arrow pinned to the top-right corner of the card */}
          <Box component="span" sx={{ position: 'absolute', top: 9, right: 9 }}>
            <DemoArrow size={size} outlined />
          </Box>

          {/* Premium icon tile — layered gradient bg + icon glow */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.25 }}>
            <Box
              aria-hidden
              className="role-icon-tile"
              sx={{
                width: size.stage,
                height: size.stage,
                borderRadius: size.stageRadius,
                display: 'grid',
                placeItems: 'center',
                color: GOLD,
                // Layered: a champagne radial bloom + the clay tile gradient.
                background: `radial-gradient(60% 60% at 50% 30%, ${gold(18)} 0%, transparent 80%), linear-gradient(145deg, var(--icon-tile-bg) 0%, color-mix(in srgb, var(--champagne) 5%, var(--card-bg)) 100%)`,
                border: `1px solid ${gold(38)}`,
                boxShadow: `inset 1px 1px 4px var(--clay-hi), inset -2px -2px 5px var(--clay-lo)`,
                transition: 'box-shadow 280ms ease',
              }}
            >
              <Icon
                sx={{
                  fontSize: size.icon,
                  filter: `drop-shadow(0 2px 6px ${gold(50)})`,
                  transition: 'filter 280ms ease',
                }}
              />
            </Box>
          </Box>

          {/* Label block */}
          <Box sx={{ mt: 'auto', textAlign: 'center' }}>
            <Typography
              component="h3"
              sx={(theme) => ({
                ...headingColour(theme),
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: size.title,
                lineHeight: 1.15,
                letterSpacing: '0.01em',
              })}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                color: `color-mix(in srgb, ${MUTED} 85%, transparent)`,
                fontSize: 9.5,
                lineHeight: 1.3,
                mt: 0.3,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {short}
            </Typography>
            <Typography id={descriptionId} sx={visuallyHidden}>{text}</Typography>
          </Box>
        </>
      ) : (
        <>
          <RoleIllustration icon={icon} badge={badge} tilt={tilt} size={size} />
          <Typography component="h3" sx={(theme) => ({ ...headingColour(theme), fontFamily: SERIF, fontWeight: 600, fontSize: size.title, lineHeight: 1.1, mt: 0.25 })}>
            {title}
          </Typography>
          <Typography id={descriptionId} sx={{ color: MUTED, fontSize: size.text, lineHeight: 1.5, maxWidth: 260 }}>
            {text}
          </Typography>
          {/* The call to action is drawn inside the card; the whole card is the button. */}
          <Box
            component="span"
            sx={{
              mt: 'auto',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              pl: { xs: 2.25, md: 1.75 },
              pr: 0.75,
              py: 0.75,
              borderRadius: '999px',
              border: `1px solid ${LINE}`,
              bgcolor: 'var(--card-bg)',
              boxShadow: 'inset 2px 2px 5px var(--clay-lo), inset -2px -2px 5px var(--clay-hi)',
              fontSize: size.cta,
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            Open {title} Demo
            <DemoArrow size={size} />
          </Box>
        </>
      )}
    </ButtonBase>
  );
}

// The public demo: an introduction and one card per role. Choosing a card calls `onDemo(role)`,
// the same one-click sign-in as before; `busy` disables the cards meanwhile.
function DemoShowcase({ organisationName, onDemo, demoError, busy, compact = false, sx }) {
  const layout = compact
    ? { borderRadius: '24px', px: 2.25, py: 2.5, gridTemplateColumns: 'minmax(0, 28fr) minmax(0, 72fr)', gap: 2.5 }
    : {
      borderRadius: '36px',
      p: { xs: 2.5, sm: 4 },
      gridTemplateColumns: '1fr',
      gap: { xs: 3.5, sm: 4 },
      [WIDE]: { p: 4.5, gridTemplateColumns: 'minmax(0, 28fr) minmax(0, 72fr)', gap: 4.5 },
    };
  const cardGrid = compact
    ? { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.5 }
    : {
      gridTemplateColumns: '1fr',
      gap: { xs: 2, sm: 2.5 },
      [TABLET]: {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        // Two columns: the third card takes the next row on its own, centred.
        '& > :nth-of-type(3)': { gridColumn: '1 / -1', justifySelf: 'center', maxWidth: 'calc(50% - 10px)' },
      },
      [DESKTOP]: {
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        '& > :nth-of-type(3)': { gridColumn: 'auto', maxWidth: 'none' },
      },
    };

  return (
    <Box
      id="demo"
      component="section"
      aria-labelledby="demo-title"
      sx={{
        ...panel,
        scrollMarginTop: 24,
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        alignItems: 'center',
        ...layout,
        // A restrained champagne light in one corner.
        backgroundImage: `radial-gradient(60% 80% at 0% 100%, ${gold(9)} 0%, transparent 60%)`,
        ...sx,
      }}
    >
      <Box sx={{ minWidth: 0, ...(compact && { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }) }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography sx={{ ...eyebrow, ...(compact ? { fontSize: 9, letterSpacing: '0.08em', whiteSpace: 'nowrap' } : { letterSpacing: { xs: '0.16em', sm: eyebrow.letterSpacing } }) }}>
            Explore before you sign up
          </Typography>
          {!compact && <Box aria-hidden sx={{ flex: '0 1 56px', height: '1px', bgcolor: GOLD, opacity: 0.7, display: { xs: 'none', sm: 'block' }, [WIDE]: { display: 'none' } }} />}
        </Stack>
        <Typography
          id="demo-title"
          component="h2"
          sx={(theme) => ({
            ...headingColour(theme),
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: compact ? 24 : 'clamp(2.2rem, 3.4vw, 3rem)',
            lineHeight: 1.08,
            letterSpacing: '-0.01em',
            m: 0,
            mt: compact ? 0.75 : 1.5,
          })}
        >
          Try the <Box component="span" sx={{ color: GOLD }}>Demo</Box>
        </Typography>
        <Typography sx={compact ? visuallyHidden : { color: MUTED, fontSize: 16, lineHeight: 1.65, mt: 1.75, maxWidth: 520 }}>
          Explore {organisationName} with sample data and see how StaffSync works. No sign‑up needed,
          and the data resets every night.
        </Typography>

        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            m: 0,
            mt: compact ? 1.25 : 3,
            p: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            ...(compact ? {} : { maxWidth: 520 }),
            borderRadius: compact ? '10px' : '20px',
            border: `1px solid ${LINE}`,
            bgcolor: 'var(--card-bg)',
            boxShadow: 'inset 2px 2px 6px var(--clay-lo), inset -2px -2px 6px var(--clay-hi)',
          }}
        >
          {BENEFITS.map(({ icon: Icon, label }, i) => (
            <Stack
              component="li"
              key={label}
              direction="column"
              sx={{
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: compact ? '3px' : { xs: '4px', sm: '8px' },
                px: compact ? 1 : 1.25,
                py: compact ? 1 : 1.5,
                borderLeft: i ? `1px solid ${LINE}` : 'none',
              }}
            >
              <Icon sx={{ color: GOLD, fontSize: compact ? 14 : 22, flexShrink: 0, display: 'block' }} />
              <Typography sx={{ color: TEXT, fontSize: compact ? 10 : 13.5, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</Typography>
            </Stack>
          ))}
        </Box>

        {demoError && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{demoError}</Alert>}
      </Box>

      <Box sx={{ display: 'grid', ...cardGrid }}>
        {ROLES.map((card) => (
          <RoleCard key={card.role} {...card} compact={compact} disabled={busy} onOpen={onDemo} />
        ))}
      </Box>
    </Box>
  );
}

export default DemoShowcase;
