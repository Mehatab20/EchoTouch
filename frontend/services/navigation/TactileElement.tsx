import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useFocusManager } from './FocusManager';
import { TactileElementData } from './types';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface TactileElementProps extends Omit<TactileElementData, 'onPress'> {
  children: React.ReactNode;
  onPress: () => void;
  className?: string;
}

export const TactileElement: React.FC<TactileElementProps> = ({
  id, label, description, type, priority = 0, onPress, children, className = ''
}) => {
  const { elements, focusedIndex, registerElement, unregisterElement, isATNLPaused } = useFocusManager();
  const { capabilities } = useSelector((state: RootState) => state.accessibility);
  
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  const layoutRef = useRef<{x: number, y: number, w: number, h: number} | undefined>(undefined);

  useEffect(() => {
    registerElement({ 
      id, label, description, type, priority, 
      onPress: () => onPressRef.current(),
      layout: layoutRef.current
    });
    return () => unregisterElement(id);
  }, [id, label, description, type, priority, registerElement, unregisterElement]);

  const handleLayout = (e: any) => {
    e.target?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      layoutRef.current = { x: pageX, y: pageY, w: width, h: height };
      // Re-register with new layout
      registerElement({ 
        id, label, description, type, priority, 
        onPress: () => onPressRef.current(),
        layout: layoutRef.current
      });
    });
  };

  const isATNLEnabled = capabilities.needsSimplifiedNavigation && !isATNLPaused;
  const isFocused = elements[focusedIndex]?.id === id;

  const shouldShowVisualFocus = isFocused;

  const dynamicStyle = shouldShowVisualFocus ? {
    borderColor: '#3b82f6',
    borderWidth: 3,
    transform: [{ scale: 1.03 }],
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
    borderRadius: 16
  } : {};

  return (
    <TouchableOpacity
      activeOpacity={isATNLEnabled ? 1 : 0.7}
      onPress={isATNLEnabled ? undefined : (capabilities.needsTremorProtection ? undefined : onPress)}
      onLongPress={isATNLEnabled ? undefined : (capabilities.needsTremorProtection ? onPress : undefined)}
      delayLongPress={capabilities.needsTremorProtection ? 600 : undefined}
      className={className}
      style={dynamicStyle}
      onLayout={handleLayout}
    >
      <View className={className?.includes('flex-1') ? "flex-1 w-full h-full" : "w-full"} pointerEvents={isATNLEnabled ? "none" : "auto"}>
        {children}
      </View>
    </TouchableOpacity>
  );
};
