import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

import { AuthProvider } from '../contexts/AuthContext';
import { SiteProvider } from '../contexts/SiteContext';
import { ModalStackProvider } from '../contexts/ModalStackContext';
import GlobalAlertProvider from '../components/GlobalAlertProvider';
import NetworkConnectivityCheck from '../components/NetworkConnectivityCheck';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <SiteProvider>
        <ModalStackProvider>
          <GlobalAlertProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <NetworkConnectivityCheck />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="main" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="signup" options={{ headerShown: false }} />
              <Stack.Screen name="site-selection" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
            </ThemeProvider>
          </GlobalAlertProvider>
        </ModalStackProvider>
      </SiteProvider>
    </AuthProvider>
  );
}
