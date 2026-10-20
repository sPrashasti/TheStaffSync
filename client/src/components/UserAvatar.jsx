import { useEffect, useState } from 'react';
import { Avatar } from '@mui/material';
import { getPhotoUrl } from '../services/profilePhotoService';

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

// A person's profile photo, or their initials when they have none (or it cannot be loaded).
// `photoUpdatedAt` comes with the user record; a new value means a new photo to fetch.
function UserAvatar({ userId, name, photoUpdatedAt, size = 40, sx }) {
  const [loaded, setLoaded] = useState({ key: null, url: null });
  const key = userId && photoUpdatedAt ? `${userId}:${photoUpdatedAt}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    getPhotoUrl(userId, photoUpdatedAt)
      .then((url) => { if (!cancelled) setLoaded({ key, url }); })
      .catch(() => { if (!cancelled) setLoaded({ key, url: null }); });
    return () => { cancelled = true; };
  }, [key, userId, photoUpdatedAt]);

  const src = loaded.key === key ? loaded.url : null;
  return (
    <Avatar
      src={src || undefined}
      alt={name}
      sx={{ width: size, height: size, fontSize: Math.round(size * 0.4), fontWeight: 700, background: 'var(--metal)', color: 'var(--on-metal)', ...sx }}
    >
      {initials(name)}
    </Avatar>
  );
}

export default UserAvatar;
