import React, { useState, useRef, useEffect } from 'react';
import { View, Text, PanResponder, useWindowDimensions, TouchableOpacity, Keyboard } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { AccessibilityManager } from '../services/accessibilityManager';
import { HapticEngine } from '../services/braille/HapticEngine';
import { SpatialReplayEngine } from '../services/braille/SpatialReplayEngine';
import { BrailleTranslator } from '../services/braille/BrailleDictionary';
import { useFocusManager, TactileElement } from '../services/navigation/NavigationEngine';
import * as Haptics from 'expo-haptics';

interface BrailleKeyboardProps {
  text: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  placeholder?: string;
  mode?: 'alpha' | 'numeric';
}

export const BrailleKeyboard: React.FC<BrailleKeyboardProps> = ({ text, onChangeText, onClose, placeholder = "Search...", mode = 'alpha' }) => {
  const { capabilities, profile } = useSelector((state: RootState) => state.accessibility);
  
  const { width, height } = useWindowDimensions();
  const [activeDots, setActiveDots] = useState<number[]>([]);
  const { setATNLPaused } = useFocusManager();

  const submitRef = useRef<() => void>(() => {});
  const deleteRef = useRef<() => void>(() => {});
  const spaceRef = useRef<() => void>(() => {});
  const readoutRef = useRef<() => void>(() => {});
  const closeRef = useRef<() => void>(() => {});
  
  const activeFingers = useRef<{ [id: number]: { startX: number, startY: number, startTime: number, lastDot: number | null | 'CENTER' } }>({});
  const activeDotsRef = useRef<number[]>([]);
  const centerTimeout = useRef<any>(null);

  useEffect(() => {
    activeDotsRef.current = activeDots;
  }, [activeDots]);

  // Pause ATNL while keyboard is open so swiping doesn't conflict
  useEffect(() => {
    setATNLPaused(true);
    // Dismiss normal system keyboard if it's somehow open
    Keyboard.dismiss();
    return () => setATNLPaused(false);
  }, [setATNLPaused]);

  const getDotFromCoordinates = (x: number, y: number, screenWidth: number, screenHeight: number): number | null | 'CENTER' => {
    // Gesture Safe Zone (Center 30%)
    if (x > screenWidth * 0.35 && x < screenWidth * 0.65) {
      return 'CENTER';
    }

    const thirdHeight = screenHeight / 3;

    if (x < screenWidth / 2) {
      // Left side (Dots 1, 2, 3)
      if (y < thirdHeight) return 1;
      if (y < 2 * thirdHeight) return 2;
      return 3;
    } else {
      // Right side (Dots 4, 5, 6)
      if (y < thirdHeight) return 4;
      if (y < 2 * thirdHeight) return 5;
      return 6;
    }
  };

  const handleTouchStart = (touches: readonly any[]) => {
    for (const touch of touches) {
      const { identifier, pageX, pageY } = touch;
      if (!activeFingers.current[identifier]) {
        const dot = getDotFromCoordinates(pageX, pageY, width, height);
        activeFingers.current[identifier] = {
          startX: pageX,
          startY: pageY,
          startTime: Date.now(),
          lastDot: dot,
        };

        if (dot === 'CENTER') {
          centerTimeout.current = setTimeout(() => {
            HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy);
            closeRef.current();
          }, 800);
        }
      }
    }
  };

  const handleTouchMove = (touches: readonly any[]) => {
    for (const touch of touches) {
      const { identifier, pageX, pageY } = touch;
      const state = activeFingers.current[identifier];
      if (state) {
        const dx = pageX - state.startX;
        const dy = pageY - state.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (state.lastDot === 'CENTER' && distance > 20) {
          if (centerTimeout.current) {
            clearTimeout(centerTimeout.current);
            centerTimeout.current = null;
          }
        }
      }
    }
  };

  const handleTouchEnd = (changedTouches: readonly any[]) => {
    if (centerTimeout.current) {
      clearTimeout(centerTimeout.current);
      centerTimeout.current = null;
    }

    let swipeDetected: 'left' | 'right' | 'down' | null = null;

    for (const touch of changedTouches) {
      const { identifier, pageX, pageY } = touch;
      const state = activeFingers.current[identifier];
      if (state) {
        const duration = Date.now() - state.startTime;
        const dx = pageX - state.startX;
        const dy = pageY - state.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (duration < 300 && distance < 25) {
          const dot = state.lastDot;
          if (dot !== null && dot !== 'CENTER') {
            HapticEngine.dotTap(dot as number);
            setActiveDots(prev => {
              const alreadyActive = prev.includes(dot as number);
              const newDots = alreadyActive ? prev.filter(d => d !== dot) : [...prev, (dot as number)];
              newDots.sort((a, b) => a - b);
              return newDots;
            });
          }
        } else {
          // Swipe detection
          if (dy > 50) swipeDetected = 'down';
          else if (dx > 50) swipeDetected = 'right';
          else if (dx < -50) swipeDetected = 'left';
        }

        delete activeFingers.current[identifier];
      }
    }

    if (swipeDetected === 'down') {
      readoutRef.current();
    } else if (swipeDetected === 'right') {
      if (activeDotsRef.current.length === 0) {
        spaceRef.current();
      } else {
        submitRef.current();
      }
    } else if (swipeDetected === 'left') {
      deleteRef.current();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleTouchStart(evt.nativeEvent.touches || []);
      },
      onPanResponderMove: (evt) => {
        handleTouchMove(evt.nativeEvent.touches || []);
      },
      onPanResponderRelease: (evt, gestureState) => {
        handleTouchEnd(evt.nativeEvent.changedTouches || []);
      },
      onPanResponderTerminate: (evt, gestureState) => {
        handleTouchEnd(evt.nativeEvent.changedTouches || []);
      }
    })
  ).current;

  useEffect(() => {
    if (capabilities.needsVoice && mode === 'numeric') {
      AccessibilityManager.speak('Numeric Braille Keyboard Opened');
    }
  }, [mode, capabilities.needsVoice]);

  submitRef.current = () => {
    const dots = activeDotsRef.current;
    if (dots.length === 0) return;
    
    const char = BrailleTranslator.getCharForDots(dots, mode);
    
    if (char) {
      // Valid Character
      onChangeText(text + char);
      HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Medium);
      if (capabilities.needsVoice) {
        AccessibilityManager.speak(char);
      }
    } else {
      // Invalid Character
      HapticEngine.longError();
      if (capabilities.needsVoice) {
        AccessibilityManager.speak('Invalid combination');
      }
    }
    
    setActiveDots([]);
  };

  deleteRef.current = () => {
    if (text.length > 0) {
      const deletedChar = text.slice(-1);
      onChangeText(text.slice(0, -1));
      HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy);
      if (capabilities.needsVoice) {
        AccessibilityManager.speak(`Deleted ${deletedChar}`);
      }
    } else {
      HapticEngine.longError();
    }
  };

  spaceRef.current = () => {
    onChangeText(text + ' ');
    HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light);
    if (capabilities.needsVoice) {
      AccessibilityManager.speak('Space');
    }
  };

  readoutRef.current = () => {
    if (capabilities.needsVoice) {
      AccessibilityManager.speak(text.length > 0 ? text : placeholder);
    }
    // For Deaf-Blind, replay the current text
    if (capabilities.needsHaptics && !capabilities.needsVoice) {
       SpatialReplayEngine.replayString(text.length > 0 ? text : "BLANK");
    }
  };

  closeRef.current = () => {
    if (capabilities.needsVoice) {
      AccessibilityManager.speak('Closing keyboard');
    }
    onClose();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} {...panResponder.panHandlers}>
      {/* Visual Feedback for Sighted Testing/Debugging */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#888', fontSize: 18, marginBottom: 10 }}>Search Query</Text>
        <Text style={{ color: '#fff', fontSize: 42, fontWeight: 'bold', minHeight: 60, textAlign: 'center' }}>
          {text || placeholder}
        </Text>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 200, justifyContent: 'center', marginTop: 40 }}>
          {[1, 4, 2, 5, 3, 6].map(dot => (
            <View key={dot} style={{
              width: 60, height: 60, borderRadius: 30, margin: 10,
              backgroundColor: activeDots.includes(dot) ? '#4ade80' : '#333'
            }} />
          ))}
        </View>

        <Text style={{ color: '#666', fontSize: 14, marginTop: 40, textAlign: 'center' }}>
          Swipe Right: Space/Submit Dot Cell{'\n'}
          Swipe Left: Backspace{'\n'}
          Long Press Center: Close Keyboard
        </Text>
      </View>
    </View>
  );
};
