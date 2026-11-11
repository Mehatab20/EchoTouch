import { AccessibilityProfile, AccessibilityConfiguration } from './AccessibilityTypes';

export const generateAccessibilityConfiguration = (profile: AccessibilityProfile): AccessibilityConfiguration => {
  switch (profile) {
    case 'blind':
      return {
        profile,
        primaryInputMethod: 'braille',
        capabilities: {
          canSee: false,
          canHear: true,
          needsVoice: true,
          needsLargeUI: false,
          needsHaptics: true,
          needsSimplifiedNavigation: true,
          needsTremorProtection: false,
          needsSimpleDashboard: false,
          needsExtraConfirmation: false,
        }
      };
    
    case 'deaf-blind':
      return {
        profile,
        primaryInputMethod: 'braille',
        capabilities: {
          canSee: false,
          canHear: false,
          needsVoice: false,
          needsLargeUI: false,
          needsHaptics: true,
          needsSimplifiedNavigation: true,
          needsTremorProtection: false,
          needsSimpleDashboard: false,
          needsExtraConfirmation: false,
        }
      };

    case 'deaf':
      return {
        profile,
        primaryInputMethod: 'numeric',
        capabilities: {
          canSee: true,
          canHear: false,
          needsVoice: false,
          needsLargeUI: false,
          needsHaptics: true,
          needsSimplifiedNavigation: false,
          needsTremorProtection: false,
          needsSimpleDashboard: false,
          needsExtraConfirmation: false,
        }
      };

    case 'elderly':
      return {
        profile,
        primaryInputMethod: 'numeric',
        capabilities: {
          canSee: true,
          canHear: true,
          needsVoice: true,
          needsLargeUI: true,
          needsHaptics: true,
          needsSimplifiedNavigation: false,
          needsTremorProtection: true,
          needsSimpleDashboard: true,
          needsExtraConfirmation: true,
        }
      };

    case 'sighted':
    default:
      return {
        profile: 'sighted',
        primaryInputMethod: 'numeric',
        capabilities: {
          canSee: true,
          canHear: true,
          needsVoice: false,
          needsLargeUI: false,
          needsHaptics: true,
          needsSimplifiedNavigation: false,
          needsTremorProtection: false,
          needsSimpleDashboard: false,
          needsExtraConfirmation: false,
        }
      };
  }
};
