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

const COLORS = {
  bluePrimary: '#1D63ED',
  blueDeep: '#0B1E3D',
  gold: '#FFC629',
  teal: '#22D3B5',
  surface: '#F7F9FF',
  ink: '#10162B',
  inkSoft: '#5B6478',
  line: '#E6EAF5',
  heroFrom: '#7A4497',
  heroMid: '#6B3985',
  heroTo: '#5C2F72',
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
  // Dua instance terpisah supaya loading/error form anggota tidak bercampur dengan modal admin
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
        <ActivityIndicator color={COLORS.bluePrimary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* ================= HERO ================= */}
          <LinearGradient
            colors={[COLORS.heroFrom, COLORS.heroMid, COLORS.heroTo]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 1 }}
            style={[styles.hero, { paddingTop: insets.top + 12 }]}
          >
            <Pressable
              style={styles.adminTrigger}
              onPress={() => setAdminModalVisible(true)}
              hitSlop={10}
            >
              <Text style={styles.adminTriggerIcon}>⚙</Text>
            </Pressable>

            <View style={styles.brandBlock}>
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.brandMark}
                resizeMode="contain"
              />
              <View style={styles.brandCopy}>
                <Text style={styles.brandWordmarkSmall}>Selamat Datang di</Text>
                <Text style={styles.brandWordmarkBig}>My PKK Warakas</Text>
              </View>
            </View>

            <View style={styles.quoteRow}>
              <Text style={styles.quoteMark}>✨</Text>
              <Animated.Text style={[styles.quoteText, { opacity: quoteOpacity }]}>
                {QUOTES[quoteIndex]}
              </Animated.Text>
            </View>
          </LinearGradient>

          {/* ================= SHEET ================= */}
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Masuk</Text>

            <Text style={styles.fieldLabel}>Nomor HP</Text>
            <View style={styles.fieldBox}>
              <View style={styles.cc}>
                <Text style={styles.flag}>🇮🇩</Text>
                <Text style={styles.ccText}>+62</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="812-3456-7890"
                placeholderTextColor="#B7BFD1"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={15}
              />
            </View>

            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.fieldBox}>
              <TextInput
                style={styles.input}
                placeholder="Masukkan password"
                placeholderTextColor="#B7BFD1"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={10}>
                <Text style={styles.eyeToggle}>{showPassword ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>

            <View style={styles.forgotRow}>
              <Pressable onPress={handleForgotPassword} hitSlop={8}>
                <Text style={styles.forgotText}>Lupa password?</Text>
              </Pressable>
            </View>

            {memberAuth.error ? <Text style={styles.errorText}>{memberAuth.error}</Text> : null}

            <Pressable onPress={handleMemberLogin} disabled={memberAuth.isLoading}>
              <LinearGradient
                colors={[COLORS.bluePrimary, COLORS.teal]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.cta, memberAuth.isLoading && styles.ctaDisabled]}
              >
                {memberAuth.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Masuk →</Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.footerRow}>
              <Pressable onPress={handleActivation} hitSlop={8}>
                <Text style={styles.footerLink}>Aktivasi akun disini sayyy...!! ✨</Text>
              </Pressable>
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
        <Pressable style={styles.adminOverlay} onPress={() => setAdminModalVisible(false)}>
          <Pressable style={styles.adminCard} onPress={(e) => e.stopPropagation()}>
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
                placeholderTextColor="#B7BFD1"
                secureTextEntry
                value={adminCode}
                onChangeText={setAdminCode}
                autoCapitalize="none"
              />
            </View>
            <Pressable onPress={handleAdminLogin} disabled={adminAuth.isLoading}>
              <View style={[styles.adminCta, adminAuth.isLoading && styles.ctaDisabled]}>
                {adminAuth.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.adminCtaText}>Masuk Dashboard Admin →</Text>
                )}
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },
  fontLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  scrollContent: { flexGrow: 1 },

  hero: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  adminTrigger: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  adminTriggerIcon: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },

  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  brandMark: { width: 96, height: 96 },
  brandCopy: { flex: 1, gap: 2 },
  brandWordmarkSmall: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  brandWordmarkBig: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
  },

  quoteRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 14 },
  quoteMark: { fontSize: 18, color: '#FFE27A', fontFamily: 'SpaceGrotesk_700Bold' },
  quoteText: {
    flex: 1,
    fontFamily: 'Caveat_700Bold',
    fontSize: 20,
    color: 'rgba(255,255,255,0.98)',
    lineHeight: 24,
  },

  sheet: {
    marginTop: -24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    flex: 1,
  },
  grabber: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.line,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 19,
    color: COLORS.ink,
    marginBottom: 16,
  },

  fieldLabel: {
    fontSize: 11.5,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.ink,
    marginBottom: 7,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.6,
    borderColor: COLORS.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FBFCFF',
    marginBottom: 14,
  },
  cc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    borderRightWidth: 1.5,
    borderRightColor: COLORS.line,
  },
  ccText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: COLORS.ink },
  flag: { fontSize: 15 },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: 'Inter_500Medium',
    color: COLORS.ink,
    padding: 0,
  },
  eyeToggle: { fontSize: 15 },

  forgotRow: { alignItems: 'flex-end', marginTop: -6, marginBottom: 18 },
  forgotText: { fontSize: 11.5, color: COLORS.bluePrimary, fontFamily: 'Inter_600SemiBold' },

  errorText: {
    color: '#D92D20',
    fontSize: 12.5,
    fontFamily: 'Inter_500Medium',
    marginBottom: 14,
    textAlign: 'center',
  },

  cta: {
    borderRadius: 100,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.bluePrimary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14.5, color: '#fff' },

  footerRow: { alignItems: 'center', marginTop: 22 },
  footerLink: { fontSize: 13, fontFamily: 'Inter_700Bold', color: COLORS.bluePrimary },

  adminOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,30,61,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  adminCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
  },
  adminCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  adminCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  adminIco: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: COLORS.blueDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminIcoText: { color: COLORS.gold, fontSize: 11 },
  adminCardTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15.5, color: COLORS.ink },
  adminClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F3F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCloseText: { color: '#8891A6', fontSize: 12 },
  adminCardSub: {
    fontSize: 11.5,
    color: COLORS.inkSoft,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    marginBottom: 16,
    lineHeight: 16,
  },
  adminField: {
    borderWidth: 1.6,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: '#FBFCFF',
    marginBottom: 14,
  },
  adminInput: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    letterSpacing: 1.5,
    color: COLORS.ink,
    padding: 0,
  },
  adminCta: {
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blueDeep,
  },
  adminCtaText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13.5, color: '#fff' },
});
