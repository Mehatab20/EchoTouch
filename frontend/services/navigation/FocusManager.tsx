import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { TactileElementData, NavState } from './types';
import { NavigationPatterns } from './NavigationPatterns';
import { NavigationMemory } from './NavigationMemory';
import { AccessibilityManager } from '../accessibilityManager';
import { SpatialReplayEngine } from '../braille/SpatialReplayEngine';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface FocusContextProps {
  elements: TactileElementData[];
  focusedIndex: number;
  registerElement: (element: TactileElementData) => void;
  unregisterElement: (id: string) => void;
  next: () => void;
  previous: () => void;
  activate: () => void;
  describe: () => void;
  setScreenName: (name: string) => void;
  isATNLPaused: boolean;
  setATNLPaused: (paused: boolean) => void;
  navState: NavState;
  setNavState: (state: NavState) => void;
}

const FocusContext = createContext<FocusContextProps | undefined>(undefined);

export const FocusManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [elements, setElements] = useState<TactileElementData[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [screenName, setScreenName] = useState<string>('default');
  const [isATNLPaused, setATNLPaused] = useState<boolean>(false);
  const [navState, setNavState] = useState<NavState>('NAVIGATION');
  
  const { capabilities } = useSelector((state: RootState) => state.accessibility);

  // Restore focus from memory when screen changes or elements load
  useEffect(() => {
    if (elements.length > 0) {
      const saved = NavigationMemory.getSavedFocus(screenName);
      if (saved < elements.length) {
        setFocusedIndex(saved);
      } else {
        setFocusedIndex(0);
      }
    }
  }, [screenName, elements.length]);

  const registerElement = useCallback((element: TactileElementData) => {
    setElements(prev => {
      if (prev.find(e => e.id === element.id)) return prev;
      return [...prev, element].sort((a, b) => (a.priority || 0) - (b.priority || 0));
    });
  }, []);

  const unregisterElement = useCallback((id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
  }, []);

  const triggerElementHapticAndVoice = async (element: TactileElementData) => {
    // 1. Play Element Identity Haptic
    const pattern = NavigationPatterns.element[element.type];
    if (pattern && capabilities.needsHaptics) await pattern();

    // 2. Play Voice if enabled, OR Spatial Braille Replay if Deaf-Blind
    if (capabilities.needsVoice) {
      AccessibilityManager.speak(element.label);
    } else if (capabilities.needsHaptics) {
      // For Deaf-Blind users, replay the element label in Braille
      SpatialReplayEngine.replayString(element.label);
    }
  };

  const next = useCallback(() => {
    if (elements.length === 0 || navState === 'PROCESSING' || navState === 'SUCCESS' || navState === 'INPUT') return;
    const newIdx = (focusedIndex + 1) % elements.length;
    setFocusedIndex(newIdx);
    NavigationMemory.saveFocus(screenName, newIdx);
    triggerElementHapticAndVoice(elements[newIdx]);
  }, [elements, focusedIndex, screenName, capabilities, navState]);

  const previous = useCallback(() => {
    if (elements.length === 0 || navState === 'PROCESSING' || navState === 'SUCCESS' || navState === 'INPUT') return;
    const newIdx = (focusedIndex - 1 + elements.length) % elements.length;
    setFocusedIndex(newIdx);
    NavigationMemory.saveFocus(screenName, newIdx);
    triggerElementHapticAndVoice(elements[newIdx]);
  }, [elements, focusedIndex, screenName, capabilities, navState]);

  const activate = useCallback(async () => {
    if (elements.length === 0 || navState === 'PROCESSING' || navState === 'SUCCESS' || navState === 'INPUT') return;
    const el = elements[focusedIndex];
    setNavState('ACTIVATION');
    if (capabilities.needsHaptics) await NavigationPatterns.action.opened();
    el.onPress();
    // Return to NAVIGATION state after activation unless the component overrides it (e.g. PinEntry going to INPUT)
    setTimeout(() => setNavState('NAVIGATION'), 500);
  }, [elements, focusedIndex, navState, capabilities.needsHaptics]);

  const describe = useCallback(async () => {
    if (elements.length === 0 || navState === 'PROCESSING' || navState === 'SUCCESS' || navState === 'INPUT') return;
    const el = elements[focusedIndex];
    // Short explanation vibration
    if (capabilities.needsHaptics) await NavigationPatterns.element.danger(); // Reusing a rumble for context alert, or maybe just a short pulse
    
    if (capabilities.needsVoice) {
      AccessibilityManager.speak(el.description);
    }
  }, [elements, focusedIndex, capabilities, navState]);

  const contextValue = useMemo(() => ({
    elements, focusedIndex, registerElement, unregisterElement,
    next, previous, activate, describe, setScreenName,
    isATNLPaused, setATNLPaused, navState, setNavState
  }), [
    elements, focusedIndex, registerElement, unregisterElement,
    next, previous, activate, describe, setScreenName,
    isATNLPaused, setATNLPaused, navState, setNavState
  ]);

  return (
    <FocusContext.Provider value={contextValue}>
      {children}
    </FocusContext.Provider>
  );
};

export const useFocusManager = () => {
  const context = useContext(FocusContext);
  if (!context) throw new Error('useFocusManager must be used within FocusManagerProvider');
  return context;
};
