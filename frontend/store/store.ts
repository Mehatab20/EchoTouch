import { configureStore } from '@reduxjs/toolkit';
import { api } from '../services/api';
import authReducer from './authSlice';
import accessibilityReducer from './accessibilitySlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    accessibility: accessibilityReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
