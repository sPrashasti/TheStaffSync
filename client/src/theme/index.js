import { createTheme } from '@mui/material/styles';
import { dark, fonts, gradients, light, semantic, toCssVariables } from './tokens';

// StaffSync theme: light (ivory, sage, sapphire) and dark (noir, sapphire, ivory) colour
// schemes from theme/tokens.js. The <html> element gets class "light" or "dark", which also
// switches the --token CSS variables used in sx props.

const lightPalette = {
  primary: { main: light.sapphire, dark: light.navy, light: '#1B4B73', contrastText: light.ivory },
  secondary: { main: light.olive, dark: light['sage-dark'], light: light.sage, contrastText: light['surface-elevated'] },
  success: { main: light['sage-dark'], light: light.sage, contrastText: light.ivory },
  warning: { main: light['champagne-dark'], light: light.champagne, contrastText: light['surface-elevated'] },
  info: { main: light['ice-blue-dark'], light: light['ice-blue'], contrastText: light.navy },
  error: { main: light.burgundy, contrastText: light.ivory },
  background: { default: light['bg-primary'], paper: light['surface-primary'] },
  text: { primary: light['text-primary'], secondary: light['text-secondary'], disabled: light['text-muted'] },
  divider: light['border-light'],
};

// In dark mode "primary" text, links and focus use ice blue for contrast on noir; contained
// primary buttons are restyled to sapphire below.
const darkPalette = {
  primary: { main: dark['ice-blue'], dark: dark['ice-blue-dark'], light: dark['ice-blue-light'], contrastText: dark.navy },
  secondary: { main: dark.sage, dark: dark.olive, light: dark['sage-text'], contrastText: dark.ivory },
  success: { main: dark['sage-text'], light: dark.sage, contrastText: dark['bg-primary'] },
  warning: { main: dark['champagne-light'], light: dark.champagne, contrastText: dark['bg-primary'] },
  info: { main: dark['ice-blue'], light: dark['ice-blue-light'], contrastText: dark.navy },
  error: { main: dark['burgundy-text'], dark: dark.burgundy, contrastText: dark['bg-primary'] },
  background: { default: dark['bg-primary'], paper: dark['surface-primary'] },
  text: { primary: dark['text-primary'], secondary: dark['text-secondary'], disabled: dark['text-muted'] },
  divider: dark['border-dark'],
};

const transition = 'background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease, color 200ms ease';

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: fonts.ui,
    h1: { fontFamily: fonts.display, fontWeight: 600 },
    h2: { fontFamily: fonts.display, fontWeight: 600 },
    h3: { fontFamily: fonts.display, fontWeight: 600 },
    h4: { fontFamily: fonts.display, fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontFamily: fonts.display, fontWeight: 600, letterSpacing: '-0.005em' },
    h6: { fontFamily: fonts.display, fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    overline: { letterSpacing: '0.12em', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root, .light': { ...toCssVariables(light), ...toCssVariables(semantic.light), colorScheme: 'light' },
        '.dark': { ...toCssVariables(dark), ...toCssVariables(semantic.dark), colorScheme: 'dark' },
        // --metal and the dark text that sits on it are the same in both modes.
        ':root': { '--metal': gradients.champagneMetallic, '--on-metal': light['text-primary'] },
        body: {
          backgroundColor: 'var(--page-bg)',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::selection': { backgroundColor: 'var(--champagne-light, #D9C3A1)', color: '#211E1A' },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': { transition: 'none !important', animation: 'none !important' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        // Dark mode would otherwise lighten raised surfaces with a white overlay.
        root: { backgroundImage: 'none' },
        outlined: { borderColor: 'var(--card-border)' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: { root: { paddingTop: 14, paddingBottom: 14 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, transition },
        containedPrimary: {
          backgroundColor: 'var(--button-primary-bg)',
          color: 'var(--button-primary-text)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          '&:hover': { backgroundColor: 'var(--button-primary-hover)', transform: 'translateY(-1px)' },
        },
        containedSecondary: { '&:hover': { transform: 'translateY(-1px)' } },
        outlined: {
          borderColor: 'var(--border-strong)',
          backgroundColor: 'var(--button-secondary-bg)',
          '&:hover': { borderColor: 'var(--champagne)', backgroundColor: 'var(--hover-tint)' },
        },
      },
      // variant="premium": the champagne metallic call to action. One per page at most.
      variants: [
        {
          props: { variant: 'premium' },
          style: {
            background: gradients.champagneMetallic,
            backgroundSize: '160% 100%',
            backgroundPosition: '0% 50%',
            color: '#211E1A',
            border: '1px solid rgba(128, 103, 71, 0.45)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 6px 18px rgba(128, 103, 71, 0.22)',
            padding: '6px 18px',
            transition: `${transition}, background-position 400ms ease`,
            '&:hover': { backgroundPosition: '45% 50%', transform: 'translateY(-1px)' },
            '&.Mui-disabled': { opacity: 0.55, color: '#211E1A' },
          },
        },
        { props: { variant: 'premium', size: 'large' }, style: { padding: '9px 24px', fontSize: '0.95rem' } },
        { props: { variant: 'premium', size: 'small' }, style: { padding: '3px 12px', fontSize: '0.8rem' } },
      ],
    },
    MuiIconButton: {
      styleOverrides: { root: { transition } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--input-bg)',
          transition,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-subtle)', transition },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-strong)' },
          '&.Mui-focused': { boxShadow: '0 0 0 3px var(--focus-ring)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1 },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'var(--table-head)',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.78rem',
            letterSpacing: '0.03em',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderBottom: '1px solid var(--border-subtle)' } },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { transition, '&.MuiTableRow-hover:hover': { backgroundColor: 'var(--hover-tint)' } },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'var(--modal-bg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--elevated-shadow)',
          borderRadius: 16,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontFamily: fonts.display, fontWeight: 600 } },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { backgroundColor: 'var(--modal-bg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--elevated-shadow)' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { backgroundColor: 'var(--modal-bg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--elevated-shadow)' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--border-subtle)' },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { borderBottom: '1px solid var(--border-subtle)' },
        indicator: { height: 2, background: gradients.champagneMetallic },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { color: 'var(--text-secondary)', transition, '&.Mui-selected': { color: 'var(--text-primary)' } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, borderRadius: 999 },
        outlined: { borderColor: 'var(--border-strong)' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: 'var(--progress-track)', borderRadius: 999 },
        bar: { borderRadius: 999 },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: '#0B1728', color: '#F7F2E8', fontSize: '0.75rem', border: '1px solid rgba(226, 199, 158, 0.18)' },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: 'var(--border-subtle)' } },
    },
    MuiListItemButton: {
      styleOverrides: { root: { transition } },
    },
  },
});

export default theme;
