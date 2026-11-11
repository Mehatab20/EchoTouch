import { api } from './api';

export const walletApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getWallet: builder.query({
      query: () => 'wallet/balance',
      providesTags: ['Wallet'],
    }),
    getTransactions: builder.query({
      query: () => 'transactions',
      providesTags: ['Transactions'],
    }),
    processPayment: builder.mutation({
      query: (paymentData) => ({
        url: 'wallet/transfer',
        method: 'POST',
        body: paymentData,
      }),
      invalidatesTags: ['Wallet', 'Transactions'],
    }),
    creditWallet: builder.mutation({
      query: (creditData: { amount: string, pin?: string, description?: string }) => ({
        url: 'wallet/topup',
        method: 'POST',
        body: creditData,
      }),
      invalidatesTags: ['Wallet', 'Transactions'],
    }),
  }),
});

export const { 
  useGetWalletQuery, 
  useGetTransactionsQuery, 
  useProcessPaymentMutation,
  useCreditWalletMutation
} = walletApi;
