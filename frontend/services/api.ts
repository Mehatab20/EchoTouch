import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { logout } from '../store/authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/',
  prepareHeaders: async (headers) => {
    headers.set('ngrok-skip-browser-warning', 'true');
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // try to get a new token
    const refresh_token = await SecureStore.getItemAsync('refresh_token');
    if (refresh_token) {
      const refreshResult = await baseQuery(
        {
          url: 'auth/refresh',
          method: 'POST',
          body: { refreshToken: refresh_token },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // store the new token
        const newAccessToken = (refreshResult.data as any).accessToken;
        await SecureStore.setItemAsync('access_token', newAccessToken);
        // retry the initial query
        result = await baseQuery(args, api, extraOptions);
      } else {
        // refresh failed - log out
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        api.dispatch(logout());
      }
    } else {
      // no refresh token - clear access token and log out
      await SecureStore.deleteItemAsync('access_token');
      api.dispatch(logout());
    }
  }
  return result;
};

// --- HACKATHON DEMO IN-MEMORY STATE ---
let demoBalance = 940.00;

export const api = createApi({
  reducerPath: 'api',
  baseQuery: async (args, api, extraOptions) => {
    let result = await baseQueryWithReauth(args, api, extraOptions);

    // --- HACKATHON DEMO FALLBACK INTERCEPTOR ---
    if (result.error) {
      const url = typeof args === 'string' ? args : args.url;
      console.warn(`[Demo Interceptor] Backend failed for ${url}, falling back to Mock Data`);
      
      if (url.includes('wallet/topup')) {
        demoBalance += 100.00; // Actually increase the balance!
        return { data: { success: true } };
      }
      
      if (url.includes('wallet/transfer')) {
        demoBalance -= 50.00; 
        return { data: { success: true } };
      }
      
      if (url.includes('wallet/balance')) {
        return { data: { balance: demoBalance.toFixed(2) } };
      }
      
      if (url.includes('transactions')) {
        return { data: [
          { id: '1', type: 'CREDIT', amount: '100.00', description: 'Top Up', created_at: new Date().toISOString() },
          { id: '2', type: 'DEBIT', amount: '24.50', description: 'Groceries', created_at: new Date(Date.now() - 86400000).toISOString() }
        ]};
      }
    }
    return result;
  },
  tagTypes: ['Wallet', 'Transactions'],
  endpoints: () => ({}), // Endpoints will be injected from other files
});
