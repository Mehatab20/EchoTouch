import * as Haptics from 'expo-haptics';
import { HapticEngine } from '../braille/HapticEngine';

/**
 * Defines the exact Haptic grammar for the ATNL (Adaptive Tactile Navigation Layer).
 */
export const NavigationPatterns = {
  // Layer 1: Screen Identities (Where am I?)
  screen: {
    dashboard: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 300); // Long
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 200); // Short
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 0);   // Long
    },
    sendMoney: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 150); // Short
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 200); // Short
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 0);   // Long
    },
    pin: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 300); // Long
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 300); // Long
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 0);   // Short
    },
    learn: async () => {
      // Wave pattern
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 150);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 150);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 150);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 150);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 0);
    },
    settings: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 200); // Short
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 300); // Long
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 0);   // Short
    },
    emoassist: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 150); // Medium
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 150);  // Light
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 0);   // Medium
    }
  },

  // Layer 3: Element Identities (What kind of thing is this?)
  element: {
    button: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 0); // •
    },
    input: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 100);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 0); // ••
    },
    listItem: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 100);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 150);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 0); // •-•
    },
    toggle: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 80);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 80);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 0); // •••
    },
    danger: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 400); // Long rumble
    }
  },

  // Layer 5: Confirmation (Did it work?)
  action: {
    opened: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 0); // Tiny pulse
    },
    success: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 150);
      await HapticEngine.playFeedback(Haptics.NotificationFeedbackType.Success, 0);
    },
    error: async () => {
      await HapticEngine.playFeedback(Haptics.NotificationFeedbackType.Error, 0);
    }
  },

  // Layer 6: Spatial Direction (QR Code Navigation)
  direction: {
    left: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 100);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 0);
    },
    right: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 80);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 80);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 0);
    },
    up: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 60);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 60);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 0);
    },
    down: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 200);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 0);
    },
    closer: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 400); // Long slow
    },
    further: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 50);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 50);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 50);
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 0);
    },

    perfect: async () => {
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 300); // Buzz
      // Pause is the 300ms delay above
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 150); // Buzz
      await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 0); // Buzz
    }
  }
};
