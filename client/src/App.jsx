import { useEffect } from 'react';
import { Button } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import FullPageMessage from './components/FullPageMessage';
import AppRoutes from './routes/AppRoutes';
import { setPlatformUnauthorizedHandler, setUnauthorizedHandler } from './services/api';
import { platformSessionExpired } from './store/platformSlice';
import { loadSession, selectAuth, sessionExpired } from './store/authSlice';

function App() {
  const dispatch = useDispatch();
  const { status, notice } = useSelector(selectAuth);

  // Any 401 from the API (expired token, deactivated account) signs the user out everywhere.
  useEffect(() => {
    setUnauthorizedHandler((message) => dispatch(sessionExpired(message)));
    setPlatformUnauthorizedHandler((message) => dispatch(platformSessionExpired(message)));
    return () => {
      setUnauthorizedHandler(null);
      setPlatformUnauthorizedHandler(null);
    };
  }, [dispatch]);

  if (status === 'checking') return <FullPageMessage loading>Loading StaffSync…</FullPageMessage>;

  if (status === 'unavailable') {
    return (
      <FullPageMessage
        title="Can't reach StaffSync"
        action={<Button variant="contained" onClick={() => dispatch(loadSession())}>Try again</Button>}
      >
        {notice}
      </FullPageMessage>
    );
  }

  return <AppRoutes />;
}

export default App;
