import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import EventNoteIcon from '@mui/icons-material/EventNote';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SchoolIcon from '@mui/icons-material/School';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import LoadState from '../../components/LoadState';
import PageHeader from '../../components/PageHeader';
import Pager from '../../components/Pager';
import { useApi } from '../../hooks/useApi';
import { useSnackbar } from '../../hooks/useSnackbar';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/notificationService';
import { selectUser } from '../../store/authSlice';
import { selectDisplayTimeZone } from '../../store/preferencesSlice';
import { formatDateTime } from '../../utils/format';

const ICONS = { leave: EventNoteIcon, announcement: CampaignIcon, training: SchoolIcon };
// Where a notification about each kind of record leads, relative to /<role>/.
const TARGETS = { Leave: 'leaves', Announcement: 'announcements', Training: 'training' };

function NotificationsPage() {
  const toast = useSnackbar();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const displayTimeZone = useSelector(selectDisplayTimeZone);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [paging, setPaging] = useState({ page: 1, limit: 20 });
  const { data, loading, error, reload } = useApi(
    () => getNotifications({ ...paging, ...(unreadOnly && { isRead: 'false' }) }),
    [paging, unreadOnly],
  );

  const open = async (n) => {
    if (!n.isRead) {
      try {
        await markNotificationRead(n._id);
      } catch {
        // Opening still works if marking fails.
      }
    }
    const target = TARGETS[n.relatedEntity?.entityType];
    if (target) navigate(`/${user.role}/${target}`);
    else reload();
  };

  const readAll = async () => {
    try {
      const { updated } = await markAllNotificationsRead();
      toast.success(updated ? `${updated} marked as read` : 'Nothing unread');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={data ? `${data.unreadCount} unread` : ''}
        actions={<Button onClick={readAll} disabled={!data?.unreadCount}>Mark all as read</Button>}
      />
      <Tabs value={unreadOnly ? 1 : 0} onChange={(_, t) => { setUnreadOnly(t === 1); setPaging({ page: 1, limit: 20 }); }} sx={{ mb: 2 }}>
        <Tab label="All" />
        <Tab label="Unread" />
      </Tabs>
      <LoadState loading={loading} error={error} data={data} onRetry={reload}>
        {data?.items.length === 0 ? (
          <Alert severity="info">{unreadOnly ? 'You are all caught up.' : 'No notifications yet.'}</Alert>
        ) : (
          <Card variant="outlined">
            <List disablePadding>
              {data?.items.map((n) => {
                const Icon = ICONS[n.type] || NotificationsIcon;
                return (
                  <ListItemButton key={n._id} divider onClick={() => open(n)} sx={{ bgcolor: n.isRead ? undefined : 'var(--hover-tint)' }}>
                    <ListItemIcon><Icon color={n.isRead ? 'disabled' : 'primary'} /></ListItemIcon>
                    <ListItemText
                      primary={n.title}
                      secondary={<>{n.message}<Box component="span" sx={{ display: 'block' }}>{formatDateTime(n.createdAt, displayTimeZone)}</Box></>}
                      slotProps={{ primary: { fontWeight: n.isRead ? 400 : 700 } }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
            <Pager data={data} onChange={setPaging} rowsPerPageOptions={[20, 50]} />
          </Card>
        )}
      </LoadState>
    </>
  );
}

export default NotificationsPage;
