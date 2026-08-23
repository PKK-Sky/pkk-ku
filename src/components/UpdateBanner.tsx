/**
 * Banner mengambang yang muncul saat update OTA sudah selesai didownload
 * dan siap diterapkan. Tap untuk restart & pakai versi terbaru.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOTAUpdate } from '@hooks/useOTAUpdate';

export default function UpdateBanner() {
  const { status, isReady, isChecking, applyUpdate } = useOTAUpdate();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-120)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isReady) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 60,
      }).start();

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.06, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(translateY, { toValue: -120, duration: 200, useNativeDriver: true }).start();
    }
  }, [isReady, translateY, pulse]);

  // Tidak render sama sekali kalau bukan status ready (hemat, tidak ganggu layout)
  if (status !== 'ready') return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY }] }]}
    >
      <Pressable onPress={applyUpdate} disabled={isChecking}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <LinearGradient
            colors={['#1D63ED', '#22D3B5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pill}
          >
            <View style={styles.iconDot}>
              <Ionicons name="sparkles" size={14} color="#fff" />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>Update tersedia</Text>
              <Text style={styles.subtitle}>Tap untuk pakai versi terbaru</Text>
            </View>
            {isChecking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.refreshBtn}>
                <Ionicons name="refresh" size={16} color="#1D63ED" />
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
    elevation: 999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#0B1E3D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    ...Platform.select({ android: { elevation: 8 } }),
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontWeight: '500', fontSize: 11 },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
