import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthContext } from '@context/AuthContext';
import type { RootStackParamList } from '@types';

// Screens
import LoginScreen from '@screens/LoginScreen';
import HomeScreen from '@screens/HomeScreen';
import AdminDashboardScreen from '@screens/AdminDashboardScreen';
import ReportListScreen from '@screens/ReportListScreen';
import ReportDetailScreen from '@screens/ReportDetailScreen';
import ReportCreateScreen from '@screens/ReportCreateScreen';
import ReportPreviewScreen from '@screens/ReportPreviewScreen';
import ReportPdfViewerScreen from '@screens/ReportPdfViewerScreen';
import AccessDeniedScreen from '@screens/AccessDeniedScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, isAdmin, isRoleLoading } = useAuthContext();

  // Tunggu session DAN role selesai dimuat — supaya tidak sempat render Home
  // untuk admin (atau sebaliknya) sebelum role diketahui pasti.
  if (isLoading || (isAuthenticated && isRoleLoading)) {
    // Bisa diganti dengan splash screen
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : isAdmin ? (
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="ReportList" component={ReportListScreen} />
            <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
            <Stack.Screen name="ReportCreate" component={ReportCreateScreen} />
            <Stack.Screen name="ReportPreview" component={ReportPreviewScreen} />
            <Stack.Screen name="ReportPdfViewer" component={ReportPdfViewerScreen} />
            <Stack.Screen name="AccessDenied" component={AccessDeniedScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
