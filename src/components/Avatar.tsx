import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS } from '../constants/app';

interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
  ring?: boolean;
}

const getInitials = (name: string = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

/**
 * Avatar bulat dengan foto (jika ada avatar_url) atau inisial nama sebagai fallback.
 * Dipakai di seluruh layar bergaya medsos: Beranda, Profil, Pesan.
 */
export default function Avatar({ name, uri, size = 44, style, ring = false }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  const fontSize = Math.max(12, Math.floor(size * 0.4));

  return (
    <View
      style={[
        styles.container,
        dimension,
        ring && styles.ring,
        ring && { padding: 2, width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={[dimension, styles.image]} resizeMode="cover" />
      ) : (
        <View style={[dimension, styles.fallback]}>
          <Text style={[styles.fallbackText, { fontSize }]}>{getInitials(name || '')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.white },
  image: { backgroundColor: COLORS.primaryLight },
  fallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { color: COLORS.white, fontWeight: '700' },
});
