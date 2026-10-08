import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as platformService from '../services/platformService';
import { platformTokenStorage } from '../utils/storage';

// The platform admin session: separate from the organisation session in authSlice, with its own
// token. status: 'checking' (a saved token is being verified), 'authenticated' or 'anonymous'.

const toError = (err) => ({ message: err.message, fieldErrors: err.fieldErrors || {}, httpStatus: err.response?.status });

export const platformLogin = createAsyncThunk('platform/login', async (credentials, { rejectWithValue }) => {
  try {
    const { token, admin } = await platformService.login(credentials);
    platformTokenStorage.set(token);
    return { token, admin };
  } catch (err) {
    platformTokenStorage.clear();
    return rejectWithValue(toError(err));
  }
});

export const loadPlatformSession = createAsyncThunk('platform/loadSession', async (_, { rejectWithValue }) => {
  try {
    return { admin: await platformService.getMe() };
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

const savedToken = platformTokenStorage.get();

const signedOut = (state, notice = '') => {
  platformTokenStorage.clear();
  state.token = null;
  state.admin = null;
  state.status = 'anonymous';
  state.notice = notice;
};

const platformSlice = createSlice({
  name: 'platform',
  initialState: { token: savedToken, admin: null, status: savedToken ? 'checking' : 'anonymous', notice: '' },
  reducers: {
    platformLogout: (state) => signedOut(state),
    platformSessionExpired: (state, action) => signedOut(state, action.payload || 'Your session has ended. Please log in again.'),
    // After a password change the server issues a new token; older ones stop working.
    platformTokenReplaced: (state, action) => {
      platformTokenStorage.set(action.payload);
      state.token = action.payload;
    },
  },
  extraReducers: (builder) => {
    const signedIn = (state, { payload }) => {
      if (payload.token) state.token = payload.token;
      state.admin = payload.admin;
      state.status = 'authenticated';
      state.notice = '';
    };
    builder
      .addCase(platformLogin.fulfilled, signedIn)
      .addCase(loadPlatformSession.fulfilled, signedIn)
      // Any failure while checking a saved token means signing in again.
      .addCase(loadPlatformSession.rejected, (state, { payload }) => {
        signedOut(state, payload?.httpStatus === 401 ? 'Please log in to continue.' : payload?.message || '');
      });
  },
});

export const { platformLogout, platformSessionExpired, platformTokenReplaced } = platformSlice.actions;
export default platformSlice.reducer;
export const selectPlatform = (state) => state.platform;
