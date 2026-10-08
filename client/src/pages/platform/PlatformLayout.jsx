import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import MenuIcon from '@mui/icons-material/Menu';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, Outlet } from 'react-router-dom';
import BrandMark from '../../components/BrandMark';
import ThemeToggle from '../../components/ThemeToggle';
import { platformLogout, selectPlatform } from '../../store/platformSlice';

const DRAWER_WIDTH = 248;

const PLATFORM_MENU = [
  { path: '/platform/dashboard', label: 'Overview', icon: DashboardIcon },
  { path: '/platform/organisations', label: 'Organisations', icon: ApartmentIcon },
  { path: '/platform/audit', label: 'Audit log', icon: HistoryIcon },
  { path: '/platform/account', label: 'My account', icon: ManageAccountsIcon },
];

// The platform console shell. Deliberately separate from the organisation app's layout: a
// different kind of account, a different menu, and a label saying so on every page.
function PlatformLayout() {
  const dispatch = useDispatch();
  const { admin } = useSelector(selectPlatform);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(null);

  const menu = (
    <Box>
      <Toolbar sx={{ px: 2.5 }}>
        <BrandMark />
      </Toolbar>
      <Box sx={{ px: 2.5, pb: 1.5 }}>
        <Chip size="small" label="Platform console" color="primary" variant="outlined" />
      </Box>
      <Divider />
      <List component="nav" aria-label="Platform menu" sx={{ py: 1.5 }}>
        {PLATFORM_MENU.map(({ path, label, icon: Icon }) => (
          <ListItemButton
            key={path}
            component={NavLink}
            to={path}
            onClick={() => setMobileOpen(false)}
            sx={{ mx: 1.5, borderRadius: 2, '&.active': { bgcolor: 'action.selected', fontWeight: 600 } }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}><Icon fontSize="small" /></ListItemIcon>
            <ListItemText primary={label} />
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
        sx={{ borderBottom: '1px solid var(--border-subtle)', width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` } }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" aria-label="Open menu" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>StaffSync platform</Typography>
          <ThemeToggle />
          <IconButton onClick={(e) => setUserMenu(e.currentTarget)} aria-label="Account menu">
            <Avatar sx={{ width: 34, height: 34, background: 'var(--metal)', color: 'var(--on-metal)', fontSize: 14, fontWeight: 700 }}>
              {(admin?.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={userMenu} open={Boolean(userMenu)} onClose={() => setUserMenu(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>{admin?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{admin?.email}</Typography>
              <Typography variant="caption" color="text.secondary">Platform admin</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => dispatch(platformLogout())}>
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
        <Outlet />
      </Box>
    </Box>
  );
}

export default PlatformLayout;
