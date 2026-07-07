import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import mapReducer from './slices/mapSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    map: mapReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Turn off serialization check for Date objects in location filters
    }),
});

export default store;
