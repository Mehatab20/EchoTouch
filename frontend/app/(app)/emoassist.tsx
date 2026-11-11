import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { TactileElement, ScreenIdentity, useFocusManager } from '../../services/navigation/NavigationEngine';
import { Button } from '../../components/Button';
import { useRouter } from 'expo-router';
import { HapticEngine } from '../../services/braille/HapticEngine';
import * as Haptics from 'expo-haptics';

import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { NLPEngine } from '../../services/nlpEngine';

// Simulated Conversation Data (Keeping for type reference, but now dynamic)
type MessageType = { rawText: string; filteredText: string; tone: string; color: string; showRaw?: boolean };

export default function EmoAssistScreen() {
  const router = useRouter();
  const { setScreenName } = useFocusManager();
  
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  // Pulse animation for the Tone Analyzer ring
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setScreenName('emoassist');
    ScreenIdentity.announce('emoassist');
  }, [setScreenName]);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.granted) {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsListening(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      setIsListening(false);
      setIsProcessing(true);
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      
      const uri = audioRecorder.uri;

      if (uri) {
        const rawText = await NLPEngine.transcribeAudio(uri);
        if (rawText) {
          const tone = await NLPEngine.analyzeTone(rawText);
          const filteredText = await NLPEngine.deEscalateText(rawText);
          
          let color = "#3B82F6"; // Neutral
          if (tone === 'Frustration') color = "#EF4444";
          if (tone === 'Urgency') color = "#F59E0B";
          if (tone === 'Joy') color = "#10B981";

          setMessages(prev => [...prev, { rawText, filteredText, tone, color, showRaw: false }]);

          // Trigger Haptics based on real tone
          if (tone === 'Frustration' || tone === 'Urgency') HapticEngine.error();
          else if (tone === 'Joy') HapticEngine.signatureSuccess();
          else HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium);

          // Pulse animation
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true })
          ]).start();
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) stopRecording();
    else startRecording();
  };

  const currentTone = messages.length > 0 ? messages[messages.length - 1] : { tone: "Listening...", color: "#6B7280" };

  return (
    <ScreenWrapper>
      <View className="flex-1 px-4">
        {/* Header */}
        <View className="mb-4 mt-4 flex-row justify-between items-center">
           <Text accessibilityRole="header" className="text-3xl font-bold text-text">EmoAssist Hub</Text>
           <View className="w-24">
             <TactileElement id="btn_emo_back" label="Back" description="Return to Dashboard" type="button" priority={1} onPress={() => { HapticEngine.tap(); router.replace('/(app)/dashboard'); }}>
               <Button title="Back" onPress={() => router.replace('/(app)/dashboard')} variant="outline" className="py-2 px-4 mb-0" />
             </TactileElement>
           </View>
        </View>

        {/* Tone Analyzer Widget */}
        <View className="items-center justify-center my-6">
          <Animated.View 
            style={{ 
              transform: [{ scale: pulseAnim }],
              borderColor: currentTone.color,
              borderWidth: 8,
              borderRadius: 100,
              padding: 20,
              backgroundColor: `${currentTone.color}20`
            }}
            className="w-48 h-48 items-center justify-center"
          >
            <Text className="text-5xl mb-2">
              {currentTone.tone === 'Joy' ? '😄' : 
               currentTone.tone === 'Frustration' ? '😤' : 
               currentTone.tone === 'Urgency' ? '⏰' : 
               currentTone.tone === 'Listening...' ? '🎙️' : '😐'}
            </Text>
            <Text className="text-xl font-bold text-text text-center">{currentTone.tone}</Text>
          </Animated.View>
          <Text className="text-textMuted text-sm mt-4 text-center">
            Real-time Emotional Tone Prediction
          </Text>
        </View>

        {/* Live Transcription */}
        <View className="flex-1 bg-surface rounded-2xl p-4 border border-[#333] mb-6">
          <Text className="text-primary font-bold mb-4 border-b border-[#333] pb-2">Live Transcription</Text>
          <ScrollView className="flex-1">
            {messages.map((msg, idx) => (
              <View key={idx} className="mb-4 p-3 rounded-lg" style={{ backgroundColor: `${msg.color}15`, borderLeftWidth: 4, borderLeftColor: msg.color }}>
                <Text className="text-text text-lg font-bold mb-2">
                  {msg.showRaw ? msg.rawText : msg.filteredText}
                </Text>
                
                <View className="flex-row justify-between items-center mt-2">
                  <Text style={{ color: msg.color }} className="text-xs font-bold uppercase">{msg.tone}</Text>
                  <TouchableOpacity onPress={() => {
                    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, showRaw: !m.showRaw } : m));
                  }}>
                    <Text className="text-textMuted text-xs underline">
                      {msg.showRaw ? "Hide Original" : "View Original"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {isListening && (
              <View className="mt-2">
                <Text className="text-error text-base italic animate-pulse">🔴 Recording Audio...</Text>
              </View>
            )}
            {isProcessing && (
              <View className="mt-2">
                <Text className="text-primary text-base italic">Translating Emotion & Text...</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Listen Button */}
        <View className="mb-6">
          <TactileElement id="btn_emo_listen" label={isListening ? "Stop Listening" : "Start Listening"} description="Toggle speech transcription" type="button" priority={2} onPress={toggleListening}>
            <Button 
              title={isListening ? "⏹️ Stop" : "🎙️ Listen"} 
              onPress={toggleListening} 
              variant={isListening ? 'secondary' : 'primary'} 
              isLoading={isProcessing}
            />
          </TactileElement>
        </View>

      </View>
    </ScreenWrapper>
  );
}
