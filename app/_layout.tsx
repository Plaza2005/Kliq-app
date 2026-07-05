import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as WebBrowser from 'expo-web-browser';
import GestureWrapper from '../components/shared/GestureWrapper';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const setSession = useAppStore((s) => s.setSession);

  useFonts({
    PlusJakartaSans_700Bold:        require('../assets/fonts/PlusJakartaSans_700Bold.ttf'),
    PlusJakartaSans_800ExtraBold:   require('../assets/fonts/PlusJakartaSans_800ExtraBold.ttf'),
    PlusJakartaSans_600SemiBold:    require('../assets/fonts/PlusJakartaSans_600SemiBold.ttf'),
    SpaceGrotesk_600SemiBold:       require('../assets/fonts/SpaceGrotesk_600SemiBold.ttf'),
    SpaceGrotesk_500Medium:         require('../assets/fonts/SpaceGrotesk_500Medium.ttf'),
    Inter_400Regular:               require('../assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium:                require('../assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold:              require('../assets/fonts/Inter_600SemiBold.ttf'),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureWrapper style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureWrapper>
  );
}
