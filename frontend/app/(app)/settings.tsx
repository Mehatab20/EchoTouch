import React from 'react';
import { View, Text, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setProfile, updateCapabilities, setEnvironment, ContextEnvironment, updatePrimaryInputMethod, updatePinLength } from '../../store/accessibilitySlice';
import { AccessibilityProfile } from '../../services/accessibility/AccessibilityTypes';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { AccessibilityManager } from '../../services/accessibilityManager';
import { useRouter } from 'expo-router';
import { HapticEngine } from '../../services/braille/HapticEngine';
import { TactileElement } from '../../services/navigation/NavigationEngine';

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const accessibility = useSelector((state: RootState) => state.accessibility);

  const handleModeChange = (profile: AccessibilityProfile) => {
    dispatch(setProfile(profile));
    HapticEngine.tap();
    if (profile === 'blind') {
      AccessibilityManager.speak('Blind profile activated. Voice guidance enabled.');
    } else if (profile === 'deaf-blind') {
      AccessibilityManager.speak('Deaf blind profile activated. Touch and vibrations only.');
    } else if (profile === 'elderly') {
      AccessibilityManager.speak('Elderly profile activated. Large interface and tremor protection enabled.');
    }
  };

  const toggleCapability = (key: keyof typeof accessibility.capabilities) => {
    const newValue = !accessibility.capabilities[key];
    dispatch(updateCapabilities({ [key]: newValue }));
    HapticEngine.tap();
    if (key === 'needsVoice' && newValue) {
      AccessibilityManager.speak('Voice guidance turned on');
    }
  };

  const renderSwitch = (label: string, key: keyof typeof accessibility.capabilities, description: string) => (
    <View className="flex-row justify-between items-center bg-surface p-4 rounded-xl mb-4">
      <View className="flex-1 mr-4">
        <Text accessibilityRole="header" className="text-xl font-bold text-text mb-1">{label}</Text>
        <Text className="text-textMuted text-base">{description}</Text>
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: accessibility.capabilities[key] as boolean }}
        trackColor={{ false: '#333', true: '#FFD700' }}
        thumbColor={accessibility.capabilities[key] ? '#121212' : '#f4f3f4'}
        onValueChange={() => toggleCapability(key)}
        value={accessibility.capabilities[key] as boolean}
      />
    </View>
  );

  return (
    <ScreenWrapper>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row justify-between items-center mb-6 mt-4">
          <Text accessibilityRole="header" className="text-3xl font-bold text-text">Accessibility</Text>
          <TactileElement id="btn_settings_back" label="Back" description="Return to dashboard" type="button" priority={1} onPress={() => { HapticEngine.tap(); router.replace('/(app)/dashboard'); }}>
            <TouchableOpacity 
              onPress={() => {
                HapticEngine.tap();
                router.replace('/(app)/dashboard');
              }} 
              className="px-5 py-2 bg-surface rounded-full border border-primary/50"
            >
              <Text className="text-primary font-bold text-base">Back</Text>
            </TouchableOpacity>
          </TactileElement>
        </View>

        <Text className="text-xl font-bold text-primary mb-2 mt-2">Quick Profiles</Text>
        <Text className="text-textMuted text-base mb-4">Current Profile: {accessibility.profile.toUpperCase()}</Text>
        
        <View className="flex-row flex-wrap justify-between mb-6">
          {[
            { id: 'sighted', label: 'Sighted' },
            { id: 'blind', label: 'Blind' },
            { id: 'deaf', label: 'Deaf' },
            { id: 'elderly', label: 'Elderly' },
            { id: 'deaf-blind', label: 'Deaf-Blind' },
          ].map((prof) => (
            <TactileElement key={prof.id} id={`btn_profile_${prof.id}`} label={`${prof.label} Profile`} description={`Set to ${prof.label} profile`} type="button" priority={2} onPress={() => handleModeChange(prof.id as AccessibilityProfile)} className="w-[48%] mb-4">
              <Button
                title={prof.label}
                variant={accessibility.profile === prof.id ? 'primary' : 'outline'}
                onPress={() => handleModeChange(prof.id as AccessibilityProfile)}
                className="w-full min-h-[50px] py-3 mb-0"
              />
            </TactileElement>
          ))}
        </View>

        <Text className="text-xl font-bold text-primary mb-4 mt-8">Context Engine (Simulator)</Text>
        <Text className="text-textMuted text-base mb-4">
          For demonstration purposes, trigger simulated environments to watch AIMAF adapt in real-time.
        </Text>

        <View className="flex-row flex-wrap justify-between mb-6">
          {[
            { id: 'normal', label: 'Normal', icon: '🏠' },
            { id: 'airport', label: 'Airport', icon: '✈️' },
            { id: 'library', label: 'Library', icon: '📚' },
            { id: 'low-battery', label: 'Low Battery', icon: '🔋' },
          ].map((env) => (
            <TouchableOpacity
              key={env.id}
              onPress={() => {
                dispatch(setEnvironment(env.id as any));
                HapticEngine.tap();
              }}
              className={`w-[48%] bg-surface py-4 rounded-xl border ${accessibility.environment === env.id ? 'border-primary' : 'border-[#333]'} items-center justify-center mb-4`}
            >
              <Text className="text-3xl mb-2">{env.icon}</Text>
              <Text className={`font-bold ${accessibility.environment === env.id ? 'text-primary' : 'text-text'}`}>{env.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-xl font-bold text-primary mb-4 mt-4">Custom Settings</Text>

        <View className="flex-row justify-between items-center bg-surface p-4 rounded-xl mb-4">
          <View className="flex-1 mr-4">
            <Text accessibilityRole="header" className="text-xl font-bold text-text mb-1">PIN Length</Text>
            <Text className="text-textMuted text-base">Current length: {accessibility.pinLength} digits</Text>
          </View>
          <View className="flex-row bg-[#121212] rounded-lg border border-[#333]">
            <TouchableOpacity 
              onPress={() => {
                dispatch(updatePinLength(4));
                HapticEngine.tap();
                AccessibilityManager.speak('4 digit PIN selected');
              }}
              className={`px-4 py-2 rounded-l-lg ${accessibility.pinLength === 4 ? 'bg-primary' : 'bg-transparent'}`}
            >
              <Text className={`font-bold ${accessibility.pinLength === 4 ? 'text-[#121212]' : 'text-text'}`}>4</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                dispatch(updatePinLength(6));
                HapticEngine.tap();
                AccessibilityManager.speak('6 digit PIN selected');
              }}
              className={`px-4 py-2 rounded-r-lg ${accessibility.pinLength === 6 ? 'bg-primary' : 'bg-transparent'}`}
            >
              <Text className={`font-bold ${accessibility.pinLength === 6 ? 'text-[#121212]' : 'text-text'}`}>6</Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderSwitch('Voice Guidance', 'needsVoice', 'Reads screen information aloud')}
        {renderSwitch('Vibration Feedback', 'needsHaptics', 'Haptic feedback on interactions')}
        {renderSwitch('Large UI', 'needsLargeUI', 'Expands component sizes')}
        {renderSwitch('Simple Dashboard', 'needsSimpleDashboard', 'Hides non-essential items')}
        {renderSwitch('Tremor Protection', 'needsTremorProtection', 'Requires long-presses to avoid accidental taps')}
        {renderSwitch('Double Confirmation', 'needsExtraConfirmation', 'Requires extra step before payment')}
        
        <View className="flex-row justify-between items-center bg-surface p-4 rounded-xl mb-4 mt-4">
          <View className="flex-1 mr-4">
            <Text accessibilityRole="header" className="text-xl font-bold text-text mb-1">Primary Input Method</Text>
            <Text className="text-textMuted text-base">Current: {accessibility.primaryInputMethod}</Text>
          </View>
          <View className="flex-row bg-[#121212] rounded-lg border border-[#333]">
            <TouchableOpacity onPress={() => dispatch(updatePrimaryInputMethod('numeric'))} className={`px-3 py-2 rounded-l-lg ${accessibility.primaryInputMethod === 'numeric' ? 'bg-primary' : 'bg-transparent'}`}>
              <Text className={`font-bold ${accessibility.primaryInputMethod === 'numeric' ? 'text-[#121212]' : 'text-text'}`}>Numeric</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => dispatch(updatePrimaryInputMethod('braille'))} className={`px-3 py-2 rounded-r-lg ${accessibility.primaryInputMethod === 'braille' ? 'bg-primary' : 'bg-transparent'}`}>
              <Text className={`font-bold ${accessibility.primaryInputMethod === 'braille' ? 'text-[#121212]' : 'text-text'}`}>Braille</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-8 mb-4 border-t border-[#333] pt-4">
          <Button 
            title="[DEV] Haptic Queue Tester" 
            variant="outline"
            onPress={() => router.push('/(app)/dev-haptics')}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
