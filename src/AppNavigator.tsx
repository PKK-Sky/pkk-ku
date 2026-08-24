import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { COLORS } from './constants/app';
import { supabase } from './lib/supabase';

// Auth Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import MemberActivationScreen from './screens/MemberActivationScreen';

// Admin Screens
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminMembersScreen from './screens/AdminMembersScreen';
import AdminAddMemberScreen from './screens/AdminAddMemberScreen';
import AdminPostsScreen from './screens/AdminPostsScreen';
import AdminReportsScreen from './screens/AdminReportsScreen';
import AdminAnnouncementsScreen from './screens/AdminAnnouncementsScreen';
import AdminAddAnnouncementScreen from './screens/AdminAddAnnouncementScreen';
import AdminNotificationsScreen from './screens/AdminNotificationsScreen';

// User Tab Screens
import HomeScreen from './screens/HomeScreen';
import FeedScreen from './screens/FeedScreen';
import ReportListScreen from './screens/ReportListScreen';
import ChatListScreen from './screens/ChatListScreen';
import ProfileScreen from './screens/ProfileScreen';

// User Stack Screens
import CreatePostScreen from './screens/CreatePostScreen';
import PostDetailScreen from './screens/PostDetailScreen';
import AnnouncementsScreen from './screens/AnnouncementsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ReportCreateScreen from './screens/ReportCreateScreen';
import ReportDetailScreen from './screens/ReportDetailScreen';
import PdfViewerScreen from './screens/PdfViewerScreen';
import NewChatScreen from './screens/NewChatScreen';
import ChatRoomScreen from './screens/ChatRoomScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AccessDeniedScreen from './screens/AccessDeniedScreen';

import { RootStackParamList, UserTabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<UserTabParamList>();

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
      <Text style={{
        fontSize: 11,
        fontWeight: '500',
        color: focused ? COLORS.primary : COLORS.textMuted,
      }}>{label}</Text>
    </View>
  );
}

function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 12,
          paddingTop: 8,
          height: 72,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Beranda" focused={focused} /> }}
      />
      <Tab.Screen
        name="FeedTab"
        component={FeedScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🖼️" label="Feed" focused={focused} /> }}
      />
      <Tab.Screen
        name="ReportTab"
        component={ReportListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📄" label="Laporan" focused={focused} /> }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💬" label="Chat" focused={focused} /> }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Profil" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) checkRole(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) checkRole(session.user.id);
      else { setRole(null); setLoading(false); }
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const checkRole = async (userId: string) => {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (profile?.role === 'admin') {
      setRole('admin');
    } else {
      setRole('user');
    }
    setLoading(false);
  };

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
            <Stack.Screen name="MemberActivation" component={MemberActivationScreen} />
          </>
        ) : role === 'admin' ? (
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
          </>
        ) : (
          <>
            <Stack.Screen name="UserTabs" component={UserTabs} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Feed" component={FeedScreen} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="ReportList" component={ReportListScreen} />
            <Stack.Screen name="ReportCreate" component={ReportCreateScreen} />
            <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
            <Stack.Screen name="ReportPreview" component={ReportDetailScreen} />
            <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen name="NewChat" component={NewChatScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="AccessDenied" component={AccessDeniedScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
