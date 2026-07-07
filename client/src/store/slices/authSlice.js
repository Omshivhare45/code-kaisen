import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('setu_token') || null;
const userJson = localStorage.getItem('setu_user');
const user = userJson ? JSON.parse(userJson) : null;

const initialState = {
  user,
  token,
  isAuthenticated: !!token,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('setu_token', action.payload.token);
      localStorage.setItem('setu_user', JSON.stringify(action.payload.user));
    },
    loginFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('setu_token');
      localStorage.removeItem('setu_user');
    },
    updateProfile(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('setu_user', JSON.stringify(state.user));
    }
  }
});

export const { loginStart, loginSuccess, loginFailure, logout, updateProfile } = authSlice.actions;
export default authSlice.reducer;
