import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthContext } from '@context/AuthContext';
import type { RootStackParamList } from '@types';

// Screens
import LoginScreen from '@screens/LoginScreen';
import MemberActivationScreen from '@screens/MemberActivationScreen';
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
  const { isAuthenticated, isLoading, isAdmin, isRoleLoading, needsActivation, isActivationStatusLoading } =
    useAuthContext();

  // Tunggu session, role, DAN status aktivasi selesai dimuat sebelum memutuskan
  // stack mana yang ditampilkan — supaya user tidak sempat "kelihatan" masuk ke
  // Home/AdminDashboard sesaat sebelum diketahui dia sebenarnya belum selesai
  // aktivasi (OTP terverifikasi tapi completeMemberRegistration belum jalan).
  const isStillResolvingAuth =
    isLoading ||
    (isAuthenticated && isRoleLoading) ||
    (isAuthenticated && !isRoleLoading && !isAdmin && isActivationStatusLoading);

  if (isStillResolvingAuth) {
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
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MemberActivation" component={MemberActivationScreen} />
          </>
        ) : isAdmin ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
            <Stack.Screen name="ReportPdfViewer" component={ReportPdfViewerScreen} />
            <Stack.Screen name="AccessDenied" component={AccessDeniedScreen} />
          </>
        ) : needsActivation ? (
          // Session sudah ada (OTP terverifikasi) tapi anggota belum selesai
          // melengkapi profil & set password -> paksa lanjutkan alur aktivasi,
          // jangan biarkan masuk ke Home dengan akun setengah jadi.
          <Stack.Screen name="MemberActivation" component={MemberActivationScreen} />
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
