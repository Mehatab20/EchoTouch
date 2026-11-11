import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';
import { setProfile, updatePrimaryInputMethod, completeProfile } from '../store/accessibilitySlice';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { AccessibilityManager } from '../services/accessibilityManager';
import { router } from 'expo-router';
import { HapticEngine } from '../services/braille/HapticEngine';

export default function ProfilerScreen() {
  const dispatch = useDispatch();
  
  const [step, setStep] = useState(1);
  const [canHear, setCanHear] = useState<boolean | null>(null);
  const [canSee, setCanSee] = useState<boolean | null>(null);
  const [isDeafBlindFallback, setIsDeafBlindFallback] = useState(false);

  const fallbackTimer = useRef<any>(null);
  const pulseInterval = useRef<any>(null);

  useEffect(() => {
    // Initial mount
    AccessibilityManager.speak('Welcome to Echo Touch. Are you able to see and hear? Tap the screen for yes.');
    
    // 15 second fallback timer for Deaf-Blind
    fallbackTimer.current = setTimeout(() => {
      setIsDeafBlindFallback(true);
      // Play heavy haptic SOS query
      HapticEngine.error(); 
      pulseInterval.current = setInterval(() => HapticEngine.heartbeat(), 2000);
    }, 15000);

    return () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      if (pulseInterval.current) clearInterval(pulseInterval.current);
    };
  }, []);

  const handleInteraction = () => {
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
  };

  const finalizeDeafBlind = () => {
    if (pulseInterval.current) clearInterval(pulseInterval.current);
    dispatch(setProfile('deaf-blind'));
    dispatch(updatePrimaryInputMethod('braille'));
    dispatch(completeProfile());
    HapticEngine.signatureSuccess();
    router.replace('/(auth)/login');
  };

  const handleAnswer = (answer: boolean) => {
    handleInteraction();
    HapticEngine.tap();
    
    if (step === 1) {
      setCanHear(answer);
      setStep(2);
      if (answer) {
        AccessibilityManager.speak('Can you see the screen clearly? Yes or No.');
      }
    } else if (step === 2) {
      setCanSee(answer);
      setStep(3);
      if (canHear) {
        AccessibilityManager.speak('Do you know how to use 6-dot Braille? Yes or No.');
      }
    } else if (step === 3) {
      const knowsBraille = answer;
      
      let profileId: 'sighted' | 'blind' | 'deaf' | 'deaf-blind' | 'elderly' | 'custom' = 'sighted';

      if (!canHear && !canSee) {
        profileId = 'deaf-blind';
      } else if (!canSee) {
        profileId = 'blind';
      } else if (!canHear) {
        profileId = 'deaf';
      }

      dispatch(setProfile(profileId));

      if (knowsBraille && profileId !== 'blind' && profileId !== 'deaf-blind') {
        dispatch(updatePrimaryInputMethod('braille'));
      }
      
      dispatch(completeProfile());
      
      if (canHear) {
        AccessibilityManager.speak('Accessibility profile generated. Proceeding to login.');
      }
      
      router.replace('/(auth)/login');
    }
  };

  const getQuestionText = () => {
    if (step === 1) return 'Can you hear voice guidance?';
    if (step === 2) return 'Can you see the screen clearly?';
    if (step === 3) return 'Do you know how to use 6-dot Braille?';
    return '';
  };

  if (isDeafBlindFallback) {
    return (
      <ScreenWrapper>
        <TouchableOpacity 
          className="flex-1 justify-center items-center bg-[#121212]"
          onPress={finalizeDeafBlind}
          activeOpacity={0.8}
        >
          <Text className="text-error font-bold text-4xl text-center px-4">
            Deaf-Blind Auto-Fallback
          </Text>
          <Text className="text-textMuted text-xl text-center mt-4 px-4">
            Tap anywhere to confirm V-Braille interface.
          </Text>
        </TouchableOpacity>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View className="flex-1 justify-center px-4">
        <Text accessibilityRole="header" className="text-3xl font-bold text-primary mb-2 text-center">
          Accessibility Profiler
        </Text>
        <Text className="text-xl text-textMuted text-center mb-12">
          {getQuestionText()}
        </Text>

        <View className="flex-row justify-center space-x-4">
          <TouchableOpacity 
            onPress={() => handleAnswer(true)}
            className="flex-1 bg-primary h-24 rounded-2xl items-center justify-center mr-2"
          >
            <Text className="text-[#121212] font-bold text-2xl">Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleAnswer(false)}
            className="flex-1 bg-surface border-2 border-error h-24 rounded-2xl items-center justify-center ml-2"
          >
            <Text className="text-error font-bold text-2xl">No</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}
