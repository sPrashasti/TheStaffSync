import axios from 'axios';

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

// Turn every failure into an Error whose message is safe to show the user.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      error.message = error.response.data?.message || `Request failed (HTTP ${error.response.status})`;
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'The server took too long to respond. Please try again.';
    } else {
      error.message = 'Unable to reach the server. Check that the API is running.';
    }
    return Promise.reject(error);
  },
);

export default api;
