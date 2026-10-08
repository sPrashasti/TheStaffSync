import { useState } from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PublicIcon from '@mui/icons-material/Public';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, Outlet } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import NotificationBell from '../components/NotificationBell';
import ThemeToggle from '../components/ThemeToggle';
import { logout, selectOrganisation, selectUser } from '../store/authSlice';
import { DISPLAY_TIME_ZONES, selectDisplayTimeZone, setDisplayTimeZone } from '../store/preferencesSlice';
import { NAVIGATION, ROLE_LABELS } from '../routes/navigation';

const DRAWER_WIDTH = 240;

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// Signed-in shell: top bar, role menu (permanent on desktop, slide-out on mobile) and the page.
function AppLayout() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const organisation = useSelector(selectOrganisation);
  const displayTimeZone = useSelector(selectDisplayTimeZone);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(null);
  const items = NAVIGATION[user.role];

  const menu = (
    <Box>
      <Toolbar sx={{ px: 2.5 }}>
        <BrandMark />
      </Toolbar>
      {/* Which company's data this is: matters to anyone who works with several. */}
      <Typography variant="body2" color="text.secondary" noWrap title={organisation?.name} sx={{ px: 2.5, pb: 1.5, fontWeight: 600 }}>
        {organisation?.name}
      </Typography>
      <Divider />
      <List component="nav" aria-label="Main menu" sx={{ py: 1.5 }}>
        {items.map(({ path, label, icon: Icon }) => (
          <ListItemButton
            key={path}
            component={NavLink}
            to={`/${user.role}/${path}`}
            onClick={() => setMobileOpen(false)}
            sx={{
              mx: 1.5,
              my: 0.25,
              borderRadius: '8px',
              position: 'relative',
              color: 'var(--text-secondary)',
              '&:hover': { bgcolor: 'var(--hover-tint)', color: 'var(--text-primary)' },
              // Active page: sapphire tint with a thin champagne metallic bar on the left.
              '&.active': {
                bgcolor: 'var(--nav-active-bg)',
                color: 'var(--nav-active-text)',
                fontWeight: 600,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: 3,
                  background: 'var(--metal)',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><Icon /></ListItemIcon>
            <ListItemText primary={label} slotProps={{ primary: { fontWeight: 'inherit', fontSize: '0.93rem' } }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: 'var(--appbar-bg)',
          borderBottom: '1px solid var(--border-subtle)',
          // Frosted bar on larger screens only; blur is costly on phones.
          backdropFilter: { md: 'saturate(140%) blur(10px)' },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" aria-label="Open menu" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Time zone used to show times">
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <PublicIcon fontSize="small" color="action" sx={{ display: { xs: 'none', sm: 'block' } }} />
              <TextField
                select
                size="small"
                variant="standard"
                value={displayTimeZone}
                onChange={(e) => dispatch(setDisplayTimeZone(e.target.value))}
                slotProps={{ htmlInput: { 'aria-label': 'Display time zone' } }}
                sx={{ minWidth: { xs: 110, sm: 170 } }}
              >
                {DISPLAY_TIME_ZONES.map((z) => <MenuItem key={z.value} value={z.value}>{z.label}</MenuItem>)}
              </TextField>
            </Stack>
          </Tooltip>

          <ThemeToggle />
          <NotificationBell />

          <IconButton onClick={(e) => setUserMenu(e.currentTarget)} aria-label="Account menu">
            <Avatar sx={{ width: 34, height: 34, background: 'var(--metal)', color: 'var(--on-metal)', fontSize: 14, fontWeight: 700 }}>{initials(user.name)}</Avatar>
          </IconButton>
          <Menu anchorEl={userMenu} open={Boolean(userMenu)} onClose={() => setUserMenu(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography fontWeight={600}>{user.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              <Typography variant="caption" color="text.secondary">{ROLE_LABELS[user.role]}{organisation && ` · ${organisation.name}`}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => dispatch(logout())}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Log out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {menu}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          {menu}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, sm: 3, lg: 4 }, bgcolor: 'var(--page-bg)' }}>
        <Toolbar />
        {organisation?.isDemo && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You are exploring the StaffSync demo as {ROLE_LABELS[user.role]}. Try anything: changes are visible to other visitors and reset every night at 03:00.
          </Alert>
        )}
        <Outlet />
      </Box>
    </Box>
  );
}

export default AppLayout;
