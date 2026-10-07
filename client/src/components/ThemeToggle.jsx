import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useColorScheme } from '@mui/material/styles';

// Switches between the light (ivory) and dark (noir and sapphire) themes. MUI remembers the
// choice on this device.
function ThemeToggle({ sx }) {
  const { mode, systemMode, setMode } = useColorScheme();
  const current = mode === 'system' ? systemMode : mode;
  if (!current) return null; // Not known until the first client render.
  const next = current === 'dark' ? 'light' : 'dark';

  return (
    <Tooltip title={next === 'dark' ? 'Dark theme' : 'Light theme'}>
      <IconButton onClick={() => setMode(next)} aria-label={`Switch to ${next} theme`} sx={sx}>
        {current === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ThemeToggle;
