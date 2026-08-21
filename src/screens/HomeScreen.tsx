import React from 'react';
import { View, Text, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@types';
import { useAuthContext } from '@context/AuthContext';
import { useAuth } from '@hooks';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();
  const { logout } = useAuth();

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
        Selamat Datang
      </Text>
      <Text style={{ fontSize: 14, marginBottom: 24 }}>
        {user?.email ?? 'User'}
      </Text>

      <View style={{ gap: 12 }}>
        <Button
          title="Buat Laporan Kegiatan"
          onPress={() => navigation.navigate('ReportCreate')}
        />
        <Button
          title="Daftar Laporan Saya"
          onPress={() => navigation.navigate('ReportList')}
        />
        <Button title="Keluar" onPress={() => logout()} color="#dc3545" />
      </View>
    </View>
  );
}
