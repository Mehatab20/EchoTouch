import React, { useState, useRef, useEffect } from 'react';
import { View, Text, PanResponder, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { AccessibilityManager } from '../services/accessibilityManager';
import { HapticEngine } from '../services/braille/HapticEngine';
import { SpatialReplayEngine } from '../services/braille/SpatialReplayEngine';
import { logBrailleAttempt, logPinEntryTime, selectUserExpertise } from '../store/accessibilitySlice';
import { useFocusManager, TactileElement } from '../services/navigation/NavigationEngine';
import * as Haptics from 'expo-haptics';

interface PinEntryProps {
  pin: string;
  onPinChange: (newPin: string) => void;
  maxLength?: number;
  onBack?: () => void;
}

// Standard Braille Number mapping
const brailleMap: Record<string, string> = {
  // A-J / 1-0
  '1': '1', '1,2': '2', '1,4': '3', '1,4,5': '4', '1,5': '5',
  '1,2,4': '6', '1,2,4,5': '7', '1,2,5': '8', '2,4': '9', '2,4,5': '0',
  // K-T
  '1,3': 'K', '1,2,3': 'L', '1,3,4': 'M', '1,3,4,5': 'N', '1,3,5': 'O',
  '1,2,3,4': 'P', '1,2,3,4,5': 'Q', '1,2,3,5': 'R', '2,3,4': 'S', '2,3,4,5': 'T',
  // U-Z
  '1,3,6': 'U', '1,2,3,6': 'V', '2,4,5,6': 'W', '1,3,4,6': 'X', '1,3,4,5,6': 'Y', '1,3,5,6': 'Z'
};

export const PinEntry: React.FC<PinEntryProps> = ({ pin, onPinChange, maxLength = 6, onBack }) => {
  const dispatch = useDispatch();
  const { primaryInputMethod, profile } = useSelector((state: RootState) => state.accessibility);
  
  const { width, height } = useWindowDimensions();
  const [activeDots, setActiveDots] = useState<number[]>([]);
  const [isVerifyingPattern, setIsVerifyingPattern] = useState<boolean>(false);
  const [startTime] = useState<number>(Date.now());
  const { setATNLPaused, setNavState, navState } = useFocusManager();

  const userExpertise = useSelector(selectUserExpertise);

  const submitRef = useRef<() => void>(() => {});
  const deleteRef = useRef<() => void>(() => {});
  const clearAllRef = useRef<() => void>(() => {});
  const readoutRef = useRef<() => void>(() => {});
  
  // Track concurrent touches and tap times
  const activeFingers = useRef<{ [id: number]: { startX: number, startY: number, startTime: number, lastDot: number | null | 'CENTER' } }>({});
  const lastTapTimes = useRef<{ [dot: number]: number }>({});
  
  const activeDotsRef = useRef<number[]>([]);
  const isVerifyingPatternRef = useRef<boolean>(false);
  const navStateRef = useRef<string>(navState);
  const twoFingerTimeout = useRef<any>(null);
  const centerTimeout = useRef<any>(null);

  useEffect(() => {
    activeDotsRef.current = activeDots;
  }, [activeDots]);

  useEffect(() => {
    isVerifyingPatternRef.current = isVerifyingPattern;
  }, [isVerifyingPattern]);

  useEffect(() => {
    navStateRef.current = navState;
  }, [navState]);

  const getDotFromCoordinates = (x: number, y: number, screenWidth: number, screenHeight: number): number | null | 'CENTER' => {
    // Gesture Safe Zone (Center 30%) - ignores normal taps and acts as a safe area
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

  const triggerPinPositionReminder = () => {
    if (navStateRef.current === 'PROCESSING') return;
    const pulseCount = Math.min(pin.length + 1, maxLength);
    HapticEngine.playPinPositionReminder(pulseCount);
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
          lastDot: dot
        };
        if (dot !== null && dot !== 'CENTER') {
          HapticEngine.dotTap(dot);
        } else if (dot === 'CENTER') {
          if (centerTimeout.current) clearTimeout(centerTimeout.current);
          centerTimeout.current = setTimeout(() => {
            HapticEngine.confirmPulse();
            if (onBack) onBack();
          }, 800);
        }
      }
    }

    const fingerCount = Object.keys(activeFingers.current).length;
    if (fingerCount === 2) {
      if (twoFingerTimeout.current) clearTimeout(twoFingerTimeout.current);
      twoFingerTimeout.current = setTimeout(() => {
        triggerPinPositionReminder();
      }, 800);
    } else {
      if (twoFingerTimeout.current) {
        clearTimeout(twoFingerTimeout.current);
        twoFingerTimeout.current = null;
      }
    }
  };

  const handleTouchMove = (touches: readonly any[]) => {
    for (const touch of touches) {
      const { identifier, pageX, pageY } = touch;
      const state = activeFingers.current[identifier];
      if (state) {
        // Cancel two-finger long press and center long press if any finger moves significantly
        const dx = pageX - state.startX;
        const dy = pageY - state.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 30) {
          if (twoFingerTimeout.current) {
            clearTimeout(twoFingerTimeout.current);
            twoFingerTimeout.current = null;
          }
          if (centerTimeout.current) {
            clearTimeout(centerTimeout.current);
            centerTimeout.current = null;
          }
        }

        const dot = getDotFromCoordinates(pageX, pageY, width, height);
        if (state.lastDot !== dot) {
          state.lastDot = dot;
          if (dot !== null && dot !== 'CENTER') {
            HapticEngine.dotTap(dot as number);
          }
        }
      }
    }
  };

  const handleTouchEnd = (changedTouches: readonly any[], gestureState: any) => {
    if (twoFingerTimeout.current) {
      clearTimeout(twoFingerTimeout.current);
      twoFingerTimeout.current = null;
    }
    if (centerTimeout.current) {
      clearTimeout(centerTimeout.current);
      centerTimeout.current = null;
    }

    let swipeDetected: 'left' | 'right' | 'down' | 'long_left' | null = null;

    for (const touch of changedTouches) {
      const { identifier, pageX, pageY } = touch;
      const state = activeFingers.current[identifier];
      if (state) {
        const duration = Date.now() - state.startTime;
        const dx = pageX - state.startX;
        const dy = pageY - state.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (duration < 300 && distance < 25) {
          // Instantly toggle the dot on a single tap (Perkins Brailler style)
          const dot = state.lastDot;
          if (dot !== null && dot !== 'CENTER') {
            HapticEngine.dotTap(dot as number);
            setActiveDots(prev => {
              const alreadyActive = prev.includes(dot as number);
              const newDots = alreadyActive ? prev.filter(d => d !== dot) : [...prev, (dot as number)];
              newDots.sort((a, b) => a - b);
              return newDots;
            });
            // Reset verification mode if user edits the chord
            setIsVerifyingPattern(false);
          }
        } else {
          // Check for swipe gesture params from this specific finger release
          if (dy > 50) swipeDetected = 'down';
          else if (dx > 50) swipeDetected = 'right';
          else if (dx < -150) swipeDetected = 'long_left';
          else if (dx < -50) swipeDetected = 'left';
        }

        delete activeFingers.current[identifier];
      }
    }

    // If a swipe gesture was registered by a finger release, execute it
    if (swipeDetected === 'down') {
      readoutRef.current();
    } else if (swipeDetected === 'right') {
      submitRef.current();
    } else if (swipeDetected === 'long_left') {
      clearAllRef.current();
    } else if (swipeDetected === 'left') {
      deleteRef.current();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => navStateRef.current !== 'PROCESSING',
      onMoveShouldSetPanResponder: () => navStateRef.current !== 'PROCESSING',
      onPanResponderGrant: (evt) => {
        if (navStateRef.current === 'PROCESSING') return;
        const touches = evt.nativeEvent.touches || [];
        handleTouchStart(touches);
      },
      onPanResponderMove: (evt) => {
        if (navStateRef.current === 'PROCESSING') return;
        const touches = evt.nativeEvent.touches || [];
        handleTouchMove(touches);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (navStateRef.current === 'PROCESSING') return;
        const changedTouches = evt.nativeEvent.changedTouches || [];
        handleTouchEnd(changedTouches, gestureState);
      },
      onPanResponderTerminate: (evt, gestureState) => {
        if (navStateRef.current === 'PROCESSING') return;
        const changedTouches = evt.nativeEvent.changedTouches || [];
        handleTouchEnd(changedTouches, gestureState);
      }
    })
  ).current;

  useEffect(() => {
    submitRef.current = handleSwipeRight;
    deleteRef.current = handleSwipeLeft;
    clearAllRef.current = handleLongSwipeLeft;
    readoutRef.current = readoutBuffer;
  });

  useEffect(() => {
    if (primaryInputMethod === 'braille') {
      if (profile === 'deaf-blind') {
        HapticEngine.playSecureModeEntry();
      }
      setATNLPaused(true);
      setNavState('INPUT');
    }
    return () => {
      if (primaryInputMethod === 'braille') {
        if (profile === 'deaf-blind') {
          HapticEngine.playSecureModeExit();
        }
      }
      setATNLPaused(false);
      setNavState('NAVIGATION');
    };
  }, [primaryInputMethod, setATNLPaused, setNavState, profile]);

  const handleSwipeLeft = () => {
    if (navStateRef.current === 'PROCESSING') return;

    if (activeDotsRef.current.length > 0 || isVerifyingPatternRef.current) {
      setActiveDots([]);
      setIsVerifyingPattern(false);
      HapticEngine.tap();
    } else {
      handleDelete();
    }
  };

  const handleLongSwipeLeft = () => {
    if (navStateRef.current === 'PROCESSING') return;
    HapticEngine.tap();
    onPinChange('');
    setActiveDots([]);
    setIsVerifyingPattern(false);
  };

  const handleDelete = () => {
    if (navStateRef.current === 'PROCESSING') return;
    HapticEngine.tap();
    if (pin.length > 0) {
      onPinChange(pin.slice(0, -1));
    } else {
      // Secondary shortcut: Swipe Left when empty goes back
      HapticEngine.confirmPulse();
      if (onBack) onBack();
    }
  };

  const readoutBuffer = () => {
    if (navStateRef.current === 'PROCESSING') return;
    HapticEngine.tap();
    if (pin.length === 0) {
      AccessibilityManager.speak("Buffer is empty.");
      return;
    }
    
    // Absolute Acoustic Privacy: speak only the digit count
    AccessibilityManager.speak(`${pin.length} digits entered.`);
  };

  const handleNumericPress = (digit: string) => {
    if (navStateRef.current === 'PROCESSING') return;
    HapticEngine.tap();
    if (pin.length < maxLength) {
      const newPin = pin + digit;
      onPinChange(newPin);
      if (newPin.length === maxLength) {
        dispatch(logPinEntryTime((Date.now() - startTime) / 1000));
      }
    }
  };

  const handleSwipeRight = () => {
    if (navStateRef.current === 'PROCESSING') return;

    if (activeDotsRef.current.length === 0) {
      HapticEngine.error();
      return;
    }

    if (!isVerifyingPatternRef.current) {
      // Swipe Right 1 (Verify)
      const dotsToReplay = [...activeDotsRef.current];
      SpatialReplayEngine.replay(dotsToReplay, userExpertise);
      setIsVerifyingPattern(true);
    } else {
      // Swipe Right 2 (Confirm & Next)
      const pattern = activeDotsRef.current.join(',');
      const digit = brailleMap[pattern];

      if (digit) {
        dispatch(logBrailleAttempt(true));
        HapticEngine.confirmPulse();

        if (pin.length < maxLength) {
          const newPin = pin + digit;
          onPinChange(newPin);

          if (newPin.length === maxLength) {
            dispatch(logPinEntryTime((Date.now() - startTime) / 1000));
          }
        }
      } else {
        dispatch(logBrailleAttempt(false));
        HapticEngine.error();
      }

      setActiveDots([]);
      setIsVerifyingPattern(false);
    }
  };

  const renderBrailleDot = (dot: number) => {
    const isActive = activeDots.includes(dot);
    return (
      <View
        key={dot}
        className={`w-24 h-24 m-3 rounded-full items-center justify-center border-4 ${
          isActive ? 'bg-primary border-primary' : 'bg-surface border-[#444]'
        }`}
        accessibilityLabel={`Dot ${dot}`}
        accessibilityState={{ checked: isActive }}
      >
        <Text className={`text-2xl font-bold ${isActive ? 'text-[#121212]' : 'text-textMuted'}`}>{dot}</Text>
      </View>
    );
  };

  const renderNumericKeypad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'DEL']
    ];

    return (
      <View className="flex-1 items-center justify-center w-full px-4">
        {rows.map((row, rIdx) => (
          <View key={rIdx} className="flex-row justify-between w-full mb-6">
            {row.map((btn, cIdx) => (
              <View key={cIdx} className="w-[30%] aspect-square">
                {btn !== '' && (
                  <TactileElement 
                    id={`numpad_${btn}`} 
                    label={btn === 'DEL' ? 'Delete' : btn} 
                    description={btn === 'DEL' ? 'Delete last digit' : `Enter ${btn}`}
                    type="button" 
                    priority={1} 
                    onPress={() => btn === 'DEL' ? handleDelete() : handleNumericPress(btn)}
                    className="flex-1"
                  >
                    <View
                      className="flex-1 bg-surface rounded-2xl items-center justify-center border border-[#333]"
                    >
                      <Text className="text-4xl font-bold text-text">{btn}</Text>
                    </View>
                  </TactileElement>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View 
      className="flex-1 w-full"
      {...(primaryInputMethod === 'braille' ? panResponder.panHandlers : {})}
    >
      <View 
        pointerEvents={primaryInputMethod === 'braille' ? 'none' : 'auto'}
        className="flex-1 items-center w-full justify-center"
      >
        {/* PIN Display */}
        <TouchableOpacity
          delayLongPress={600}
          onLongPress={triggerPinPositionReminder}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={`PIN Progress Indicator. ${pin.length} out of ${maxLength} digits entered. Long press to play position reminder.`}
        >
          <View 
            className="flex-row mb-8 justify-center w-full"
            accessibilityRole="none"
          >
            {Array.from({ length: maxLength }).map((_, index) => (
              <View 
                key={index}
                className="mx-2 items-center justify-center"
              >
                <Text className="text-3xl text-primary font-bold">
                  {index < pin.length ? '●' : '○'}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {primaryInputMethod === 'braille' ? (
          <View className="flex-1 items-center w-full justify-center">
            <View className="flex-row w-full justify-center max-w-[320px]">
              <View className="items-center">
                {renderBrailleDot(1)}
                {renderBrailleDot(2)}
                {renderBrailleDot(3)}
              </View>
              <View className="items-center">
                {renderBrailleDot(4)}
                {renderBrailleDot(5)}
                {renderBrailleDot(6)}
              </View>
            </View>
            
            <View className="mt-6 mx-4 p-4 bg-surface rounded-xl border border-[#333]">
               <Text className="text-textMuted text-center font-bold mb-2">Invisible V-Braille Overlay</Text>
               <Text className="text-textMuted text-center text-sm mb-1">• Single Tap the 6 zones to toggle Braille Dots 1–6.</Text>
               <Text className="text-textMuted text-center text-sm mb-1">• Swipe Right once to verify (replays pattern haptically).</Text>
               <Text className="text-textMuted text-center text-sm mb-1">• Swipe Right again to commit the digit.</Text>
               <Text className="text-textMuted text-center text-sm">• Swipe Left to cancel selection or delete digit.</Text>
            </View>
          </View>
        ) : (
          renderNumericKeypad()
        )}
      </View>
    </View>
  );
};
