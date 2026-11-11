import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator, StyleProp, TextStyle } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  id?: string; // For haptic preparation
  name?: string; // For haptic preparation
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  isLoading = false,
  variant = 'primary',
  id,
  name,
  textStyle,
  style,
  className,
  ...props
}) => {
  const getBgClass = () => {
    switch (variant) {
      case 'primary': return 'bg-primary';
      case 'secondary': return 'bg-secondary';
      case 'outline': return 'bg-transparent border-2 border-primary';
      default: return 'bg-primary';
    }
  };

  const getTextClass = () => {
    switch (variant) {
      case 'primary': return 'text-background'; // Dark text on bright background for contrast
      case 'secondary': return 'text-background';
      case 'outline': return 'text-primary';
      default: return 'text-background';
    }
  };

  return (
    <TouchableOpacity
      testID={id}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isLoading || props.disabled}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel || title}
      accessibilityHint={props.accessibilityHint || `Double tap to activate ${title}`}
      className={`w-full h-14 rounded-xl flex-row items-center justify-center mb-4 ${getBgClass()} ${props.disabled ? 'opacity-50' : 'opacity-100'} ${className || ''}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? '#FFD700' : '#121212'} />
      ) : (
        <Text className={`text-lg font-bold ${getTextClass()}`} style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
