import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface BalanceCardProps {
  balance: number | string;
  isLoading?: boolean;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ balance, isLoading }) => {
  return (
    <View 
      className="bg-surface p-6 rounded-2xl w-full border border-[#333333] mb-6 shadow-lg"
      accessibilityRole="summary"
      accessibilityLabel={`Your wallet balance is $${balance}`}
    >
      <Text className="text-textMuted text-lg font-medium mb-2">Total Balance</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFD700" className="self-start" />
      ) : (
        <Text 
          className="text-primary text-5xl font-bold tracking-tight"
          nativeID="wallet_balance_text"
        >
          ${Number(balance).toFixed(2)}
        </Text>
      )}
    </View>
  );
};
