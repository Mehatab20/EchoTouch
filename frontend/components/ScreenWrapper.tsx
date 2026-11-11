import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExplainabilityPanel } from './ExplainabilityPanel';

interface ScreenWrapperProps {
  children: React.ReactNode;
  padding?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, padding = true }) => {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <View className={`flex-1 ${padding ? 'p-6' : ''}`}>
        {children}
      </View>
      <ExplainabilityPanel />
    </SafeAreaView>
  );
};
