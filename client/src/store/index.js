import { configureStore } from '@reduxjs/toolkit';
import authReducer, { loadSession } from './authSlice';
import preferencesReducer from './preferencesSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    preferences: preferencesReducer,
  },
});

// A token saved from an earlier visit is checked once, as soon as the app starts.
if (store.getState().auth.status === 'checking') store.dispatch(loadSession());

export default store;
