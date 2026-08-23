import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@context/AuthContext';
import AppNavigator from '@navigation/AppNavigator';
import VideoIntroScreen from '@screens/VideoIntroScreen';
import UpdateBanner from '@components/UpdateBanner';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  const handleIntroFinish = useCallback(() => {
    setShowIntro(false);
  }, []);

  if (showIntro) {
    return <VideoIntroScreen onFinish={handleIntroFinish} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <UpdateBanner />
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
