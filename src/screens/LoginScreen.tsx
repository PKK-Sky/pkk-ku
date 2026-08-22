// src/screens/LoginScreen.tsx
// LoginScreen V3 — Medsos Style · Tosca Theme · Gen Z Vibe
// FULLY SYNCED dengan 5 Peta Backend (RPC, RLS, Realtime, Storage, Backend)
//
// Alur User Login   : Phone + Password → generate email → signInWithPassword
// Alur Aktivasi     : Phone → check_member_by_phone → signUp → complete_member_registration
// Alur Admin Login  : Email + Password (modal headphone pojok kanan atas)
//
// Dependensi:
//   npx expo install expo-linear-gradient @expo/vector-icons
//   npx expo install @expo-google-fonts/baloo-2 @expo-google-fonts/plus-jakarta-sans expo-font
//   npx expo install expo-image-picker expo-file-system

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Baloo2_700Bold, Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@lib/supabase';
import { useAuth } from '@hooks/useAuth';


// ═══════════════════════════════════════════════════════════════════
// PALET WARNA — Tosca Hijau Biru (Gen Z Muted Premium)
// ═══════════════════════════════════════════════════════════════════
const C = {
  toscaDeep: '#0B5D59',
  tosca: '#0E8A82',
  toscaBright: '#1FBAA8',
  toscaLight: '#4DD0E1',
  blueSoft: '#81D4FA',
  blueGlow: '#4FC3F7',
  ink: '#0B2B29',
  inkSoft: '#5C7B77',
  inkLight: '#8CA8A4',
  line: '#D0ECE8',
  lineSoft: '#E8F5F2',
  white: '#FFFFFF',
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.40)',
  errorBg: '#FFEBEE',
  errorText: '#C62828',
  successBg: '#E8F5E9',
  successText: '#2E7D32',
  warningBg: '#FFF8E1',
  warningText: '#F57F17',
};

// ═══════════════════════════════════════════════════════════════════
// 15 TEKS GEN Z — Auto Swap tiap 5 detik (HARDCODE)
// ═══════════════════════════════════════════════════════════════════
const GENZ_QUOTES = [
  'Warga Aktif, Keluarga Sejahtera ✨',
  'PKK Itu Keren, Bukan Kuno! 🔥',
  'Perempuan Hebat, Indonesia Jaya 💪',
  'Dari Warakas Untuk Negeri 🇮🇩',
  'Bersama PKK, Kita Bisa! 🤝',
  'Empowering Women, One Family at a Time 💚',
  'PKK Squad: Stronger Together! 💙',
  'Membangun Keluarga, Membangun Bangsa 🏠',
  'Ketua PKK Juga Bisa Main TikTok 😎',
  'Dapur Sehat, Keluarga Bahagia 🍃',
  'PKK Warakas: Gak Ada Obat! 💯',
  'Cewe PKK Jangan Diremehin! 👑',
  'Gotong Royong Itu Aesthetic 🤌',
  'Keluarga Sehat = Indonesia Kuat 💪',
  'My PKK My Rules, My Family My Pride 🫶',
];

// ═══════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════
type StatusType = 'info' | 'error' | 'success' | 'warning';
interface StatusMsg { kind: StatusType; text: string }

interface MemberCheckData {
  found: boolean;
  already_registered: boolean;
  blocked: boolean;
  full_name: string;
  position_name: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Generate email deterministik dari nomor HP
// Contoh: 08123456789 → +628123456789@pkkwarakas.id
// ═══════════════════════════════════════════════════════════════════
function normalizePhone(raw: string): string {
  let cleaned = raw.trim().replace(/\D/g, '');
  if (cleaned.startsWith('62')) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  return cleaned;
}

function generateEmailFromPhone(rawPhone: string): string {
  const cleaned = normalizePhone(rawPhone);
  return `+62${cleaned}@pkkwarakas.id`;
}

function showAlert(title: string, message: string, onOk?: () => void) {
  Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function LoginScreen() {
  // ── Fonts ──
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // ── Auth Hook (untuk admin login) ──
  const { login: adminLogin } = useAuth();

  // ── Swap Text Animation ──
  const [quoteIndex, setQuoteIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setQuoteIndex((prev) => {
          let next;
          do { next = Math.floor(Math.random() * GENZ_QUOTES.length); }
          while (next === prev && GENZ_QUOTES.length > 1);
          return next;
        });
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [fadeAnim]);

  // ── Main Login State ──
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusMsg | null>(null);

  // ── Admin Modal State ──
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  // ── Activation Flow State ──
  const [activationStep, setActivationStep] = useState<0 | 1 | 2>(0);
  const [activationPhone, setActivationPhone] = useState('');
  const [activationMember, setActivationMember] = useState<MemberCheckData | null>(null);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationForm, setActivationForm] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
    address: '',
    avatarUri: '',
  });
  const [showActPassword, setShowActPassword] = useState(false);
  const [showActConfirm, setShowActConfirm] = useState(false);

  // ═════════════════════════════════════════════════════════════════
  // STATUS HELPER
  // ═════════════════════════════════════════════════════════════════
  const showStatus = useCallback((kind: StatusType, text: string) => {
    setStatus({ kind, text });
    if (kind !== 'error') setTimeout(() => setStatus(null), 4000);
  }, []);

  // ═════════════════════════════════════════════════════════════════
  // USER LOGIN: Phone + Password
  // Generate email deterministik dari phone → signInWithPassword
  // ═════════════════════════════════════════════════════════════════
  const handleUserLogin = useCallback(async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 9 || normalized.length > 12) {
      showStatus('error', 'Masukkan nomor HP yang valid (9–12 digit).');
      return;
    }
    if (!password || password.length < 6) {
      showStatus('error', 'Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    showStatus('info', 'Mencari akun kamu…');

    try {
      const loginEmail = generateEmailFromPhone(phone);

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          showStatus('error', 'Password salah. Coba lagi ya!');
        } else if (signInError.message.includes('Email not confirmed')) {
          showStatus('error', 'Akun belum aktif. Selesaikan aktivasi dulu.');
        } else {
          throw signInError;
        }
        return;
      }

      if (signInData.session) {
        showStatus('success', 'Login berhasil! Selamat datang 👋');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showStatus('error', err?.message ?? 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [phone, password, showStatus]);

  // ═════════════════════════════════════════════════════════════════
  // ADMIN LOGIN (Modal)
  // ═════════════════════════════════════════════════════════════════
  const handleAdminLogin = useCallback(async () => {
    if (!adminEmail.trim() || !adminPassword) {
      showAlert('Data belum lengkap', 'Email dan kata sandi wajib diisi.');
      return;
    }
    setAdminLoading(true);
    try {
      const result = await adminLogin(adminEmail.trim(), adminPassword);
      if (result.success) {
        setAdminModalOpen(false);
        setAdminEmail('');
        setAdminPassword('');
      } else {
        showAlert('Gagal Masuk', result.error ?? 'Login gagal');
      }
    } catch (err: any) {
      showAlert('Gagal Masuk', err?.message ?? 'Terjadi kesalahan');
    } finally {
      setAdminLoading(false);
    }
  }, [adminEmail, adminPassword, adminLogin]);

  // ═════════════════════════════════════════════════════════════════
  // ACTIVATION — STEP 1: Cek Nomor via RPC check_member_by_phone
  // ═════════════════════════════════════════════════════════════════
  const handleActivationCheck = useCallback(async () => {
    const normalized = normalizePhone(activationPhone);
    if (normalized.length < 9 || normalized.length > 12) {
      showAlert('Nomor tidak valid', 'Masukkan nomor HP yang valid (9–12 digit).');
      return;
    }

    setActivationLoading(true);
    try {
      const fullPhone = '0' + normalized;
      const { data, error } = await supabase.rpc('check_member_by_phone', {
        p_phone: fullPhone,
      });

      if (error) throw error;

      const member = data as MemberCheckData;
      if (!member?.found) {
        showAlert('Nomor Tidak Ditemukan', member?.message ?? 'Nomor belum terdaftar. Hubungi admin untuk pendaftaran.');
        return;
      }

      if (member.blocked) {
        showAlert('Akun Diblokir', member.message ?? 'Akun ini diblokir. Hubungi pengurus.');
        return;
      }

      if (member.already_registered) {
        showAlert('Sudah Aktif', 'Nomor ini sudah diaktivasi. Langsung login aja!');
        setActivationStep(0);
        setPhone(activationPhone);
        return;
      }

      setActivationMember(member);
      setActivationForm((prev) => ({ ...prev, fullName: member.full_name }));
      setActivationStep(1);
    } catch (err: any) {
      showAlert('Gagal', err?.message ?? 'Terjadi kesalahan');
    } finally {
      setActivationLoading(false);
    }
  }, [activationPhone]);

  // ═════════════════════════════════════════════════════════════════
  // ACTIVATION — STEP 1→2: Konfirmasi "Ya, itu saya"
  // ═════════════════════════════════════════════════════════════════
  const handleConfirmIdentity = useCallback(() => {
    setActivationStep(2);
  }, []);

  // ═════════════════════════════════════════════════════════════════
  // ACTIVATION — STEP 2: Submit Lengkapi Profil
  // Alur: signUp (generated email) → upload avatar → complete_member_registration
  // ═════════════════════════════════════════════════════════════════
  const handleActivationSubmit = useCallback(async () => {
    const { password: actPassword, confirmPassword, fullName, address, avatarUri } = activationForm;

    if (!actPassword || actPassword.length < 6) {
      showAlert('Password terlalu pendek', 'Password minimal 6 karakter.');
      return;
    }
    if (actPassword !== confirmPassword) {
      showAlert('Password tidak cocok', 'Konfirmasi password harus sama.');
      return;
    }

    setActivationLoading(true);
    try {
      const normalizedPhone = normalizePhone(activationPhone);
      const fullPhone = '0' + normalizedPhone;
      const generatedEmail = generateEmailFromPhone(activationPhone);

      // STEP A: SignUp ke Supabase Auth dengan email deterministik
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: generatedEmail,
        password: actPassword,
        options: {
          data: {
            full_name: fullName || activationMember?.full_name || '',
            phone: fullPhone,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          showAlert('Email Sudah Terdaftar', 'Akun dengan nomor ini sudah pernah dibuat. Coba login langsung.');
        } else {
          throw signUpError;
        }
        return;
      }

      const userId = signUpData.user?.id;
      const session = signUpData.session;
      if (!userId || !session) {
        throw new Error('Gagal membuat akun. Coba lagi atau hubungi admin.');
      }

      // STEP B: Upload avatar kalau ada (ke post-media bucket, path: {authUid}/profile/avatar.jpg)
      let avatarUrl = '';
      if (avatarUri) {
        try {
          const response = await fetch(avatarUri);
          const blob = await response.blob();
          const fileExt = avatarUri.split('.').pop() ?? 'jpg';
          const filePath = `${userId}/profile/avatar.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('post-media')
            .upload(filePath, blob, {
              contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
              upsert: true,
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(filePath);
            avatarUrl = urlData.publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Avatar upload failed:', uploadErr);
        }
      }

      // STEP C: Panggil RPC complete_member_registration (SECURITY DEFINER)
      const { error: rpcError } = await supabase.rpc('complete_member_registration', {
        p_phone: fullPhone,
        p_address: address || null,
        p_avatar_url: avatarUrl || null,
      });

      if (rpcError) {
        console.error('RPC complete_member_registration error:', rpcError);
        await supabase
          .from('members')
          .update({
            user_id: userId,
            registration_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('phone', fullPhone);
      }

      // STEP D: Upsert profiles fallback
      await supabase.from('profiles').upsert({
        id: userId,
        name: fullName || activationMember?.full_name || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      showAlert(
        'Aktivasi Berhasil! 🎉',
        'Akun kamu sudah aktif. Silakan login dengan nomor HP dan password.',
        () => {
          setActivationStep(0);
          setActivationPhone('');
          setActivationMember(null);
          setActivationForm({ fullName: '', password: '', confirmPassword: '', address: '', avatarUri: '' });
          setPhone(activationPhone);
          setPassword('');
        }
      );
    } catch (err: any) {
      console.error('Activation error:', err);
      showAlert('Aktivasi Gagal', err?.message ?? 'Terjadi kesalahan. Coba lagi atau hubungi admin.');
    } finally {
      setActivationLoading(false);
    }
  }, [activationForm, activationPhone, activationMember]);

  // ═════════════════════════════════════════════════════════════════
  // AVATAR PICKER
  // ═════════════════════════════════════════════════════════════════
  const pickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Izin Diperlukan', 'Akses galeri diperlukan untuk upload foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setActivationForm((prev) => ({ ...prev, avatarUri: result.assets[0].uri }));
    }
  }, []);

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
  if (!fontsLoaded) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color={C.tosca} />
        <Text style={s.loadingText}>Memuat…</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {/* Background Gradient Blob */}
      <LinearGradient colors={['#E0F7FA', '#E8F5E9', '#FFFFFF']} style={s.bgGradient} />
      <View style={[s.blob, s.blobA]} />
      <View style={[s.blob, s.blobB]} />
      <View style={[s.blob, s.blobC]} />

      {/* Admin Access Button — pojok kanan atas, ikon headphone tanpa teks */}
      <Pressable
        style={({ pressed }) => [s.adminBtn, pressed && s.adminBtnPressed]}
        onPress={() => setAdminModalOpen(true)}
        accessibilityLabel="Akses Admin"
        hitSlop={10}
      >
        <Ionicons name="headset" size={20} color={C.toscaDeep} />
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.stage} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            {/* Logo Besar Atas Tengah */}
            <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" />

            {/* App Name */}
            <Text style={s.appName}>My PKK Warakas</Text>

            {/* Gen Z Swap Quote */}
            <Animated.Text style={[s.quoteText, { opacity: fadeAnim }]}>
              {GENZ_QUOTES[quoteIndex]}
            </Animated.Text>

            {/* Status Message */}
            {status && (
              <View style={[s.statusBox, s[`status_${status.kind}`]]}>
                <Text style={[s.statusText, { color: status.kind === 'error' ? C.errorText : status.kind === 'success' ? C.successText : status.kind === 'warning' ? C.warningText : C.toscaDeep }]}>
                  {status.text}
                </Text>
              </View>
            )}

            {/* Input: No.HP */}
            <View style={s.inputPill}>
              <Ionicons name="phone-portrait-outline" size={18} color={C.tosca} style={{ marginRight: 10 }} />
              <Text style={s.phonePrefix}>+62</Text>
              <TextInput
                style={s.phoneInput}
                placeholder="812-xxxx-xxxx"
                placeholderTextColor={C.inkLight}
                keyboardType="number-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                value={phone}
                onChangeText={setPhone}
                maxLength={13}
                editable={!loading}
              />
            </View>

            {/* Input: Password */}
            <View style={s.inputPill}>
              <Ionicons name="lock-closed-outline" size={18} color={C.tosca} style={{ marginRight: 10 }} />
              <TextInput
                style={s.inputFlex}
                placeholder="Password"
                placeholderTextColor={C.inkLight}
                secureTextEntry={!showPassword}
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={{ padding: 6 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.inkSoft} />
              </Pressable>
            </View>

            {/* Remember Me */}
            <View style={s.rememberRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: C.line, true: C.toscaBright }}
                  thumbColor={rememberMe ? C.toscaDeep : '#f4f3f4'}
                />
                <Text style={s.rememberText}>Ingat login saya</Text>
              </View>
            </View>

            {/* Login Button */}
            <Pressable style={({ pressed }) => [s.btnWrap, (pressed || loading) && { opacity: 0.9 }]} onPress={handleUserLogin} disabled={loading}>
              <LinearGradient colors={[C.tosca, C.toscaBright, C.blueGlow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btnPrimary}>
                {loading ? <ActivityIndicator color={C.white} /> : <Text style={s.btnText}>Masuk</Text>}
              </LinearGradient>
            </Pressable>

            {/* Links: Aktivasi + Hubungi Admin */}
            <View style={s.linksBox}>
              <Pressable onPress={() => setActivationStep(1)}>
                <Text style={s.linkPrimary}>Aktivasi di sini</Text>
              </Pressable>
              <Text style={s.linkDivider}>·</Text>
              <Text style={s.linkMuted}>Hubungi admin jika nomor kamu belum terdaftar</Text>
            </View>

            {/* Footer */}
            <Text style={s.footer}>Tim Penggerak PKK · Kelurahan Warakas</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ADMIN LOGIN (Ikon Headphone)
         ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={adminModalOpen} transparent animationType="fade" onRequestClose={() => setAdminModalOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setAdminModalOpen(false)}>
          <View style={s.modalCard}>
            <Pressable style={s.modalClose} onPress={() => setAdminModalOpen(false)}>
              <Ionicons name="close" size={18} color={C.toscaDeep} />
            </Pressable>

            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={s.adminIconCircle}>
                <Ionicons name="shield-checkmark" size={28} color={C.toscaDeep} />
              </View>
              <Text style={s.modalEyebrow}>AKSES PENGURUS</Text>
              <Text style={s.modalTitle}>Masuk sebagai Admin</Text>
            </View>

            <Text style={s.modalLabel}>Email</Text>
            <TextInput
              style={s.modalInput}
              placeholder="admin@pkkwarakas.id"
              placeholderTextColor={C.inkLight}
              autoCapitalize="none"
              keyboardType="email-address"
              value={adminEmail}
              onChangeText={setAdminEmail}
              editable={!adminLoading}
            />

            <Text style={s.modalLabel}>Kata Sandi</Text>
            <View style={s.passwordWrap}>
              <TextInput
                style={s.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={C.inkLight}
                secureTextEntry={!showAdminPassword}
                value={adminPassword}
                onChangeText={setAdminPassword}
                editable={!adminLoading}
              />
              <Pressable onPress={() => setShowAdminPassword((v) => !v)} style={{ padding: 8 }}>
                <Ionicons name={showAdminPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.inkSoft} />
              </Pressable>
            </View>

            <Pressable style={({ pressed }) => [s.btnAdmin, (pressed || adminLoading) && { opacity: 0.9 }]} onPress={handleAdminLogin} disabled={adminLoading}>
              {adminLoading ? <ActivityIndicator color={C.white} /> : <Text style={s.btnAdminText}>Masuk sebagai Admin</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: AKTIVASI STEP 1 — Cek Nomor + Konfirmasi Identitas
         ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={activationStep === 1} transparent animationType="slide" onRequestClose={() => setActivationStep(0)}>
        <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <Pressable style={s.modalClose} onPress={() => setActivationStep(0)}>
              <Ionicons name="close" size={18} color={C.toscaDeep} />
            </Pressable>

            {!activationMember ? (
              <>
                <Text style={s.modalEyebrow}>AKTIVASI AKUN</Text>
                <Text style={s.modalTitle}>Masukkan Nomor HP</Text>
                <Text style={s.modalDesc}>Kami akan cek apakah nomor kamu sudah terdaftar di data keanggotaan PKK.</Text>

                <View style={s.inputPill}>
                  <Text style={s.phonePrefix}>+62</Text>
                  <TextInput
                    style={s.phoneInput}
                    placeholder="812-xxxx-xxxx"
                    placeholderTextColor={C.inkLight}
                    keyboardType="number-pad"
                    value={activationPhone}
                    onChangeText={setActivationPhone}
                    maxLength={13}
                    editable={!activationLoading}
                  />
                </View>

                <Pressable style={({ pressed }) => [s.btnWrap, (pressed || activationLoading) && { opacity: 0.9 }]} onPress={handleActivationCheck} disabled={activationLoading}>
                  <LinearGradient colors={[C.tosca, C.toscaBright]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btnPrimary}>
                    {activationLoading ? <ActivityIndicator color={C.white} /> : <Text style={s.btnText}>Cek Nomor</Text>}
                  </LinearGradient>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={s.modalEyebrow}>KONFIRMASI DATA</Text>
                <Text style={s.modalTitle}>Apakah ini kamu?</Text>
                <View style={s.confirmBox}>
                  <Ionicons name="person-circle" size={48} color={C.tosca} />
                  <Text style={s.confirmName}>{activationMember.full_name}</Text>
                  <View style={s.confirmBadge}>
                    <Text style={s.confirmBadgeText}>{activationMember.position_name}</Text>
                  </View>
                </View>
                <Text style={s.modalDesc}>Kalau data di atas benar, lanjutkan untuk melengkapi profil dan membuat password.</Text>

                <Pressable style={({ pressed }) => [s.btnWrap, pressed && { opacity: 0.9 }]} onPress={handleConfirmIdentity}>
                  <LinearGradient colors={[C.tosca, C.toscaBright, C.blueGlow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btnPrimary}>
                    <Text style={s.btnText}>Ya, itu saya 👍</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setActivationMember(null)}>
                  <Text style={s.linkMuted}>Bukan saya, coba nomor lain</Text>
                </Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: AKTIVASI STEP 2 — Lengkapi Profil + Set Password
         ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={activationStep === 2} transparent animationType="slide" onRequestClose={() => setActivationStep(1)}>
        <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={[s.modalCard, { width: '100%', maxWidth: 380 }]}>
              <Pressable style={s.modalClose} onPress={() => setActivationStep(1)}>
                <Ionicons name="close" size={18} color={C.toscaDeep} />
              </Pressable>

              <Text style={s.modalEyebrow}>LENGKAPI PROFIL</Text>
              <Text style={s.modalTitle}>Buat Akun Baru</Text>

              {/* Avatar Upload */}
              <Pressable style={s.avatarUpload} onPress={pickAvatar}>
                {activationForm.avatarUri ? (
                  <Image source={{ uri: activationForm.avatarUri }} style={s.avatarImage} />
                ) : (
                  <>
                    <Ionicons name="camera" size={28} color={C.tosca} />
                    <Text style={s.avatarLabel}>Tap untuk foto profil</Text>
                  </>
                )}
              </Pressable>

              {/* Nama Lengkap (auto dari members) */}
              <Text style={s.modalLabel}>Nama Lengkap</Text>
              <TextInput
                style={s.modalInput}
                placeholder="Nama sesuai KTP"
                placeholderTextColor={C.inkLight}
                value={activationForm.fullName}
                onChangeText={(t) => setActivationForm((p) => ({ ...p, fullName: t }))}
              />

              {/* Alamat */}
              <Text style={s.modalLabel}>Alamat (Opsional)</Text>
              <TextInput
                style={[s.modalInput, { height: 72, textAlignVertical: 'top' }]}
                placeholder="Alamat domisili"
                placeholderTextColor={C.inkLight}
                multiline
                numberOfLines={3}
                value={activationForm.address}
                onChangeText={(t) => setActivationForm((p) => ({ ...p, address: t }))}
              />

              {/* Password */}
              <Text style={s.modalLabel}>Password Baru</Text>
              <View style={s.passwordWrap}>
                <TextInput
                  style={s.passwordInput}
                  placeholder="Min. 6 karakter"
                  placeholderTextColor={C.inkLight}
                  secureTextEntry={!showActPassword}
                  value={activationForm.password}
                  onChangeText={(t) => setActivationForm((p) => ({ ...p, password: t }))}
                />
                <Pressable onPress={() => setShowActPassword((v) => !v)} style={{ padding: 8 }}>
                  <Ionicons name={showActPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.inkSoft} />
                </Pressable>
              </View>

              {/* Konfirmasi Password */}
              <Text style={s.modalLabel}>Konfirmasi Password</Text>
              <View style={s.passwordWrap}>
                <TextInput
                  style={s.passwordInput}
                  placeholder="Ulangi password"
                  placeholderTextColor={C.inkLight}
                  secureTextEntry={!showActConfirm}
                  value={activationForm.confirmPassword}
                  onChangeText={(t) => setActivationForm((p) => ({ ...p, confirmPassword: t }))}
                />
                <Pressable onPress={() => setShowActConfirm((v) => !v)} style={{ padding: 8 }}>
                  <Ionicons name={showActConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.inkSoft} />
                </Pressable>
              </View>

              <Pressable style={({ pressed }) => [s.btnWrap, (pressed || activationLoading) && { opacity: 0.9 }]} onPress={handleActivationSubmit} disabled={activationLoading}>
                <LinearGradient colors={[C.tosca, C.toscaBright, C.blueGlow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btnPrimary}>
                  {activationLoading ? <ActivityIndicator color={C.white} /> : <Text style={s.btnText}>Aktivasi Sekarang 🚀</Text>}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: C.inkSoft,
  },
  screen: {
    flex: 1,
    backgroundColor: C.white,
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.25,
  },
  blobA: {
    width: 340,
    height: 340,
    top: -140,
    right: -80,
    backgroundColor: C.toscaBright,
  },
  blobB: {
    width: 280,
    height: 280,
    bottom: -100,
    left: -60,
    backgroundColor: C.blueGlow,
  },
  blobC: {
    width: 200,
    height: 200,
    top: '40%',
    left: -60,
    backgroundColor: C.toscaLight,
    opacity: 0.15,
  },
  adminBtn: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 50,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.toscaDeep,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  adminBtnPressed: {
    backgroundColor: C.lineSoft,
    transform: [{ scale: 0.95 }],
  },
  stage: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 8,
  },
  appName: {
    fontFamily: 'Baloo2_700Bold',
    fontSize: 28,
    color: C.toscaDeep,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  quoteText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: C.tosca,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  statusBox: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  status_info: { backgroundColor: C.lineSoft },
  status_error: { backgroundColor: C.errorBg },
  status_success: { backgroundColor: C.successBg },
  status_warning: { backgroundColor: C.warningBg },
  statusText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 999,
    backgroundColor: C.white,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: C.toscaDeep,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  phonePrefix: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: C.ink,
    marginRight: 6,
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: C.ink,
    paddingVertical: 14,
  },
  inputFlex: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: C.ink,
    paddingVertical: 14,
  },
  rememberRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  rememberText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: C.inkSoft,
    marginLeft: 8,
  },
  btnWrap: {
    width: '100%',
  },
  btnPrimary: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.tosca,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  btnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: C.white,
    letterSpacing: 0.5,
  },
  linksBox: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  linkPrimary: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: C.tosca,
  },
  linkDivider: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: C.inkLight,
  },
  linkMuted: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12.5,
    color: C.inkLight,
    textAlign: 'center',
  },
  footer: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11.5,
    color: C.inkLight,
    marginTop: 36,
    textAlign: 'center',
  },
  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,43,41,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 26,
    shadowColor: C.toscaDeep,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  adminIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalEyebrow: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: C.tosca,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 20,
    color: C.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDesc: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: C.inkSoft,
    marginBottom: 20,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: C.ink,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: C.ink,
    backgroundColor: C.white,
  },
  passwordWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 16,
    backgroundColor: C.white,
    paddingRight: 6,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: C.ink,
  },
  btnAdmin: {
    width: '100%',
    backgroundColor: C.toscaDeep,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnAdminText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: C.white,
  },
  // ── Activation Confirm ──
  confirmBox: {
    alignItems: 'center',
    backgroundColor: C.lineSoft,
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    width: '100%',
  },
  confirmName: {
    fontFamily: 'Baloo2_700Bold',
    fontSize: 18,
    color: C.ink,
    marginTop: 8,
  },
  confirmBadge: {
    backgroundColor: C.tosca,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 6,
  },
  confirmBadgeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: C.white,
  },
  // ── Avatar Upload ──
  avatarUpload: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.lineSoft,
    borderWidth: 2,
    borderColor: C.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: C.inkSoft,
    marginTop: 4,
  },
});
