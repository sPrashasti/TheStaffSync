import { lazy, Suspense } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import { Link as RouterLink, Navigate, Route, Routes } from 'react-router-dom';
import FullPageMessage from '../components/FullPageMessage';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import { PublicOnly, RequireAuth, RequireRole, RoleHome } from './guards';
import { PlatformPublicOnly, RequirePlatform } from './platformGuards';
import { NAVIGATION } from './navigation';
import pages from './pages';

// The StaffSync platform console (operators only). Loaded on first visit, so company users never
// download it.
const PlatformLoginPage = lazy(() => import('../pages/platform/PlatformLoginPage'));
const PlatformLayout = lazy(() => import('../pages/platform/PlatformLayout'));
const PLATFORM_PAGES = {
  dashboard: lazy(() => import('../pages/platform/PlatformDashboardPage')),
  organisations: lazy(() => import('../pages/platform/PlatformOrganisationsPage')),
  'organisations/:id': lazy(() => import('../pages/platform/PlatformOrganisationPage')),
  audit: lazy(() => import('../pages/platform/PlatformAuditPage')),
  account: lazy(() => import('../pages/platform/PlatformAccountPage')),
};

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
        <Route path="/signup" element={<SignupPage />} />
        {/* Employees no longer register themselves; old links lead to company sign-up. */}
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      {/* Reachable while signed in too: the emailed link may be opened in a browser that has a session. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

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

      {/* Platform console: its own login and session, separate from organisation accounts. */}
      <Route path="/platform" element={<Suspense fallback={<PageLoading />}><RequirePlatform /></Suspense>}>
        <Route element={<PlatformLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          {Object.entries(PLATFORM_PAGES).map(([path, Page]) => (
            <Route key={path} path={path} element={<Suspense fallback={<PageLoading />}><Page /></Suspense>} />
          ))}
        </Route>
      </Route>
      <Route element={<PlatformPublicOnly />}>
        <Route path="/platform/login" element={<Suspense fallback={<PageLoading />}><PlatformLoginPage /></Suspense>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
