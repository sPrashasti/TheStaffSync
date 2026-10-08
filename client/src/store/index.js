import { configureStore } from '@reduxjs/toolkit';
import authReducer, { loadSession } from './authSlice';
import preferencesReducer from './preferencesSlice';
import platformReducer, { loadPlatformSession } from './platformSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    preferences: preferencesReducer,
    platform: platformReducer,
  },
});

// A token saved from an earlier visit is checked once, as soon as the app starts.
if (store.getState().auth.status === 'checking') store.dispatch(loadSession());
if (store.getState().platform.status === 'checking') store.dispatch(loadPlatformSession());

export default store;
