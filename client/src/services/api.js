import axios from 'axios';
import { tokenStorage } from '../utils/storage';

// The ONE Axios instance for the whole app. Components never call axios
// directly and never contain full URLs — they use service functions.
const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  throw new Error('VITE_API_URL is not set. Copy client/.env.example to client/.env.');
}

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Set by the app once the store exists, so a rejected token logs the user out everywhere.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// Every request carries the saved token, if there is one.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turn every failure into an Error whose message is safe to show the user, plus
// fieldErrors ({ field: message }) for forms.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      error.message = data?.message || `Request failed (HTTP ${status})`;
      error.fieldErrors = Object.fromEntries((data?.errors || []).map((e) => [e.field, e.message]));

      // An expired or revoked session. A 401 from the login form itself just means wrong details.
      const isLoginAttempt = error.config?.url?.startsWith('/auth/login');
      if (status === 401 && !isLoginAttempt && tokenStorage.get() && onUnauthorized) {
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

export default api;
