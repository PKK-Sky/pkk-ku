import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthContext } from '@context/AuthContext';
import type { RootStackParamList } from '@types';

// Screens — Auth
import LoginScreen from '@screens/LoginScreen';
import AdminLoginScreen from '@screens/AdminLoginScreen';
import MemberActivationScreen from '@screens/MemberActivationScreen';

// Screens — Admin
import AdminDashboardScreen from '@screens/AdminDashboardScreen';
import AdminMembersScreen from '@screens/AdminMembersScreen';
import AdminAddMemberScreen from '@screens/AdminAddMemberScreen';
import AdminPostsScreen from '@screens/AdminPostsScreen';
import AdminReportsScreen from '@screens/AdminReportsScreen';
import AdminAnnouncementsScreen from '@screens/AdminAnnouncementsScreen';
import AdminAddAnnouncementScreen from '@screens/AdminAddAnnouncementScreen';
import AdminNotificationsScreen from '@screens/AdminNotificationsScreen';

// Screens — User
import HomeScreen from '@screens/HomeScreen';
import FeedScreen from '@screens/FeedScreen';
import CreatePostScreen from '@screens/CreatePostScreen';
import NotificationsScreen from '@screens/NotificationsScreen';
import NewChatScreen from '@screens/NewChatScreen';
import ProfileScreen from '@screens/ProfileScreen';
import EditProfileScreen from '@screens/EditProfileScreen';

// Screens — Report
import ReportListScreen from '@screens/ReportListScreen';
import ReportDetailScreen from '@screens/ReportDetailScreen';
import ReportCreateScreen from '@screens/ReportCreateScreen';
import ReportPreviewScreen from '@screens/ReportPreviewScreen';
import ReportPdfViewerScreen from '@screens/ReportPdfViewerScreen';

// Shared
import AccessDeniedScreen from '@screens/AccessDeniedScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, isAdmin, isRoleLoading, needsActivation, isActivationStatusLoading } =
    useAuthContext();

  const isStillResolvingAuth =
    isLoading ||
    (isAuthenticated && isRoleLoading) ||
    (isAuthenticated && !isRoleLoading && !isAdmin && isActivationStatusLoading);

  if (isStillResolvingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Memuat akun...</Text>
      </View>
    );
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
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
            <Stack.Screen name="MemberActivation" component={MemberActivationScreen} />
          </>
        ) : isAdmin ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminMembers" component={AdminMembersScreen} />
            <Stack.Screen name="AdminAddMember" component={AdminAddMemberScreen} />
            <Stack.Screen name="AdminPosts" component={AdminPostsScreen} />
            <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
            <Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} />
            <Stack.Screen name="AdminAddAnnouncement" component={AdminAddAnnouncementScreen} />
            <Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
            <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
            <Stack.Screen name="ReportPdfViewer" component={ReportPdfViewerScreen} />
            <Stack.Screen name="AccessDenied" component={AccessDeniedScreen} />
          </>
        ) : needsActivation ? (
          <Stack.Screen name="MemberActivation" component={MemberActivationScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Feed" component={FeedScreen} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="NewChat" component={NewChatScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
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