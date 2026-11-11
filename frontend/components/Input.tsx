import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  id?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, id, ...props }) => {
  return (
    <View className="mb-4 w-full">
      <Text 
        nativeID={`${id}_label`}
        accessibilityRole="text"
        className="text-text font-semibold text-lg mb-2"
      >
        {label}
      </Text>
      <TextInput
        nativeID={id}
        testID={id}
        accessibilityLabel={label}
        accessibilityHint={`Enter your ${label.toLowerCase()}`}
        accessibilityRole="text"
        placeholderTextColor="#B3B3B3"
        className={`w-full bg-surface text-text text-lg px-4 h-14 rounded-xl border-2 ${
          error ? 'border-error' : 'border-transparent focus:border-primary'
        }`}
        style={{ textAlignVertical: 'center', includeFontPadding: false }}
        {...props}
      />
      {error && (
        <Text 
          accessibilityRole="alert"
          className="text-error text-sm mt-1 font-semibold"
        >
          {error}
        </Text>
      )}
    </View>
  );
};
