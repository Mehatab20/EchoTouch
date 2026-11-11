import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { HapticEngine } from '../../services/braille/HapticEngine';
import { SpatialReplayEngine } from '../../services/braille/SpatialReplayEngine';

export default function DevHapticsScreen() {

  const renderTestButton = (label: string, onPress: () => void) => (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-primary/20 border border-primary p-4 rounded-xl mb-4"
    >
      <Text className="text-primary font-bold text-lg text-center">{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text className="text-3xl font-bold text-text mb-8 text-center">Dev: Haptic Queue</Text>
        
        {renderTestButton('Test Tap', () => HapticEngine.tap())}
        {renderTestButton('Test Error', () => HapticEngine.error())}
        {renderTestButton('Test Confirm Pulse', () => HapticEngine.confirmPulse())}
        {renderTestButton('Test Signature Success', () => HapticEngine.signatureSuccess())}
        {renderTestButton('Test Heartbeat', () => HapticEngine.heartbeat())}
        
        <View className="h-[2px] bg-surface my-6" />
        
        <Text className="text-3xl font-bold text-text mb-8 text-center">Dev: SBRE Replay</Text>
        
        {renderTestButton('Replay Dot 1 (Beginner)', () => SpatialReplayEngine.replay([1], 'Beginner'))}
        {renderTestButton('Replay Dot 5 (Beginner)', () => SpatialReplayEngine.replay([5], 'Beginner'))}
        {renderTestButton('Replay 1+5 (Beginner)', () => SpatialReplayEngine.replay([1, 5], 'Beginner'))}
        {renderTestButton('Replay 1+4+5 (Expert)', () => SpatialReplayEngine.replay([1, 4, 5], 'Expert'))}
        {renderTestButton('Replay Invalid ([1,2,3,4,5,6])', () => SpatialReplayEngine.replay([1, 2, 3, 4, 5, 6], 'Expert'))}
        
        <View className="h-[2px] bg-surface my-6" />

        <Text className="text-textMuted text-center mb-4">Spam tap below to test the queue preventing overlap:</Text>
        {renderTestButton('Spam Signature Success (Queue Test)', () => {
          HapticEngine.signatureSuccess();
          HapticEngine.signatureSuccess();
          HapticEngine.signatureSuccess();
        })}

      </ScrollView>
    </ScreenWrapper>
  );
}
