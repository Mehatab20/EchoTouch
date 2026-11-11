import React, { useRef } from 'react';
import { View, PanResponder, TouchableWithoutFeedback } from 'react-native';
import { useFocusManager } from './FocusManager';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export const GestureInterpreter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { elements, next, previous, activate, describe, isATNLPaused, navState } = useFocusManager();
  const { capabilities } = useSelector((state: RootState) => state.accessibility);
  
  const isATNLEnabled = capabilities.needsSimplifiedNavigation && !isATNLPaused;
  const isInteractable = navState === 'IDLE' || navState === 'NAVIGATION';

  const lastTapRef = useRef<number>(0);
  const longPressTimeout = useRef<any>(null);

  const router = useRouter();
  const sosTimeoutRef = useRef<any>(null);
  const lastCollidedElementId = useRef<string | null>(null);
  const lastEdgeSwipeStartX = useRef<number | null>(null);

  const panResponder = React.useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt) => evt.nativeEvent.touches.length === 2,
      onMoveShouldSetPanResponderCapture: (evt) => evt.nativeEvent.touches.length === 2,
      onStartShouldSetPanResponder: () => isATNLEnabled,
      onMoveShouldSetPanResponder: () => isATNLEnabled,
      onPanResponderGrant: (evt) => {
        // Global SOS Intercept
        if (evt.nativeEvent.touches.length === 2) {
          import('../../services/braille/HapticEngine').then(({ HapticEngine }) => {
            // SOS start signal
            HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy);
          });
          sosTimeoutRef.current = setTimeout(() => {
            // SOS Warp triggered
            import('../../services/braille/HapticEngine').then(({ HapticEngine }) => {
              HapticEngine.error(); // Sharp feedback for warp
              router.replace('/(app)/dashboard');
            });
          }, 2000);
          return;
        }

        if (!isATNLEnabled) return;
        
        lastEdgeSwipeStartX.current = evt.nativeEvent.pageX;
        
        if (!isInteractable) return;
        
        longPressTimeout.current = setTimeout(() => {
          describe();
          longPressTimeout.current = null;
        }, 800);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (evt.nativeEvent.touches.length !== 2 && sosTimeoutRef.current) {
          clearTimeout(sosTimeoutRef.current);
          sosTimeoutRef.current = null;
        }

        if (!isATNLEnabled || !isInteractable) return;
        
        const { pageX, pageY } = evt.nativeEvent;
        // Vibro-Audio Maps (VAMs): Spatial Collision Detection
        // Only run if the user is blind/needs voice so they can explore the screen
        if (capabilities.needsVoice) {
          for (const el of elements) {
            if (el.layout) {
              const { x, y, w, h } = el.layout;
              if (
                pageX >= x && pageX <= x + w &&
                pageY >= y && pageY <= y + h
              ) {
                if (lastCollidedElementId.current !== el.id) {
                  lastCollidedElementId.current = el.id;
                  
                  // Instantly provide vibro-audio feedback upon collision
                  import('../../services/braille/HapticEngine').then(({ HapticEngine }) => HapticEngine.tap());
                  import('../../services/accessibilityManager').then(({ AccessibilityManager }) => 
                    AccessibilityManager.speak(`${el.label}. ${el.description}`)
                  );
                }
                break;
              }
            }
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        lastCollidedElementId.current = null;
        if (sosTimeoutRef.current) {
          clearTimeout(sosTimeoutRef.current);
          sosTimeoutRef.current = null;
        }

        if (!isATNLEnabled) return;
        if (!isInteractable) return;
        
        if (longPressTimeout.current) {
          clearTimeout(longPressTimeout.current);
          longPressTimeout.current = null;
        }

        const { dx, dy } = gestureState;

        // Check for Edge Swipe (Native Back Gesture simulation)
        if (lastEdgeSwipeStartX.current !== null && lastEdgeSwipeStartX.current < 40 && dx > 40) {
          lastEdgeSwipeStartX.current = null;
          import('../../services/braille/HapticEngine').then(({ HapticEngine }) => HapticEngine.tap());
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(app)/dashboard');
          }
          return;
        }

        if (Math.abs(dx) > 30) {
          if (dx > 0) next();
          else previous();
          return;
        }

        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          const now = Date.now();
          if (now - lastTapRef.current < 300) {
            activate();
            lastTapRef.current = 0;
          } else {
            lastTapRef.current = now;
          }
        }
      },
      onPanResponderTerminate: () => {
        lastCollidedElementId.current = null;
        lastEdgeSwipeStartX.current = null;
        if (sosTimeoutRef.current) {
          clearTimeout(sosTimeoutRef.current);
          sosTimeoutRef.current = null;
        }
        if (longPressTimeout.current) {
          clearTimeout(longPressTimeout.current);
          longPressTimeout.current = null;
        }
      }
    }), [isATNLEnabled, isInteractable, next, previous, activate, describe, capabilities.needsVoice, elements, router]
  );

  // Attach panHandlers globally to ensure SOS is always active
  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};
