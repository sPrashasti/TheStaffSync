import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import FullPageMessage from '../components/FullPageMessage';
import { selectPlatform } from '../store/platformSlice';

// Platform console pages: platform admins only, with their own session (see platformSlice).
// The API enforces this itself; the guard just avoids showing pages that would fail.
export function RequirePlatform() {
  const { status } = useSelector(selectPlatform);
  if (status === 'checking') return <FullPageMessage loading>Loading the platform console…</FullPageMessage>;
  if (status !== 'authenticated') return <Navigate to="/platform/login" replace />;
  return <Outlet />;
}

// The platform login page, for signed-out operators only.
export function PlatformPublicOnly() {
  const { status } = useSelector(selectPlatform);
  if (status === 'checking') return <FullPageMessage loading>Loading the platform console…</FullPageMessage>;
  if (status === 'authenticated') return <Navigate to="/platform/dashboard" replace />;
  return <Outlet />;
}
