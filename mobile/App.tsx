import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  useColorScheme,
  StatusBar as NativeStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Bookmark } from 'lucide-react-native';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { getToken, savePendingInviteToken, getPendingInviteToken, deletePendingInviteToken } from './src/services/storage';
import { Colors } from './src/theme';
import * as Linking from 'expo-linking';

import { ShareIntentProvider } from 'expo-share-intent';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

function MainApp() {
  const { token, loading } = useAuth();
  const { themeMode, colors } = useTheme();
  const isDark = themeMode === 'dark';
  const [activeInviteToken, setActiveInviteToken] = useState<string | null>(null);

  const handleDeepLink = async (url: string) => {
    try {
      // Parse token from URLs like keepr://invite/abc-123 or https://keepr.com/invite/abc-123
      const match = url.match(/invite\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const inviteToken = match[1];
        await savePendingInviteToken(inviteToken);
        if (token) {
          setActiveInviteToken(inviteToken);
        }
      }
    } catch (e) {
      console.error('Error handling deep link:', e);
    }
  };

  // Check for persisted invite token on launch
  useEffect(() => {
    if (!loading) {
      const checkPersistedToken = async () => {
        const persisted = await getPendingInviteToken();
        if (persisted && token) {
          setActiveInviteToken(persisted);
        }
      };
      checkPersistedToken();
    }
  }, [loading, token]);

  // Deep Link Listeners
  useEffect(() => {
    const getInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };
    getInitialUrl();

    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url) {
        handleDeepLink(event.url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [token]);

  const handleCloseActiveInvite = async () => {
    setActiveInviteToken(null);
    await deletePendingInviteToken();
  };

  if (loading) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <NativeStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
          <Bookmark size={36} color="#fff" />
        </View>
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.spinner}
        />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NativeStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {token ? (
        <DashboardScreen 
          initialInviteToken={activeInviteToken} 
          onCloseInvite={handleCloseActiveInvite} 
        />
      ) : (
        <AuthScreen />
      )}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <ShareIntentProvider>
        <AuthProvider>
          <ThemeProvider>
            <MainApp />
          </ThemeProvider>
        </AuthProvider>
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  spinner: {
    marginTop: 24,
  },
});
