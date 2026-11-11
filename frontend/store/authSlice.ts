import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null; // Will define User type later
  isLoading: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true, // Initially true while we check SecureStore
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ user: any }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.isLoading = false;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setAuth, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
