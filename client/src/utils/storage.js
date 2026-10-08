// localStorage can throw (private windows, blocked site data), so every access is guarded and
// the app keeps working, just without remembering things between visits.
const read = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Not persisted; nothing else to do.
  }
};

const TOKEN_KEY = 'staffsync.token';
const TIME_ZONE_KEY = 'staffsync.displayTimeZone';
// Kept apart from the organisation token: a platform admin session is a different kind of account.
const PLATFORM_TOKEN_KEY = 'staffsync.platformToken';

export const tokenStorage = {
  get: () => read(TOKEN_KEY),
  set: (token) => write(TOKEN_KEY, token),
  clear: () => write(TOKEN_KEY, null),
};

export const platformTokenStorage = {
  get: () => read(PLATFORM_TOKEN_KEY),
  set: (token) => write(PLATFORM_TOKEN_KEY, token),
  clear: () => write(PLATFORM_TOKEN_KEY, null),
};

export const timeZoneStorage = {
  get: () => read(TIME_ZONE_KEY),
  set: (timeZone) => write(TIME_ZONE_KEY, timeZone),
};
