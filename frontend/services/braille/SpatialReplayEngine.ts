import { HapticEngine } from './HapticEngine';
import { HapticLogger } from './HapticLogger';
import * as Haptics from 'expo-haptics';
import { AudioSonificationEngine } from '../accessibilityManager';
import { BrailleTranslator } from './BrailleDictionary';

let currentReplayId = 0;

export const SpatialReplayEngine = {
  stopReplay: () => {
    currentReplayId++;
  },

  replayString: async (text: string, userExpertise: 'Beginner' | 'Expert' | string = 'Beginner'): Promise<void> => {
    currentReplayId++;
    const myId = currentReplayId;
    
    // Clear the global queue so overlapping navigation swipes don't backlog
    HapticEngine.clearQueue();

    HapticLogger.log(`[SBRE] Replaying string: "${text}"`);
    for (let i = 0; i < text.length; i++) {
      if (myId !== currentReplayId) break; // Stop if another replay started
      
      const char = text[i];
      if (char === ' ') {
        await new Promise(resolve => setTimeout(resolve, 300)); // Shorter space pause
        continue;
      }
      
      const dots = BrailleTranslator.getDotsForChar(char);
      if (dots.length > 0) {
        // String mode is inherently faster to prevent endless vibrations
        await SpatialReplayEngine.replay(dots, 'FastString');
        
        if (myId !== currentReplayId) break;
        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second gap between characters
      }
    }
  },

  replay: async (activeDots: number[], userExpertise: 'Beginner' | 'Expert' | 'FastString' | string = 'Beginner'): Promise<void> => {
    // Haptic playback timings
    let baseDelay = 300; // Time between dots in a row
    let rowDelay = 600;  // Time between rows
    
    if (userExpertise === 'Expert') {
      baseDelay = 50;
      rowDelay = 100;
    } else if (userExpertise === 'FastString') {
      // Made slower for non-Braille readers to understand the characters clearly
      baseDelay = 250;
      rowDelay = 400;
    }

    HapticLogger.log(`[SBRE] Starting spatial replay for dots: [${activeDots.join(',')}] with expertise: ${userExpertise}`);

    // If haptics are disabled (e.g. low battery / broken motor), fallback to 3D Audio Sonification
    if (!HapticEngine.getEnabled()) {
      HapticLogger.log(`[SBRE] Haptics disabled. Falling back to Audio Sonification Engine.`);
      for (let row = 1; row <= 3; row++) {
        const leftDot = row;
        const rightDot = row + 3;
        
        const playAudioDot = async (dot: number) => {
          if (activeDots.includes(dot)) {
            AudioSonificationEngine.playTone(row);
          }
          await new Promise(resolve => setTimeout(resolve, baseDelay));
        };
        
        await playAudioDot(leftDot);
        await playAudioDot(rightDot);
        
        if (row < 3) {
           await new Promise(resolve => setTimeout(resolve, rowDelay));
        }
      }
      return;
    }

    return HapticEngine.enqueue(async () => {
      // If it's a FastString replay, we check the token
      const myId = currentReplayId;
      for (let row = 1; row <= 3; row++) {
        if (userExpertise === 'FastString' && currentReplayId !== myId) return;

        const leftDot = row;
        const rightDot = row + 3;
        
        let rowStyle = Haptics.ImpactFeedbackStyle.Light;
        if (row === 1) rowStyle = Haptics.ImpactFeedbackStyle.Light;  
        if (row === 2) rowStyle = Haptics.ImpactFeedbackStyle.Medium; 
        if (row === 3) rowStyle = Haptics.ImpactFeedbackStyle.Heavy;  

        const playDot = async (dot: number) => {
          if (activeDots.includes(dot)) {
            await HapticEngine.playFeedback(rowStyle);
          }
          await new Promise(resolve => setTimeout(resolve, baseDelay));
        };
        
        await playDot(leftDot);
        await playDot(rightDot);
        
        if (row < 3) {
           await new Promise(resolve => setTimeout(resolve, rowDelay));
        }
      }
      
      HapticLogger.log(`[SBRE] Replay sequence completed.`);
    }, 'spatialReplay');
  }
};
