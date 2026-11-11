import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface TransactionType {
  id: string;
  amount: string;
  transaction_type: 'CREDIT' | 'DEBIT' | 'TRANSFER';
  status: string;
  description: string;
  created_at: string;
}

interface TransactionCardProps {
  transaction: TransactionType;
  onPress?: () => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onPress }) => {
  const isCredit = transaction.transaction_type === 'CREDIT';
  
  // Format date natively
  const dateObj = new Date(transaction.created_at);
  const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <TouchableOpacity 
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Transaction of $${transaction.amount} on ${formattedDate}. Status: ${transaction.status}.`}
      className="bg-surface p-4 rounded-xl mb-3 flex-row justify-between items-center border border-[#333333]"
    >
      <View className="flex-1">
        <Text className="text-text font-bold text-lg mb-1" numberOfLines={1}>
          {transaction.description || transaction.transaction_type}
        </Text>
        <Text className="text-textMuted text-sm">
          {formattedDate} • {transaction.status}
        </Text>
      </View>
      
      <View className="ml-4 items-end">
        <Text className={`text-xl font-bold ${isCredit ? 'text-[#00E5FF]' : 'text-text'}`}>
          {isCredit ? '+' : '-'}${Number(transaction.amount).toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
