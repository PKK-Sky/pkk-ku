import React, { useState } from 'react';
import { View, Text, TextInput, Button, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useAuth } from '@hooks';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Data belum lengkap', 'Email dan password wajib diisi.');
      return;
    }
    const result = await login(email, password);
    if (!result.success && result.error) Alert.alert('Login Gagal', result.error);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PKK Laporan Kegiatan</Text>
      <Text style={styles.subtitle}>Masuk sebagai admin TP PKK Kelurahan Warakas</Text>
      <TextInput placeholder="Email admin" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!isLoading} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!isLoading} style={styles.input} />
      {isLoading ? <ActivityIndicator /> : <Button title="Masuk sebagai Admin" onPress={handleLogin} />}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  error: { color: '#dc3545', marginTop: 12, textAlign: 'center' },
});
