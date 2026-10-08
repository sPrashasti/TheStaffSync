import axios from 'axios';
import { platformTokenStorage, tokenStorage } from '../utils/storage';

// The Axios instances for the whole app. Components never call axios directly and never contain
// full URLs — they use service functions. There are exactly two clients, because there are two
// kinds of account: organisation users (`api`) and StaffSync platform admins (`platformApi`).
// Each sends only its own token, so neither session can ever be used for the other's API.
const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  throw new Error('VITE_API_URL is not set. Copy client/.env.example to client/.env.');
}

// Turns every failure into an Error whose message is safe to show the user, plus
// fieldErrors ({ field: message }) for forms. A 401 on anything but the login form means the
// session has ended, and the client's unauthorised handler is told.
const createClient = ({ prefix = '', storage, getUnauthorizedHandler }) => {
  const client = axios.create({
    baseURL: baseURL + prefix,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  // Every request carries this client's saved token, if there is one.
  client.interceptors.request.use((config) => {
    const token = storage.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        const { status, data } = error.response;
        error.message = data?.message || `Request failed (HTTP ${status})`;
        error.fieldErrors = Object.fromEntries((data?.errors || []).map((e) => [e.field, e.message]));

        // An expired or revoked session. A 401 from the login form itself just means wrong details.
        const isLoginAttempt = error.config?.url?.startsWith('/auth/login');
        const onUnauthorized = getUnauthorizedHandler();
        if (status === 401 && !isLoginAttempt && storage.get() && onUnauthorized) {
          onUnauthorized(error.message);
        }
      } else if (error.code === 'ECONNABORTED') {
        error.message = 'The server took too long to respond. Please try again.';
        error.fieldErrors = {};
      } else {
        error.message = 'Unable to reach the server. Check that the API is running.';
        error.fieldErrors = {};
      }
      return Promise.reject(error);
    },
  );
  return client;
};

// Set by the app once the store exists, so a rejected token signs that session out everywhere.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};
let onPlatformUnauthorized = null;
export const setPlatformUnauthorizedHandler = (handler) => {
  onPlatformUnauthorized = handler;
};

const api = createClient({ storage: tokenStorage, getUnauthorizedHandler: () => onUnauthorized });

// /api/platform/… with the platform admin's token.
export const platformApi = createClient({
  prefix: '/platform',
  storage: platformTokenStorage,
  getUnauthorizedHandler: () => onPlatformUnauthorized,
});

export default api;
