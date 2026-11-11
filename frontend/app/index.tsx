import React from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function IndexScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-[#121212]">
      <ActivityIndicator size="large" color="#FFD700" />
    </View>
  );
}
