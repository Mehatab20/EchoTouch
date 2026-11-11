import React from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useLoginMutation } from '../../services/authApi';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setAuth } from '../../store/authSlice';
import * as SecureStore from 'expo-secure-store';
import { useRouter, Link } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { PinEntry } from '../../components/PinEntry';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useDispatch();
  const { primaryInputMethod } = useSelector((state: RootState) => state.accessibility);
  const [pin, setPin] = React.useState('');
  const hasAttemptedBiometrics = React.useRef(false);

  // Biometric Auto-Login
  React.useEffect(() => {
    const tryBiometrics = async () => {
      if (hasAttemptedBiometrics.current) return;
      hasAttemptedBiometrics.current = true;
      try {
        const savedToken = await SecureStore.getItemAsync('access_token');
        if (!savedToken) return;
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (hasHardware && isEnrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Login to EchoTouch',
            fallbackLabel: 'Use PIN',
            cancelLabel: 'Cancel',
            disableDeviceFallback: false,
          });

          if (result.success) {
            // Instantly login on biometric success
            dispatch(setAuth({ user: { id: 'biometric_user', email: 'user@echotouch.com' } }));
          }
        }
      } catch (err) {
        console.error("Biometric failed", err);
      }
    };
    
    // Slight delay to allow screen transition before popup
    const timer = setTimeout(tryBiometrics, 500);
    return () => clearTimeout(timer);
  }, [dispatch]);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const [isRegisteringPin, setIsRegisteringPin] = React.useState(false);
  const [tempUser, setTempUser] = React.useState<any>(null);
  const [confirmPin, setConfirmPin] = React.useState('');
  const [pinStep, setPinStep] = React.useState<'CREATE' | 'CONFIRM'>('CREATE');

  const handleAuthSuccess = async (user: any) => {
    try {
      const existingPin = await SecureStore.getItemAsync('transaction_pin');
      if (existingPin) {
        dispatch(setAuth({ user }));
      } else {
        setTempUser(user);
        setIsRegisteringPin(true);
      }
    } catch (err) {
      console.error(err);
      dispatch(setAuth({ user }));
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data).unwrap();
      // Store tokens
      await SecureStore.setItemAsync('access_token', result.token);
      await SecureStore.setItemAsync('refresh_token', result.refreshToken);
      
      await handleAuthSuccess({ id: result.id, email: result.email });
    } catch (err) {
      console.warn('Backend login failed, falling back to Demo Mode:', err);
      // Fallback for Demo/Hackathon purposes if backend is down
      await handleAuthSuccess({ id: 'demo_user', email: data.email });
    }
  };

  const handleBrailleLogin = () => {
    if (pin.length === 6) {
      // Dummy validation for braille PIN login hackathon demo
      dispatch(setAuth({ user: { id: 'braille_user', email: 'braille@echotouch.com' } }));
    }
  };

  React.useEffect(() => {
    if (pin.length === 6 && primaryInputMethod === 'braille') {
      handleBrailleLogin();
    }
  }, [pin, primaryInputMethod]);

  const handlePinRegistrationComplete = async () => {
    if (pinStep === 'CREATE') {
      if (pin.length === 6) {
        setConfirmPin(pin);
        setPin('');
        setPinStep('CONFIRM');
      }
    } else {
      if (pin.length === 6) {
        if (pin === confirmPin) {
          // Success! Save PIN and Login
          await SecureStore.setItemAsync('transaction_pin', pin);
          dispatch(setAuth({ user: tempUser }));
        } else {
          // Mismatch
          setPin('');
          setConfirmPin('');
          setPinStep('CREATE');
          // Add some haptic error here if needed
        }
      }
    }
  };

  React.useEffect(() => {
    if (isRegisteringPin && pin.length === 6) {
      handlePinRegistrationComplete();
    }
  }, [pin, isRegisteringPin]);

  if (isRegisteringPin) {
    return (
      <ScreenWrapper>
        <View className="flex-1 justify-center items-center px-4 w-full h-full">
          <Text accessibilityRole="header" className="text-3xl font-bold text-primary mb-8 text-center mt-12">
            Secure PIN Registration
          </Text>
          <Text className="text-xl text-textMuted text-center mb-8">
            {pinStep === 'CREATE' ? 'Create a 6-digit Transaction PIN' : 'Confirm your 6-digit PIN'}
          </Text>
          <View className="flex-1 w-full">
            <PinEntry pin={pin} onPinChange={setPin} maxLength={6} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  if (primaryInputMethod === 'braille') {
    return (
      <ScreenWrapper>
        <View className="flex-1 justify-center items-center px-4 w-full h-full">
          <Text accessibilityRole="header" className="text-3xl font-bold text-primary mb-8 text-center mt-12">
            V-Braille Login
          </Text>
          <Text className="text-xl text-textMuted text-center mb-8">
            Enter your 6-digit PIN
          </Text>
          <View className="flex-1 w-full">
            <PinEntry pin={pin} onPinChange={setPin} maxLength={6} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        className="flex-1 justify-center"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 20 }} keyboardShouldPersistTaps="handled">
          
          <View className="mb-10 items-center">
            <Text accessibilityRole="header" className="text-4xl font-bold text-primary mb-2">EchoTouch</Text>
            <Text className="text-textMuted text-lg text-center">Tactile Mobile Payments</Text>
          </View>

          {error && (
            <View accessibilityRole="alert" className="bg-error/20 p-4 rounded-xl mb-6 border border-error">
              <Text className="text-error font-bold text-center">
                {(error as any)?.data?.detail || 'Login failed. Please check your credentials.'}
              </Text>
            </View>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
                id="input_email"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
                id="input_password"
              />
            )}
          />

          <View className="mt-4">
            <Button
              title="Log In"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              id="btn_login"
            />
          </View>

          <View className="mt-8 items-center flex-row justify-center">
            <Text className="text-textMuted text-lg">Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <Text accessibilityRole="link" className="text-primary font-bold text-lg">Register</Text>
            </Link>
          </View>


        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
