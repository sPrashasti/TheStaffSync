// StaffSync design tokens: the single source of truth for colour. The MUI theme (theme/index.js)
// and the global CSS variables (--bg-primary, --champagne, …) are both generated from these, so
// components never hard-code colours.

export const light = {
  'bg-primary': '#F4EFE6',
  'bg-secondary': '#EAE1D3',
  'bg-tertiary': '#DED2C0',

  'surface-primary': '#FBF8F2',
  'surface-secondary': '#F0E9DE',
  'surface-elevated': '#FFFDF8',

  'text-primary': '#211E1A',
  'text-secondary': '#5E574D',
  'text-muted': '#8B8173',

  champagne: '#B89A70',
  'champagne-light': '#D9C3A1',
  'champagne-dark': '#806747',

  ivory: '#F7F2E8',
  cream: '#E9DECD',
  beige: '#D8C6AD',

  sage: '#7B7D67',
  'sage-dark': '#555744',
  olive: '#66674F',

  'ice-blue': '#AFC9D8',
  'ice-blue-light': '#D7E7EF',
  'ice-blue-dark': '#7699AD',

  navy: '#0B1728',
  sapphire: '#102C4A',
  noir: '#101010',

  // Muted burgundy for danger states, chosen to sit with the warm palette.
  burgundy: '#8A3A3A',
  'burgundy-light': '#E9D3CF',

  'border-light': 'rgba(92, 78, 60, 0.14)',
  'border-medium': 'rgba(92, 78, 60, 0.24)',

  'shadow-soft': 'rgba(63, 52, 38, 0.10)',
  'shadow-luxury': 'rgba(63, 52, 38, 0.18)',
};

export const dark = {
  'bg-primary': '#05070B',
  'bg-secondary': '#080E18',
  'bg-tertiary': '#0D1624',

  'surface-primary': '#0A101A',
  'surface-secondary': '#0E1724',
  'surface-elevated': '#121E2D',

  'text-primary': '#F4EEE4',
  'text-secondary': '#C7BDAE',
  'text-muted': '#8D877E',

  sapphire: '#09213A',
  'sapphire-mid': '#10365A',
  'sapphire-bright': '#1B4B73',

  navy: '#071322',
  'navy-light': '#10243A',

  'ice-blue': '#A9C7D8',
  'ice-blue-light': '#D5E6EE',
  'ice-blue-dark': '#6E93A9',

  champagne: '#C3A477',
  'champagne-light': '#E0C79E',
  'champagne-bright': '#F1DDB9',
  'champagne-dark': '#856A47',

  cream: '#E6D8C5',
  ivory: '#F5EFE4',
  beige: '#CDBBA1',

  sage: '#737761',
  olive: '#555944',
  'olive-dark': '#303529',
  // Lighter tint of sage for small success text, so it stays readable on noir.
  'sage-text': '#A3A68C',

  noir: '#020305',

  burgundy: '#B9645F',
  'burgundy-text': '#E0A39D',

  'border-dark': 'rgba(226, 199, 158, 0.13)',
  'border-sapphire': 'rgba(120, 171, 203, 0.16)',

  'shadow-dark': 'rgba(0, 0, 0, 0.45)',
  'shadow-blue': 'rgba(8, 39, 68, 0.35)',
};

// Gradients. Used sparingly: metallic for the brand mark, active indicators and one main action
// per page; satin for large decorative surfaces only.
export const gradients = {
  champagneMetallic:
    'linear-gradient(110deg, #765C3E 0%, #A88458 17%, #D1B486 32%, #F2DDB8 47%, #B99668 61%, #806442 78%, #D5BA8C 100%)',
  ivorySilk:
    'linear-gradient(120deg, #CFC0A9 0%, #E9DECD 19%, #FFFDF7 39%, #F4ECE0 53%, #D8C6AD 69%, #FAF5EB 84%, #C9B9A2 100%)',
  sapphireSilk:
    'linear-gradient(125deg, #020407 0%, #07101D 17%, #102B47 34%, #061321 48%, #164465 61%, #081625 76%, #020407 100%)',
  noirSilk:
    'linear-gradient(120deg, #010203 0%, #090B0E 20%, #1A1D20 37%, #050608 52%, #111419 67%, #020304 84%, #0B0D10 100%)',
};

export const shadows = {
  light: '0 12px 35px rgba(63, 52, 38, 0.10)',
  dark: '0 18px 50px rgba(0, 0, 0, 0.35)',
  insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
};

export const fonts = {
  display: '"Playfair Display", "Cormorant Garamond", Georgia, "Times New Roman", serif',
  ui: '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

// Semantic roles used by components. Each points at palette values for that mode, so a component
// writes var(--card-bg) once and gets the right colour in both themes.
export const semantic = {
  light: {
    'page-bg': light['bg-primary'],
    'card-bg': light['surface-primary'],
    'card-border': light['border-light'],
    'card-shadow': '0 1px 2px rgba(63, 52, 38, 0.05), 0 10px 30px rgba(63, 52, 38, 0.06)',
    'elevated-bg': light['surface-elevated'],
    'elevated-shadow': shadows.light,
    'modal-bg': light['surface-elevated'],
    'input-bg': light['surface-primary'],
    'border-subtle': light['border-light'],
    'border-strong': light['border-medium'],
    'table-head': light['surface-secondary'],
    'hover-tint': 'rgba(175, 201, 216, 0.16)',
    'focus-ring': 'rgba(16, 44, 74, 0.18)',
    'sidebar-bg': light.ivory,
    'appbar-bg': 'rgba(255, 253, 248, 0.86)',
    'nav-active-bg': 'rgba(16, 44, 74, 0.07)',
    'nav-active-text': light.sapphire,
    'button-primary-bg': light.sapphire,
    'button-primary-hover': light.navy,
    'button-primary-text': light.ivory,
    'button-secondary-bg': light['surface-secondary'],
    'progress-track': light.cream,
    'hero-silk': gradients.ivorySilk,
    'hero-text': light['text-primary'],
    'hero-subtext': light['text-secondary'],
    'icon-tile-bg': light['surface-secondary'],
    // Status tones: soft background, readable text, solid dot.
    'tone-success-bg': 'rgba(123, 125, 103, 0.16)',
    'tone-success-fg': light['sage-dark'],
    'tone-success-dot': light.sage,
    'tone-warning-bg': 'rgba(184, 154, 112, 0.11)',
    'tone-warning-fg': light['champagne-dark'],
    'tone-warning-dot': light.champagne,
    'tone-danger-bg': 'rgba(138, 58, 58, 0.10)',
    'tone-danger-fg': light.burgundy,
    'tone-danger-dot': light.burgundy,
    'tone-info-bg': 'rgba(175, 201, 216, 0.32)',
    'tone-info-fg': light.sapphire,
    'tone-info-dot': light['ice-blue-dark'],
    'tone-neutral-bg': 'rgba(92, 78, 60, 0.07)',
    'tone-neutral-fg': light['text-secondary'],
    'tone-neutral-dot': light['text-muted'],
    // Stat-card icon accents (muted).
    'accent-sapphire': light.sapphire,
    // Ice accent: the tile carries the ice blue; the icon stays sapphire so it is legible.
    'accent-ice': light.sapphire,
    'accent-ice-tile': light['ice-blue-light'],
    'accent-sage': light['sage-dark'],
    'accent-champagne': light['champagne-dark'],
    'accent-olive': light.olive,
    'accent-burgundy': light.burgundy,
  },
  dark: {
    'page-bg': dark['bg-primary'],
    'card-bg': dark['surface-primary'],
    'card-border': dark['border-sapphire'],
    'card-shadow': `0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 12px 36px ${dark['shadow-dark']}`,
    'elevated-bg': dark['surface-elevated'],
    'elevated-shadow': shadows.dark,
    'modal-bg': dark['surface-secondary'],
    'input-bg': dark['surface-primary'],
    'border-subtle': dark['border-dark'],
    'border-strong': 'rgba(226, 199, 158, 0.24)',
    'table-head': dark['surface-secondary'],
    'hover-tint': 'rgba(120, 171, 203, 0.07)',
    'focus-ring': 'rgba(169, 199, 216, 0.22)',
    'sidebar-bg': dark['bg-secondary'],
    'appbar-bg': 'rgba(7, 19, 34, 0.88)',
    'nav-active-bg': dark.sapphire,
    'nav-active-text': dark.ivory,
    'button-primary-bg': dark['sapphire-bright'],
    'button-primary-hover': dark['sapphire-mid'],
    'button-primary-text': dark.ivory,
    'button-secondary-bg': dark.sapphire,
    'progress-track': dark['navy-light'],
    'hero-silk': gradients.sapphireSilk,
    'hero-text': dark.ivory,
    'hero-subtext': dark['text-secondary'],
    'icon-tile-bg': dark['navy-light'],
    'tone-success-bg': 'rgba(115, 119, 97, 0.24)',
    'tone-success-fg': dark['sage-text'],
    'tone-success-dot': dark['sage-text'],
    'tone-warning-bg': 'rgba(195, 164, 119, 0.16)',
    'tone-warning-fg': dark['champagne-light'],
    'tone-warning-dot': dark.champagne,
    'tone-danger-bg': 'rgba(185, 100, 95, 0.16)',
    'tone-danger-fg': dark['burgundy-text'],
    'tone-danger-dot': dark.burgundy,
    'tone-info-bg': 'rgba(169, 199, 216, 0.13)',
    'tone-info-fg': dark['ice-blue-light'],
    'tone-info-dot': dark['ice-blue'],
    'tone-neutral-bg': 'rgba(245, 239, 228, 0.06)',
    'tone-neutral-fg': dark['text-secondary'],
    'tone-neutral-dot': dark['text-muted'],
    'accent-sapphire': dark['ice-blue'],
    'accent-ice': dark['ice-blue-light'],
    'accent-sage': dark['sage-text'],
    'accent-champagne': dark['champagne-light'],
    'accent-olive': dark.cream,
    'accent-burgundy': dark['burgundy-text'],
  },
};

// Turns a token set into CSS custom properties: { '--bg-primary': '#F4EFE6', … }.
export const toCssVariables = (tokens) =>
  Object.fromEntries(Object.entries(tokens).map(([name, value]) => [`--${name}`, value]));
