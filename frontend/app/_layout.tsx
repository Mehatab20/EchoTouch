import 'react-native-gesture-handler';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState } from '../store/store';
import { setAuth, setLoading } from '../store/authSlice';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator, BackHandler } from 'react-native';
import { FocusManagerProvider, GestureInterpreter } from '../services/navigation/NavigationEngine';
import { HapticEngine } from '../services/braille/HapticEngine';
import "../global.css";

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const { hasCompletedProfile } = useSelector((state: RootState) => state.accessibility);
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useDispatch();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    const onBackPress = () => {
      HapticEngine.tap();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(app)/dashboard');
      }
      return true; // prevent default behavior (exiting app)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    // Check SecureStore for existing token on app load
    const loadAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          // Typically we would fetch the user profile here or decode JWT
          // For now, if token exists, we mark as authenticated
          dispatch(setAuth({ user: { id: 1 } })); // Mock user until profile API
        }
      } catch (e) {
        console.error("Failed to load auth", e);
      } finally {
        dispatch(setLoading(false));
      }
    };
    loadAuth();
  }, [dispatch]);

  useEffect(() => {
    if (isLoading) return;
    if (!rootNavigationState?.key) return; // Prevent routing before navigation mounts

    const inAuthGroup = segments[0] === '(auth)';
    const isRoot = (segments.length as number) === 0;

    const timeoutId = setTimeout(() => {
      const isProfiler = segments[0] === 'profiler';
      const isAuthGroup = segments[0] === '(auth)';
      const isAppGroup = segments[0] === '(app)';

      if (!hasCompletedProfile) {
        if (!isProfiler) {
          router.replace('/profiler');
        }
      } else if (!isAuthenticated) {
        if (!isAuthGroup) {
          router.replace('/(auth)/login');
        }
      } else {
        if (!isAppGroup) {
          router.replace('/(app)/dashboard');
        }
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, hasCompletedProfile, segments, isLoading, router, rootNavigationState]);

  const { capabilities } = useSelector((state: RootState) => state.accessibility);

  useEffect(() => {
    HapticEngine.setEnabled(!!capabilities?.needsHaptics);
  }, [capabilities?.needsHaptics]);

  useEffect(() => {
    if (capabilities && !capabilities.needsVoice) {
      import('../services/accessibilityManager').then(({ AccessibilityManager }) => {
        AccessibilityManager.stopSpeaking();
      });
    }
  }, [capabilities?.needsVoice]);

  return (
    <FocusManagerProvider>
      <GestureInterpreter>
        <Slot />
      </GestureInterpreter>
    </FocusManagerProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}
