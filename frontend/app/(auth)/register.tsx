import React from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useRegisterMutation } from '../../services/authApi';
import { useDispatch } from 'react-redux';
import { setAuth } from '../../store/authSlice';
import * as SecureStore from 'expo-secure-store';
import { Link } from 'expo-router';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const [registerUser, { isLoading, error }] = useRegisterMutation();
  const dispatch = useDispatch();

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const result = await registerUser(data).unwrap();
      // Store tokens
      await SecureStore.setItemAsync('access_token', result.token);
      await SecureStore.setItemAsync('refresh_token', result.refreshToken);
      
      // Update Redux state
      dispatch(setAuth({ user: { id: result.id, email: result.email } }));
    } catch (err) {
      console.error('Registration failed', err);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        className="flex-1 justify-center"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 20 }} keyboardShouldPersistTaps="handled">
          
          <View className="mb-8 items-center">
            <Text accessibilityRole="header" className="text-4xl font-bold text-primary mb-2">Create Account</Text>
            <Text className="text-textMuted text-lg text-center">Join EchoTouch today</Text>
          </View>

          {error && (
            <View accessibilityRole="alert" className="bg-error/20 p-4 rounded-xl mb-6 border border-error">
              <Text className="text-error font-bold text-center">
                {(error as any)?.data?.email?.[0] || (error as any)?.data?.password?.[0] || (error as any)?.data?.detail || 'Registration failed.'}
              </Text>
            </View>
          )}

          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="First Name"
                placeholder="Enter your first name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.firstName?.message}
                id="input_firstname"
              />
            )}
          />

          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Last Name"
                placeholder="Enter your last name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.lastName?.message}
                id="input_lastname"
              />
            )}
          />

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
                id="input_email_reg"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Create a strong password"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
                id="input_password_reg"
              />
            )}
          />

          <View className="mt-4">
            <Button
              title="Register"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              id="btn_register"
            />
          </View>

          <View className="mt-8 items-center flex-row justify-center">
            <Text className="text-textMuted text-lg">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Text accessibilityRole="link" className="text-primary font-bold text-lg">Log In</Text>
            </Link>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
