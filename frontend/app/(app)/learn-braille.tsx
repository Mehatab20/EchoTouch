import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, PanResponder } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { AccessibilityManager } from '../../services/accessibilityManager';
import { HapticEngine } from '../../services/braille/HapticEngine';
import { SpatialReplayEngine } from '../../services/braille/SpatialReplayEngine';
import { router } from 'expo-router';
import { ScreenIdentity, useFocusManager, TactileElement } from '../../services/navigation/NavigationEngine';
import { useDispatch, useSelector } from 'react-redux';
import { logLearnedDigit, logFailedDot, resetFailedDots, selectUserExpertise, logExplainability, logBrailleAttempt, evaluateExpertise } from '../../store/accessibilitySlice';
import { RootState } from '../../store/store';

// Braille mapping for checking patterns
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

type Level = 1 | 2 | 3;

export default function LearnBrailleScreen() {
  const dispatch = useDispatch();
  const [level, setLevel] = useState<Level>(1);
  const [targetDot, setTargetDot] = useState<number>(1);
  const [targetDigit, setTargetDigit] = useState<string>('5');
  const [activeDots, setActiveDots] = useState<number[]>([]);
  const accessibility = useSelector((state: RootState) => state.accessibility);
  const userExpertise = useSelector(selectUserExpertise);
  const { setScreenName } = useFocusManager();

  useEffect(() => {
    setScreenName('learn');
    ScreenIdentity.announce('learn');
  }, [setScreenName]);

  useEffect(() => {
    startLevel(level);
  }, [level]);

  const startLevel = (lvl: Level) => {
    setActiveDots([]);
    if (lvl === 1) {
      // AI Adaptive Gamification: Find weak spots
      let weakDot = null;
      for (const [dotStr, count] of Object.entries(accessibility.failedDots)) {
        if (count >= 3) {
          weakDot = parseInt(dotStr);
          break;
        }
      }

      if (weakDot !== null) {
        setTargetDot(weakDot);
        if (userExpertise === 'Expert') {
          AccessibilityManager.speak(`Practice Dot ${weakDot}`);
        } else {
          AccessibilityManager.speak(`I noticed you struggle with Dot ${weakDot}. Let's practice it. Find Dot ${weakDot}.`);
        }
        dispatch(resetFailedDots());
      } else {
        const dot = Math.floor(Math.random() * 6) + 1;
        setTargetDot(dot);
        AccessibilityManager.speak(userExpertise === 'Expert' ? `Dot ${dot}` : `Level 1. Find Dot ${dot}`);
      }
    } else if (lvl === 2) {
      setTargetDigit('5');
      AccessibilityManager.speak(userExpertise === 'Expert' ? 'Number 5' : 'Level 2. Create Number 5. Tap dots 1 and 5.');
    } else {
      const randomDigit = Math.floor(Math.random() * 10).toString();
      setTargetDigit(randomDigit);
      
      let correctPatternStr = '';
      for (const [p, d] of Object.entries(brailleMap)) {
        if (d === randomDigit) correctPatternStr = p.split(',').join(' and ');
      }
      
      AccessibilityManager.speak(userExpertise === 'Expert' ? `Number ${randomDigit}` : `Level 3 Quiz. Create Number ${randomDigit}. Tap dots ${correctPatternStr}.`);
    }
  };

  const toggleDot = (dot: number) => {
    HapticEngine.dotTap(dot);
    
    if (level === 1) {
      // Pause so the user can feel the dot's unique signature before the validation buzz overrides it
      HapticEngine.pause(400);

      if (dot === targetDot) {
        dispatch(logBrailleAttempt(true));
        HapticEngine.signatureSuccess();
        AccessibilityManager.speak(userExpertise === 'Expert' ? 'Yes' : 'Excellent!');
        setTimeout(() => startLevel(1), 2000);
      } else {
        dispatch(logBrailleAttempt(false));
        dispatch(logFailedDot(targetDot));
        HapticEngine.error();
        AccessibilityManager.speak(userExpertise === 'Expert' ? 'No' : 'Incorrect. Try again.');
      }
      return;
    }

    setActiveDots(prev => {
      const newDots = prev.includes(dot) ? prev.filter(d => d !== dot) : [...prev, dot];
      newDots.sort((a, b) => a - b);
      return newDots;
    });
  };

  const checkPattern = async () => {
    const pattern = activeDots.join(',');
    const digit = brailleMap[pattern];
    
    // SBRE Feedback (Wait for it to finish)
    await SpatialReplayEngine.replay(activeDots, userExpertise);

    if (digit === targetDigit) {
      dispatch(logBrailleAttempt(true));
      dispatch(logLearnedDigit(parseInt(digit)));
      
      if (userExpertise === 'Expert') {
        AccessibilityManager.speak(`Correct.`);
      } else {
        AccessibilityManager.speak(`Correct. Digit ${digit}. Well done.`);
      }
      
      setActiveDots([]);
      
      // Evaluate AI User Model at the end of a round (not after every tap)
      dispatch(evaluateExpertise());
      
      if (level === 2) {
        setTimeout(() => setLevel(3), 2000);
      } else {
        setTimeout(() => startLevel(3), 2000);
      }
    } else {
      dispatch(logBrailleAttempt(false));
      
      if (userExpertise === 'Expert') {
        HapticEngine.error();
        AccessibilityManager.speak('Incorrect');
      } else {
        let correctPatternStr = '';
        for (const [p, d] of Object.entries(brailleMap)) {
          if (d === targetDigit) correctPatternStr = p.split(',').join(' and ');
        }
        const userPatternStr = activeDots.length > 0 ? activeDots.join(' and ') : 'nothing';
        
        HapticEngine.error();
        AccessibilityManager.speak(`Almost. You entered dots ${userPatternStr}. Number ${targetDigit} requires dots ${correctPatternStr}.`);
      }
      
      setActiveDots([]);
    }
  };

  const checkPatternRef = useRef<() => void>(() => {});
  const clearDotsRef = useRef<() => void>(() => {});
  
  useEffect(() => {
    checkPatternRef.current = checkPattern;
    clearDotsRef.current = () => { setActiveDots([]); HapticEngine.tap(); AccessibilityManager.speak("Cleared"); };
  }, [checkPattern, activeDots]); // Add activeDots to deps if checkPattern captures it without useEvent

  const dotLayouts = useRef<{ [dot: number]: { x: number, y: number, w: number, h: number } }>({});
  const lastCrossedDot = useRef<number | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const { pageX, pageY } = evt.nativeEvent;
        for (let i = 1; i <= 6; i++) {
          const layout = dotLayouts.current[i];
          if (layout) {
            if (
              pageX >= layout.x - 20 && pageX <= layout.x + layout.w + 20 &&
              pageY >= layout.y - 20 && pageY <= layout.y + layout.h + 20
            ) {
              if (lastCrossedDot.current !== i) {
                lastCrossedDot.current = i;
                toggleDot(i);
              }
              break;
            }
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        lastCrossedDot.current = null;
        if (level > 1) {
          if (gestureState.dx > 50) checkPatternRef.current();
          else if (gestureState.dx < -50) clearDotsRef.current();
        }
      },
      onPanResponderTerminate: (evt, gestureState) => {
        lastCrossedDot.current = null;
        if (level > 1) {
          if (gestureState.dx > 50) checkPatternRef.current();
          else if (gestureState.dx < -50) clearDotsRef.current();
        }
      }
    })
  ).current;

  const renderBrailleDot = (dot: number) => {
    const isActive = activeDots.includes(dot);
    return (
      <View
        onLayout={(e) => {
          e.persist();
          setTimeout(() => {
            (e.target as any)?.measure?.((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
              dotLayouts.current[dot] = { x: pageX, y: pageY, w: width, h: height };
            });
          }, 100);
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Dot ${dot}`}
          onPress={() => toggleDot(dot)}
          delayPressIn={0}
          activeOpacity={0.7}
          className={`w-28 h-28 m-3 rounded-full items-center justify-center border-4 ${
            isActive ? 'bg-primary border-primary' : 'bg-surface border-[#444]'
          }`}
        >
          <Text className={`text-2xl font-bold ${isActive ? 'text-[#121212]' : 'text-textMuted'}`}>{dot}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <View className="flex-1 items-center">
        <View className="w-full flex-row justify-between items-center mb-6 mt-4 px-4">
          <Text accessibilityRole="header" className="text-2xl font-bold text-text">Braille Training</Text>
          <TactileElement id="btn_learn_exit" label="Exit" description="Return to dashboard" type="button" priority={1} onPress={() => router.replace('/(app)/dashboard')}>
            <TouchableOpacity onPress={() => router.replace('/(app)/dashboard')} className="px-5 py-2 bg-surface rounded-full border border-primary/50">
              <Text className="text-primary font-bold text-base">Exit</Text>
            </TouchableOpacity>
          </TactileElement>
        </View>

        <View className="w-full px-4 mb-8">
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-1">
              <TactileElement id="btn_lvl_1" label="Level 1" description="Practice individual dots" type="button" priority={2} onPress={() => setLevel(1)}>
                <Button title="Lv 1: Dots" variant={level === 1 ? 'primary' : 'outline'} onPress={() => setLevel(1)} className="w-full mb-0" />
              </TactileElement>
            </View>
            <View className="flex-1 mx-1">
              <TactileElement id="btn_lvl_2" label="Level 2" description="Practice full digits" type="button" priority={3} onPress={() => setLevel(2)}>
                <Button title="Lv 2: Digits" variant={level === 2 ? 'primary' : 'outline'} onPress={() => setLevel(2)} className="w-full mb-0" />
              </TactileElement>
            </View>
            <View className="flex-1 ml-1">
              <TactileElement id="btn_lvl_3" label="Level 3" description="Take the Braille quiz" type="button" priority={4} onPress={() => setLevel(3)}>
                <Button title="Lv 3: Quiz" variant={level === 3 ? 'primary' : 'outline'} onPress={() => setLevel(3)} className="w-full mb-0" />
              </TactileElement>
            </View>
          </View>
          
          <Text className="text-xl text-center text-primary font-bold">
            {level === 1 ? `Find Dot ${targetDot}` : `Create Number ${targetDigit}`}
          </Text>
        </View>

        <View className="flex-row w-full justify-center max-w-[300px]" {...panResponder.panHandlers}>
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

        {level > 1 && (
          <View className="mt-8 px-4 w-full">
            <TactileElement id="btn_check_answer" label="Check Answer" description="Submit your Braille pattern" type="button" priority={5} onPress={checkPattern}>
              <Button title="Check Answer" onPress={checkPattern} />
            </TactileElement>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}
