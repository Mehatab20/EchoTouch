import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { store } from '../store/store';

export const AccessibilityManager = {
  speak: (text: string) => {
    try {
      const state = store.getState().accessibility;
      console.log(`[Speech] Attempting to speak: "${text}", needsVoice: ${state?.capabilities?.needsVoice}`);
      if (state && state.capabilities?.needsVoice) {
        Speech.speak(text, { rate: 1.0, pitch: 1.0 });
      }
    } catch (error) {
      console.error('[Speech Error]', error);
    }
  },

  stopSpeaking: () => {
    Speech.stop();
  }
};

export const AudioSonificationEngine = {
  playTone: (row: number) => {
    // Fallback: If haptics fail, use speech synthesizer to generate rapid sonification tones
    // Row 1 (High), Row 2 (Mid), Row 3 (Low)
    let pitch = 1.0;
    if (row === 1) pitch = 2.0;
    if (row === 2) pitch = 1.0;
    if (row === 3) pitch = 0.5;
    
    // Use a very short sound like 'tick' or 'bloop'
    Speech.speak('tick', { rate: 2.0, pitch });
  }
};
