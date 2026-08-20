import React from 'react';
import { View, Text, Button } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@types';

type RouteProps = RouteProp<RootStackParamList, 'AccessDenied'>;

export default function AccessDeniedScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { reason } = route.params ?? {};

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#dc3545', marginBottom: 16, textAlign: 'center' }}>
        Akses Ditolak
      </Text>
      <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 }}>
        {reason ?? 'Anda tidak memiliki izin untuk mengakses halaman ini.'}
      </Text>
      <Button title="Kembali ke Beranda" onPress={() => navigation.navigate('Home' as never)} />
    </View>
  );
}
