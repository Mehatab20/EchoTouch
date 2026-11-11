import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { clearExplainabilityLog } from '../store/accessibilitySlice';

export function ExplainabilityPanel() {
  const log = useSelector((state: RootState) => state.accessibility.explainabilityLog);
  const dispatch = useDispatch();
  const slideAnim = useRef(new Animated.Value(100)).current; // Start off-screen (bottom)

  useEffect(() => {
    if (log) {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        closePanel();
      }, 6000);
      
      return () => clearTimeout(timer);
    }
  }, [log]);

  const closePanel = () => {
    Animated.timing(slideAnim, {
      toValue: 150, // Slide back down
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      dispatch(clearExplainabilityLog());
    });
  };

  if (!log) return null;

  return (
    <Animated.View 
      style={{ transform: [{ translateY: slideAnim }] }}
      className="absolute bottom-4 left-4 right-4 bg-[#2A2A2A] border border-primary rounded-xl p-4 shadow-lg z-50"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center">
          <Text className="text-2xl mr-2">🧠</Text>
          <Text className="text-primary font-bold text-sm uppercase">{log.context}</Text>
        </View>
        <TouchableOpacity onPress={closePanel}>
          <Text className="text-textMuted text-lg font-bold">×</Text>
        </TouchableOpacity>
      </View>
      <Text className="text-text text-base leading-5">
        <Text className="font-bold">AI Reasoning: </Text>
        {log.reasoning}
      </Text>
    </Animated.View>
  );
}
