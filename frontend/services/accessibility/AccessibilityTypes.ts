export type AccessibilityProfile = 'sighted' | 'blind' | 'deaf' | 'deaf-blind' | 'elderly' | 'custom';
export type InputMethod = 'braille' | 'numeric' | 'voice' | 'gesture';

export interface AccessibilityCapabilities {
  canSee: boolean;
  canHear: boolean;
  needsVoice: boolean;
  needsLargeUI: boolean;
  needsHaptics: boolean;
  needsSimplifiedNavigation: boolean; // Triggers ATNL Swipe Gestures
  needsTremorProtection: boolean;     // Requires long-presses instead of quick taps
  needsSimpleDashboard: boolean;      // Condenses UI
  needsExtraConfirmation: boolean;    // Future-proof safety net
}

export interface AccessibilityConfiguration {
  profile: AccessibilityProfile;
  primaryInputMethod: InputMethod;
  capabilities: AccessibilityCapabilities;
}
