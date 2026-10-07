import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { Link as RouterLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import FullPageMessage from '../components/FullPageMessage';
import { selectAuth } from '../store/authSlice';
import { homePathFor } from './navigation';

// Logged-in users only; others go to /login and come back afterwards.
// This is for convenience; the API enforces every permission itself.
export function RequireAuth() {
  const { status } = useSelector(selectAuth);
  const location = useLocation();
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// Pages under /<role>/ are only for that role.
export function RequireRole({ role }) {
  const { user } = useSelector(selectAuth);
  if (user.role !== role) {
    return (
      <FullPageMessage
        title="You don't have access to this page"
        action={<Button variant="contained" component={RouterLink} to={homePathFor(user.role)}>Go to my dashboard</Button>}
      >
        This area is for a different role.
      </FullPageMessage>
    );
  }
  return <Outlet />;
}

// Login and register are for signed-out visitors; signed-in users go to their dashboard.
export function PublicOnly() {
  const { status, user } = useSelector(selectAuth);
  if (status === 'authenticated') return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}

// "/" sends each role to its own dashboard.
export function RoleHome() {
  const { user } = useSelector(selectAuth);
  return <Navigate to={homePathFor(user.role)} replace />;
}
