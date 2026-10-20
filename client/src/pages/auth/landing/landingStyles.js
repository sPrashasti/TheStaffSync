import { keyframes } from '@emotion/react';

// Surfaces of the public landing (login and sign-up). Every colour is one of the theme's own
// CSS variables, so the page follows the light (ivory) and dark (sapphire) themes like the
// rest of the app.
export const GOLD = 'var(--accent-champagne)';
export const TEXT = 'var(--hero-text)';
export const MUTED = 'var(--hero-subtext)';
export const LINE = 'var(--card-border)';
export const LINE_STRONG = 'var(--border-strong)';
export const SERIF = '"Playfair Display", Georgia, serif';

// The office scene behind every public page: night in dark mode, daylight in light mode. It is
// fixed to the screen, so content scrolls over it and the image never stretches past the viewport.
// A wash of the page colour keeps text readable: even on phones, heavier on the left (where the
// copy sits) on larger screens.
const SCENE_NIGHT = "url('/landing/section-night.webp')";
const SCENE_DAY = "url('/landing/section-day.webp')";
const wash = (left, right) =>
  `linear-gradient(90deg, color-mix(in srgb, var(--page-bg) ${left}%, transparent) 0%, color-mix(in srgb, var(--page-bg) ${right}%, transparent) 100%)`;
export const officeScene = (theme) => ({
  position: 'relative',
  isolation: 'isolate',
  bgcolor: 'var(--page-bg)',
  '--scene-wash': { xs: wash(72, 72), md: wash(70, 40) },
  '&::before': {
    content: '""',
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    pointerEvents: 'none',
    backgroundImage: `var(--scene-wash), ${SCENE_NIGHT}`,
    backgroundSize: 'cover',
    backgroundPosition: 'right center',
    ...theme.applyStyles('light', { backgroundImage: `var(--scene-wash), ${SCENE_DAY}` }),
  },
});

// Claymorphism. Surfaces look soft and puffy: a highlight pressed into the top-left, a shade
// into the bottom-right, and a wide soft drop shadow. The four shadow tones are set here per
// theme, on the landing (and the login dialog) only; they add depth and never change the
// theme's own colours. `clayVars` takes the MUI theme: sx={(theme) => ({ ...clayVars(theme) })}.
export const clayDark = {
  // Frosted glass for the sign-in panel (see frostedPanel below).
  '--glass-bg': 'rgba(14, 23, 36, 0.42)',
  '--glass-border': 'rgba(255, 255, 255, 0.14)',
  '--glass-highlight': 'rgba(255, 255, 255, 0.10)',
  '--glass-shadow': 'rgba(0, 0, 0, 0.38)',
  '--glass-field': 'rgba(255, 255, 255, 0.06)',
  '--glass-field-border': 'rgba(255, 255, 255, 0.16)',
  // Opaque stand-in for the glass field, painted over the browser's autofill colour.
  '--glass-autofill': '#18222f',
  '--clay-hi': 'rgba(255, 255, 255, 0.07)',
  '--clay-lo': 'rgba(0, 0, 0, 0.42)',
  '--clay-drop': 'rgba(0, 0, 0, 0.5)',
  '--clay-glow': 'rgba(120, 171, 203, 0.05)',
};
const clayLight = {
  '--glass-bg': 'rgba(255, 253, 248, 0.48)',
  '--glass-border': 'rgba(255, 255, 255, 0.75)',
  '--glass-highlight': 'rgba(255, 255, 255, 0.85)',
  '--glass-shadow': 'rgba(63, 52, 38, 0.16)',
  '--glass-field': 'rgba(255, 255, 255, 0.55)',
  '--glass-field-border': 'rgba(92, 78, 60, 0.18)',
  '--glass-autofill': '#f7f2ea',
  '--clay-hi': 'rgba(255, 255, 255, 0.9)',
  '--clay-lo': 'rgba(128, 103, 71, 0.16)',
  '--clay-drop': 'rgba(63, 52, 38, 0.16)',
  '--clay-glow': 'rgba(255, 255, 255, 0.75)',
};
export const clayVars = (theme) => ({ ...clayDark, ...theme.applyStyles('light', clayLight) });

const clayShadow = (lift) =>
  [
    `${lift}px ${lift}px ${lift * 2.4}px var(--clay-drop)`,
    `-${lift * 0.6}px -${lift * 0.6}px ${lift * 1.8}px var(--clay-glow)`,
    'inset 3px 3px 7px var(--clay-hi)',
    'inset -4px -4px 10px var(--clay-lo)',
  ].join(', ');

// Glassmorphism for the sign-in panel: a translucent pane that blurs the office scene behind
// it, with a fine light edge and a soft shadow.
export const frostedPanel = {
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(20px) saturate(140%)',
  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  border: '1px solid var(--glass-border)',
  boxShadow: '0 24px 60px var(--glass-shadow), inset 0 1px 0 var(--glass-highlight)',
};

// A lighter pane inside the glass panel (fields, the tab track).
export const frostedInset = {
  bgcolor: 'var(--glass-field)',
  border: '1px solid var(--glass-field-border)',
};

// Quieter clay panels (the demo panel and feature cards): the theme's card surface.
export const panel = {
  bgcolor: 'var(--card-bg)',
  border: 'none',
  boxShadow: clayShadow(10),
};

// A clay button: puffed at rest, lifts on hover, presses in when clicked.
export const clayButton = {
  bgcolor: 'var(--card-bg)',
  border: 'none',
  boxShadow: clayShadow(6),
  transition: 'box-shadow 200ms ease, transform 200ms ease',
  '&:hover': { bgcolor: 'var(--card-bg)', border: 'none', transform: 'translateY(-2px)', boxShadow: clayShadow(9) },
  '&:active': { transform: 'translateY(0)', boxShadow: 'inset 4px 4px 8px var(--clay-lo), inset -3px -3px 7px var(--clay-hi)' },
};

// The metallic call to action keeps its gradient and gains the same soft clay depth.
export const clayPremium = {
  boxShadow: `inset 2px 2px 5px rgba(255, 255, 255, 0.5), inset -3px -3px 7px rgba(80, 60, 30, 0.35), 8px 8px 20px var(--clay-drop)`,
  '&:active': { boxShadow: 'inset 4px 4px 9px rgba(80, 60, 30, 0.45)', transform: 'translateY(0)' },
};

// A round, puffy clay icon tile with a champagne icon.
export const iconTile = (size) => ({
  flexShrink: 0,
  width: size,
  height: size,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  bgcolor: 'var(--icon-tile-bg)',
  boxShadow: 'inset 2px 2px 5px var(--clay-hi), inset -3px -3px 6px var(--clay-lo), 4px 4px 10px var(--clay-drop)',
  color: GOLD,
});

// Laptop screens: below this height the hero tightens up so it still fits the first screen.
export const SHORT = '@media (min-width: 900px) and (max-height: 900px)';
// The common 1366×768 laptop: a little tighter still.
export const SHORTER = '@media (min-width: 900px) and (max-height: 800px)';

// Expand on scroll: a section or card grows from slightly smaller and faded to full size as it
// scrolls into view, driven by the scroll position itself (CSS scroll-driven animation, no script).
// Browsers without it, and visitors who prefer reduced motion, simply see the content as normal.
// The range is measured against the element itself, so a card always finishes once it is fully on
// screen (even at the very bottom of the page); `step` staggers the cards in a row, and `tall`
// sections finish once about a third of them has entered.
const expandIn = keyframes`
  from { opacity: 0; transform: translateY(28px) scale(0.9); }
  to { opacity: 1; transform: none; }
`;
export const expandOnScroll = (step = 0, { tall = false } = {}) => ({
  '@supports (animation-timeline: view())': {
    '@media (prefers-reduced-motion: no-preference)': {
      animation: `${expandIn} linear both`,
      animationTimeline: 'view()',
      animationRange: tall ? 'entry 0% entry 35%' : `entry ${step * 8}% entry ${Math.min(100, 70 + step * 10)}%`,
    },
  },
});
