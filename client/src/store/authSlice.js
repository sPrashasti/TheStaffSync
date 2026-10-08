import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as authService from '../services/authService';
import * as organisationService from '../services/organisationService';
import * as demoService from '../services/demoService';
import { tokenStorage } from '../utils/storage';

// status: 'checking' (a saved token is being verified), 'authenticated', 'anonymous', or
// 'unavailable' (the server could not be reached while checking a saved token).
// Only auth lives in Redux; page data stays in component state.

const toError = (err) => ({ message: err.message, fieldErrors: err.fieldErrors || {}, httpStatus: err.response?.status });

// Logs in, saves the token, then loads the employee profile so every page has it.
export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { token } = await authService.login(credentials);
    tokenStorage.set(token);
    const { user, employee, organisation } = await authService.getMe();
    return { token, user, employee, organisation };
  } catch (err) {
    tokenStorage.clear();
    return rejectWithValue(toError(err));
  }
});

// One click on "Try the demo": signs in as the demo organisation's account for that role.
export const demoLogin = createAsyncThunk('auth/demoLogin', async (role, { rejectWithValue }) => {
  try {
    const { token } = await demoService.demoLogin(role);
    tokenStorage.set(token);
    const { user, employee, organisation } = await authService.getMe();
    return { token, user, employee, organisation };
  } catch (err) {
    tokenStorage.clear();
    return rejectWithValue(toError(err));
  }
});

// A new company signs up; the person signing up becomes its first HR user.
export const signup = createAsyncThunk('auth/signup', async (details, { rejectWithValue }) => {
  try {
    const { token, user, employee, organisation } = await organisationService.signup(details);
    tokenStorage.set(token);
    return { token, user, employee, organisation };
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

// Verifies a saved token on start-up (or refreshes the profile after an edit).
export const loadSession = createAsyncThunk('auth/loadSession', async (_, { rejectWithValue }) => {
  try {
    return await authService.getMe();
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

const savedToken = tokenStorage.get();

const signedOut = (state, notice = '') => {
  tokenStorage.clear();
  state.token = null;
  state.user = null;
  state.employee = null;
  state.organisation = null;
  state.status = 'anonymous';
  state.notice = notice;
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: savedToken,
    user: null,
    employee: null,
    // The user's company: name and settings (time zone, working days).
    organisation: null,
    status: savedToken ? 'checking' : 'anonymous',
    // Shown on the login page, e.g. after a session expires.
    notice: '',
  },
  reducers: {
    logout: (state) => signedOut(state),
    sessionExpired: (state, action) => signedOut(state, action.payload || 'Your session has ended. Please log in again.'),
    clearNotice: (state) => {
      state.notice = '';
    },
    // After a password change the server issues a new token; older ones stop working.
    tokenReplaced: (state, action) => {
      tokenStorage.set(action.payload);
      state.token = action.payload;
    },
    // After HR changes the company name or settings.
    organisationUpdated: (state, action) => {
      state.organisation = action.payload;
    },
  },
  extraReducers: (builder) => {
    const signedIn = (state, { payload }) => {
      if (payload.token) state.token = payload.token;
      state.user = payload.user;
      state.employee = payload.employee;
      state.organisation = payload.organisation;
      state.status = 'authenticated';
      state.notice = '';
    };
    builder
      .addCase(login.fulfilled, signedIn)
      .addCase(signup.fulfilled, signedIn)
      .addCase(demoLogin.fulfilled, signedIn)
      .addCase(loadSession.fulfilled, signedIn)
      .addCase(loadSession.pending, (state) => {
        if (state.status === 'unavailable') state.status = 'checking';
      })
      .addCase(loadSession.rejected, (state, { payload }) => {
        if (state.status !== 'checking') return;
        // A rejected token means log in again; a network problem keeps the token so a retry can work.
        if (payload?.httpStatus === 401 || payload?.httpStatus === 404) {
          signedOut(state, 'Please log in to continue.');
        } else if (payload?.httpStatus === 403) {
          // E.g. the organisation's account is suspended: say why, rather than retrying forever.
          signedOut(state, payload.message);
        } else {
          state.status = 'unavailable';
          state.notice = payload?.message || 'Unable to reach the server.';
        }
      });
  },
});

export const { logout, sessionExpired, clearNotice, tokenReplaced, organisationUpdated } = authSlice.actions;
export default authSlice.reducer;

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectRole = (state) => state.auth.user?.role;
export const selectOrganisation = (state) => state.auth.organisation;
