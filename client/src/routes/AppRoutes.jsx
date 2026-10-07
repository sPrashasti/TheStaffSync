import { Suspense } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import { Link as RouterLink, Navigate, Route, Routes } from 'react-router-dom';
import FullPageMessage from '../components/FullPageMessage';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import { PublicOnly, RequireAuth, RequireRole, RoleHome } from './guards';
import { NAVIGATION } from './navigation';
import pages from './pages';

function NotFound() {
  return (
    <FullPageMessage
      title="Page not found"
      action={<Button variant="contained" component={RouterLink} to="/">Go home</Button>}
    >
      The page you were looking for does not exist.
    </FullPageMessage>
  );
}

function PageLoading() {
  return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress aria-label="Loading page" /></Box>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/" element={<RoleHome />} />
        <Route element={<AppLayout />}>
          {Object.entries(NAVIGATION).map(([role, items]) => (
            <Route key={role} path={`/${role}`} element={<RequireRole role={role} />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              {items.map(({ path, page }) => {
                const Page = pages[page];
                return <Route key={path} path={path} element={<Suspense fallback={<PageLoading />}><Page /></Suspense>} />;
              })}
            </Route>
          ))}
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
