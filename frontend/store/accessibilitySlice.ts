import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { AccessibilityProfile, InputMethod, AccessibilityCapabilities } from '../services/accessibility/AccessibilityTypes';
import { generateAccessibilityConfiguration } from '../services/accessibility/CapabilityGenerator';

export type ContextEnvironment = 'normal' | 'quiet' | 'airport' | 'library' | 'low-battery';

export interface ExplainabilityLog {
  context: string;
  reasoning: string;
  timestamp: number;
}

export interface AccessibilityState {
  profile: AccessibilityProfile;
  primaryInputMethod: InputMethod;
  capabilities: AccessibilityCapabilities;
  
  pinLength: 4 | 6;
  hasCompletedProfile: boolean;
  
  // Context Engine
  environment: ContextEnvironment;
  explainabilityLog: ExplainabilityLog | null;
  
  // Analytics & Adaptive AI
  totalBrailleAttempts: number;
  correctBrailleAttempts: number;
  pinEntryTimes: number[];
  learnedDigits: number[];
  failedDots: Record<number, number>; // Maps dot index (1-6) to failure count
  expertiseLevel: 'Beginner' | 'Expert';
}

const initialConfig = generateAccessibilityConfiguration('blind');

const initialState: AccessibilityState = {
  profile: initialConfig.profile,
  primaryInputMethod: initialConfig.primaryInputMethod,
  capabilities: initialConfig.capabilities,
  
  pinLength: 6,
  hasCompletedProfile: false,
  environment: 'normal',
  explainabilityLog: null,
  totalBrailleAttempts: 0,
  correctBrailleAttempts: 0,
  pinEntryTimes: [],
  learnedDigits: [],
  failedDots: {},
  expertiseLevel: 'Beginner',
};

const accessibilitySlice = createSlice({
  name: 'accessibility',
  initialState,
  reducers: {
    completeProfile: (state) => {
      state.hasCompletedProfile = true;
    },
    setEnvironment: (state, action: PayloadAction<ContextEnvironment>) => {
      state.environment = action.payload;
      
      let reasoning = '';
      if (action.payload === 'airport') {
        state.capabilities.needsVoice = false;
        state.capabilities.needsHaptics = true;
        state.capabilities.needsLargeUI = true; // Gesture-Input Only Morphing
        reasoning = 'High ambient noise detected. Voice guidance muted, UI morphed to Gesture-Input Only mode.';
      } else if (action.payload === 'library') {
        state.capabilities.needsVoice = true;
        state.capabilities.needsHaptics = true;
        reasoning = 'Quiet environment detected. Voice volume minimized, gentle haptics enabled.';
      } else if (action.payload === 'quiet') {
        state.capabilities.needsVoice = true;
        state.capabilities.needsHaptics = false;
        reasoning = 'Ultra-quiet environment detected. Haptics disabled to prevent buzzing noise.';
      } else if (action.payload === 'low-battery') {
        state.capabilities.needsHaptics = false;
        reasoning = 'Low battery detected. Haptic feedback disabled to conserve power.';
      } else {
        // Normal
        state.capabilities.needsVoice = state.profile !== 'deaf-blind' && state.profile !== 'deaf';
        state.capabilities.needsHaptics = true;
        state.capabilities.needsLargeUI = state.profile === 'elderly'; // Reset
        reasoning = 'Normal environment detected. Default interaction model restored.';
      }

      state.explainabilityLog = {
        context: `Context: ${action.payload.toUpperCase()}`,
        reasoning,
        timestamp: Date.now()
      };
    },
    logExplainability: (state, action: PayloadAction<{ context: string, reasoning: string }>) => {
      state.explainabilityLog = {
        ...action.payload,
        timestamp: Date.now()
      };
    },
    clearExplainabilityLog: (state) => {
      state.explainabilityLog = null;
    },
    setProfile: (state, action: PayloadAction<AccessibilityProfile>) => {
      const config = generateAccessibilityConfiguration(action.payload);
      state.profile = config.profile;
      state.primaryInputMethod = config.primaryInputMethod;
      state.capabilities = config.capabilities;
    },
    updateCapabilities: (state, action: PayloadAction<Partial<AccessibilityCapabilities>>) => {
      state.profile = 'custom';
      state.capabilities = { ...state.capabilities, ...action.payload };
    },
    updatePrimaryInputMethod: (state, action: PayloadAction<InputMethod>) => {
      state.profile = 'custom';
      state.primaryInputMethod = action.payload;
    },
    updatePinLength: (state, action: PayloadAction<4 | 6>) => {
      state.pinLength = action.payload;
    },
    logBrailleAttempt: (state, action: PayloadAction<boolean>) => {
      state.totalBrailleAttempts += 1;
      if (action.payload) {
        state.correctBrailleAttempts += 1;
      }
    },
    logPinEntryTime: (state, action: PayloadAction<number>) => {
      state.pinEntryTimes.push(action.payload);
    },
    logLearnedDigit: (state, action: PayloadAction<number>) => {
      if (!state.learnedDigits.includes(action.payload)) {
        state.learnedDigits.push(action.payload);
      }
    },
    logFailedDot: (state, action: PayloadAction<number>) => {
      const dot = action.payload;
      if (!state.failedDots[dot]) {
        state.failedDots[dot] = 0;
      }
      state.failedDots[dot] += 1;
    },
    resetFailedDots: (state) => {
      state.failedDots = {};
    },
    evaluateExpertise: (state) => {
      if (state.expertiseLevel === 'Expert') return; // Already expert
      
      const { totalBrailleAttempts, correctBrailleAttempts, pinEntryTimes } = state;
      if (totalBrailleAttempts < 5) return;
      
      const accuracy = correctBrailleAttempts / totalBrailleAttempts;
      
      let isExpert = false;
      if (pinEntryTimes.length > 0) {
        const avgTime = pinEntryTimes.reduce((a, b) => a + b, 0) / pinEntryTimes.length;
        if (accuracy > 0.80 && avgTime < 5000) isExpert = true;
      } else if (accuracy > 0.80 && totalBrailleAttempts >= 5) {
        isExpert = true;
      }
      
      if (isExpert && state.expertiseLevel === 'Beginner') {
        state.expertiseLevel = 'Expert';
        state.explainabilityLog = {
          context: '🧠 USER MODEL: EXPERT',
          reasoning: 'Expert proficiency detected based on high accuracy. Voice prompts shortened, Replay pacing increased.',
          timestamp: Date.now()
        };
      }
    }
  },
});

export const selectUserExpertise = (state: { accessibility: AccessibilityState }) => state.accessibility.expertiseLevel;

export const { 
  completeProfile, 
  setEnvironment,
  logExplainability,
  clearExplainabilityLog,
  setProfile, 
  updateCapabilities, 
  updatePrimaryInputMethod,
  updatePinLength, 
  logBrailleAttempt, 
  logPinEntryTime, 
  logLearnedDigit, 
  logFailedDot, 
  resetFailedDots,
  evaluateExpertise
} = accessibilitySlice.actions;
export default accessibilitySlice.reducer;
