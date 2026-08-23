import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useAuth } from '@hooks';

// ============================================================
// DESIGN SYSTEM — My PKK Warakas
// Tema: Biru Tosca + Navy | Instagram × E-Wallet Indonesia
// ============================================================
const COLORS = {
  // Primary — Biru Tosca
  primary: '#00BFA6',
  primaryDark: '#009E8A',
  primaryLight: '#E0F7F4',
  secondary: '#00D9C0',

  // Surfaces
  surface: '#F5F7FA',
  surfaceElevated: '#FFFFFF',

  // Text
  ink: '#1A1A2E',
  inkSoft: '#6B7280',
  inkMuted: '#9CA3AF',
  navy: '#0D1B4C',

  // Borders & Lines
  line: '#E5E7EB',

  // Semantic
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',

  // Gradients
  heroFrom: '#00BFA6',
  heroMid: '#00CBB5',
  heroTo: '#00D9C0',
};

const SHADOWS = {
  cta: {
    shadowColor: '#00BFA6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
};

const QUOTES = [
  'PKK itu geng-nya ibu-ibu paling gercep 🔥',
  'Aktif dikit, dampaknya gede banget!',
  'Laporan kelar, hati auto tenang ✨',
  'Kompak itu kita banget, bund!',
  'Kader kece, Warakas makin oke 💫',
  'Gaskeun bantu sesama, no drama!',
  'Satu data, sejuta manfaat 💪',
  'Ibu produktif, anti mager!',
  'PKK: kumpul seru, kerjanya real!',
  'Warakas maju bareng-bareng, yuk!',
  'Peduli itu keren, bestie 🌸',
  'Kegiatan jalan, Warakas senyum 😊',
  'Gercep dikit, sejahtera banyak!',
  'Gotong royong tuh, vibes kita!',
  'Aksi kecil, rasanya gede banget!',
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const memberAuth = useAuth();
  const adminAuth = useAuth();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Caveat_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // ---- Form anggota ----
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ---- Modal admin ----
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminCode, setAdminCode] = useState('');

  // ---- Quote rotator ----
  const [quoteIndex, setQuoteIndex] = useState(0);
  const quoteOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(quoteOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        Animated.timing(quoteOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [quoteOpacity]);

  const handleMemberLogin = useCallback(async () => {
    if (memberAuth.isLoading) return;
    const result = await memberAuth.loginWithPhone(phone, password);
    if (!result.success) {
      Alert.alert('Login Gagal', result.error ?? 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }, [memberAuth, phone, password]);

  const handleAdminLogin = useCallback(async () => {
    if (adminAuth.isLoading) return;
    const result = await adminAuth.login(adminCode);
    if (result.success) {
      setAdminModalVisible(false);
      setAdminCode('');
    } else {
      Alert.alert('Login Admin Gagal', result.error ?? 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }, [adminAuth, adminCode]);

  const handleForgotPassword = useCallback(() => {
    Alert.alert(
      'Lupa Password',
      'Hubungi pengurus/admin PKK untuk mengatur ulang password akun Anda.'
    );
  }, []);

  const handleActivation = useCallback(() => {
    Alert.alert(
      'Aktivasi Akun',
      'Fitur aktivasi mandiri di dalam aplikasi akan segera hadir. Sementara ini, hubungi admin untuk aktivasi akun Anda.'
    );
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroFrom} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* ================= HERO ================= */}
          <LinearGradient
            colors={[COLORS.heroFrom, COLORS.heroMid, COLORS.heroTo]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 1 }}
            style={[styles.hero, { paddingTop: insets.top + 12 }]}
          >
            {/* Decorative circles */}
            <View style={styles.heroCircle1} />
            <View style={styles.heroCircle2} />

            {/* Admin trigger — TETAP ADA */}
            <Pressable
              style={styles.adminTrigger}
              onPress={() => setAdminModalVisible(true)}
              hitSlop={10}
            >
              <Text style={styles.adminTriggerIcon}>⚙</Text>
            </Pressable>

            {/* Brand: Logo besar kiri + Gambar teks kanan */}
            <View style={styles.brandBlock}>
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.brandMark}
                resizeMode="contain"
              />
              <Image
                source={{
                  uri: 'https://vmbqsogwiaqwqmjpobge.supabase.co/storage/v1/object/public/images/teks_header_login.png',
                }}
                style={styles.brandTextImage}
                resizeMode="contain"
              />
            </View>

            {/* Quote */}
            <View style={styles.quoteRow}>
              <Text style={styles.quoteMark}>✨</Text>
              <Animated.Text style={[styles.quoteText, { opacity: quoteOpacity }]}>
                {QUOTES[quoteIndex]}
              </Animated.Text>
            </View>
          </LinearGradient>

          {/* ================= LOGIN SHEET ================= */}
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Masuk ke Akun</Text>
            <Text style={styles.sheetSubtitle}>
              Masukkan nomor HP dan password untuk melanjutkan
            </Text>

            {/* Nomor HP */}
            <Text style={styles.fieldLabel}>Nomor HP</Text>
            <View style={styles.fieldBox}>
              <View style={styles.cc}>
                <Text style={styles.flag}>🇮🇩</Text>
                <Text style={styles.ccText}>+62</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="812-3456-7890"
                placeholderTextColor={COLORS.inkMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={15}
              />
            </View>

            {/* Password */}
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.fieldBox}>
              <TextInput
                style={styles.input}
                placeholder="Masukkan password"
                placeholderTextColor={COLORS.inkMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={10}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeToggle}>{showPassword ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>

            {/* Forgot password */}
            <View style={styles.forgotRow}>
              <Pressable onPress={handleForgotPassword} hitSlop={8}>
                <Text style={styles.forgotText}>Lupa password?</Text>
              </Pressable>
            </View>

            {/* Error */}
            {memberAuth.error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{memberAuth.error}</Text>
              </View>
            ) : null}

            {/* CTA — Tosca Gradient */}
            <Pressable
              onPress={handleMemberLogin}
              disabled={memberAuth.isLoading}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.cta, memberAuth.isLoading && styles.ctaDisabled]}
              >
                {memberAuth.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Masuk Sebagai Anggota</Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Teks Aktivasi — dipindah ke bawah tombol CTA */}
            <View style={styles.activationRow}>
              <Pressable onPress={handleActivation} hitSlop={8}>
                <Text style={styles.activationLink}>Aktivasi akun disini sayyy...!! ✨</Text>
              </Pressable>
            </View>

            {/* Footer hardcode */}
            <View style={styles.footerHardcode}>
              <Text style={styles.footerHardcodeText}>Digital_PkkWarakas@2026</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= MODAL ADMIN ================= */}
      <Modal
        visible={adminModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAdminModalVisible(false)}
      >
        <Pressable
          style={styles.adminOverlay}
          onPress={() => setAdminModalVisible(false)}
        >
          <Pressable
            style={styles.adminCard}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            <View style={styles.adminCardHead}>
              <View style={styles.adminCardTitleRow}>
                <View style={styles.adminIco}>
                  <Text style={styles.adminIcoText}>⚙</Text>
                </View>
                <Text style={styles.adminCardTitle}>Akses Admin</Text>
              </View>
              <Pressable
                style={styles.adminClose}
                onPress={() => setAdminModalVisible(false)}
                hitSlop={8}
              >
                <Text style={styles.adminCloseText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.adminCardSub}>
              Khusus pengurus dengan hak admin. Masukkan kode akses untuk membuka dashboard.
            </Text>

            <View style={styles.adminField}>
              <TextInput
                style={styles.adminInput}
                placeholder="Kode akses admin"
                placeholderTextColor={COLORS.inkMuted}
                secureTextEntry
                value={adminCode}
                onChangeText={setAdminCode}
                autoCapitalize="none"
              />
            </View>

            <Pressable
              onPress={handleAdminLogin}
              disabled={adminAuth.isLoading}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.adminCta, adminAuth.isLoading && styles.ctaDisabled]}
              >
                {adminAuth.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.adminCtaText}>Masuk Dashboard Admin →</Text>
                )}
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  flex: {
    flex: 1,
  },
  fontLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ================= HERO =================
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'space-between',
    minHeight: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  heroCircle1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  adminTrigger: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  adminTriggerIcon: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },

  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  brandMark: {
    width: 110,
    height: 110,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  brandTextImage: {
    flex: 1,
    height: 60,
  },

  quoteRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 14,
    marginBottom: 4,
  },
  quoteMark: {
    fontSize: 18,
    color: '#FFE27A',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  quoteText: {
    flex: 1,
    fontFamily: 'Caveat_700Bold',
    fontSize: 20,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 26,
  },

  // ================= SHEET =================
  sheet: {
    marginTop: -24,
    backgroundColor: COLORS.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    flex: 1,
    ...SHADOWS.card,
  },
  grabber: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.line,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: COLORS.navy,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.inkSoft,
    marginBottom: 20,
  },

  // ================= FIELDS =================
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: COLORS.navy,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FAFBFC',
    marginBottom: 16,
  },
  cc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    borderRightWidth: 1.5,
    borderRightColor: COLORS.line,
  },
  ccText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.navy,
  },
  flag: {
    fontSize: 15,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.navy,
    padding: 0,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeToggle: {
    fontSize: 16,
  },

  // ================= ACTIONS =================
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -8,
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: 'Inter_600SemiBold',
  },

  errorBox: {
    backgroundColor: COLORS.danger + '12',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },

  cta: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.cta,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: '#fff',
  },

  // Activation link — dipindah ke bawah CTA
  activationRow: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 6,
  },
  activationLink: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: COLORS.primary,
  },

  // Footer hardcode
  footerHardcode: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
  footerHardcodeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: COLORS.inkMuted,
    letterSpacing: 0.5,
  },

  // ================= MODAL ADMIN =================
  adminOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,46,0.55)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  adminCard: {
    width: '100%',
    backgroundColor: COLORS.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    ...SHADOWS.card,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.line,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 16,
  },
  adminCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  adminCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminIco: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminIcoText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  adminCardTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 17,
    color: COLORS.ink,
  },
  adminClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  adminCloseText: {
    color: COLORS.inkSoft,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  adminCardSub: {
    fontSize: 13,
    color: COLORS.inkSoft,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  adminField: {
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FAFBFC',
    marginBottom: 20,
  },
  adminInput: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    letterSpacing: 1.5,
    color: COLORS.ink,
    padding: 0,
  },
  adminCta: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.cta,
  },
  adminCtaText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: '#fff',
  },
});
