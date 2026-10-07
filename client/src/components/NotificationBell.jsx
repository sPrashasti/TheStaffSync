import { useEffect, useState } from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { getNotifications } from '../services/notificationService';
import { selectUser } from '../store/authSlice';

const POLL_MS = 60000;

// Unread count in the top bar, refreshed every minute and whenever the page changes.
function NotificationBell() {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => getNotifications({ limit: 1 })
      .then((data) => { if (!cancelled) setUnread(data.unreadCount); })
      .catch(() => { /* The badge is a convenience; ignore failures. */ });
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [location.pathname]);

  return (
    <Tooltip title="Notifications">
      <IconButton
        aria-label={`Notifications, ${unread} unread`}
        onClick={() => navigate(`/${user.role}/notifications`)}
      >
        <Badge badgeContent={unread} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}

export default NotificationBell;
