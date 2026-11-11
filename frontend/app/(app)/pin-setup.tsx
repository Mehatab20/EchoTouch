import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { PinEntry } from '../../components/PinEntry';
import { AccessibilityManager } from '../../services/accessibilityManager';
import { HapticEngine } from '../../services/braille/HapticEngine';
import { router } from 'expo-router';
import { ScreenIdentity, useFocusManager } from '../../services/navigation/NavigationEngine';
import * as SecureStore from 'expo-secure-store';

export default function PinSetupScreen() {
  const accessibility = useSelector((state: RootState) => state.accessibility);
  const [pin, setPin] = useState('');
  const { setScreenName, setNavState, navState } = useFocusManager();
  
  useEffect(() => {
    setScreenName('pin');
    ScreenIdentity.announce('pin');
    if (accessibility.capabilities.needsVoice) {
      AccessibilityManager.speak(`Please set up your new ${accessibility.pinLength} digit Bank PIN.`);
    }
  }, [setScreenName, accessibility.capabilities.needsVoice, accessibility.pinLength]);

  useEffect(() => {
    if (pin.length === accessibility.pinLength) {
      handleSavePin();
    }
  }, [pin, accessibility.pinLength]);

  const handleSavePin = async () => {
    if (navState === 'PROCESSING') return;
    setNavState('PROCESSING');
    HapticEngine.confirmPulse();
    
    try {
      await SecureStore.setItemAsync('transaction_pin', pin);
      if (accessibility.profile === 'deaf-blind') {
        HapticEngine.successMelody();
      }
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak('PIN setup complete. Navigating to Dashboard.');
      }
      setNavState('NAVIGATION');
      router.replace('/(app)/dashboard');
    } catch (e) {
      if (accessibility.profile === 'deaf-blind') {
        HapticEngine.error();
      }
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak('Failed to save PIN.');
      }
      setPin('');
      setNavState('INPUT');
    }
  };

  return (
    <ScreenWrapper>
      <View className="flex-1">
        {accessibility.primaryInputMethod !== 'braille' && (
          <View className="mb-6 mt-4 flex-row justify-between items-center px-4">
            <Text accessibilityRole="header" className="text-3xl font-bold text-text">Setup Bank PIN</Text>
          </View>
        )}
        
        {accessibility.primaryInputMethod !== 'braille' && (
          <Text className="text-textMuted text-lg mb-8 text-center px-4">
            Create a secure {accessibility.pinLength}-digit PIN to authorize payments.
          </Text>
        )}
        
        <View className="flex-1 w-full">
          <PinEntry 
            pin={pin} 
            onPinChange={setPin} 
            maxLength={accessibility.pinLength} 
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}
