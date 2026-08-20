import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ReportWithDetails } from '@types';
import { getMyReports } from '@services';
import { formatDateTime } from '@utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReportListScreen() {
  const navigation = useNavigation<NavigationProp>;
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    const { data, error: fetchError } = await getMyReports();
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setReports(data ?? []);
    }
    setIsLoading(false);
  };

  const renderItem = ({ item }: { item: ReportWithDetails }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
      style={{
        padding: 16,
        borderBottomWidth: 1,
        borderColor: '#eee',
      }}
    >
      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.activity_name}</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>
        {formatDateTime(item.created_at)}
      </Text>
      <Text style={{ color: '#888', marginTop: 2 }}>Status: {item.status}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', padding: 16 }}>
        Daftar Laporan
      </Text>
      {reports.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#888' }}>Belum ada laporan</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={isLoading}
          onRefresh={loadReports}
        />
      )}
    </View>
  );
}
