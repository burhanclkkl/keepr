import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Lock, User, Bookmark, X, Check } from 'lucide-react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../theme';
import { VerificationScreen } from './VerificationScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

export const AuthScreen: React.FC = () => {
  const { login } = useAuth();
  const { colors, themeMode } = useTheme();
  const { showToast } = useToast();
  const isDark = themeMode === 'dark';

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Verification and KVKK state variables
  const [viewMode, setViewMode] = useState<'form' | 'verify' | 'forgot'>('form');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [kvkkModalOpen, setKvkkModalOpen] = useState(false);

  const handleAuth = async () => {
    // Validate fields
    if (isLogin && (!email.trim() || !password.trim())) {
      showToast('Lütfen tüm alanları doldurun.', 'error');
      return;
    }
    if (!isLogin && (!username.trim() || !fullName.trim() || !email.trim() || !password.trim())) {
      showToast('Lütfen tüm alanları doldurun.', 'error');
      return;
    }
    if (!isLogin && !kvkkAccepted) {
      showToast('Kayıt olmak için KVKK Aydınlatma Metni\'ni onaylamanız gerekmektedir.', 'error');
      return;
    }

    if (password.length < 12) {
      showToast('Şifre en az 12 karakter olmalıdır.', 'error');
      return;
    }

    setIsLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email: email.trim(), password }
      : { 
          username: username.trim(), 
          email: email.trim(), 
          password, 
          full_name: fullName.trim(),
          kvkk_accepted: kvkkAccepted 
        };

    try {
      const response = await api.post(endpoint, payload);

      if (response.data && response.data.verification_pending) {
        setPendingVerificationEmail(email.trim());
        setViewMode('verify');
        showToast(response.data.message || 'Lütfen e-postanıza gönderilen doğrulama kodunu girin.', 'info');
      } else if (response.data && response.data.token && response.data.refresh_token && response.data.user) {
        if (!isLogin) {
          // Set onboarding pending flag for new registrations
          await SecureStore.setItemAsync('keepr_onboarding_pending', '1');
        }
        await login(response.data.token, response.data.refresh_token, response.data.user);
      } else {
        throw new Error('Geçersiz token yanıtı.');
      }
    } catch (err: any) {
      console.error(err);
      const isVerificationPending = err.response?.data?.verification_pending;
      if (isVerificationPending) {
        setIsLoading(false);
        setPendingVerificationEmail(email.trim());
        setViewMode('verify');
        showToast(err.response.data.error, 'info');
        return;
      }
      const errMsg = err.response?.data?.error || 'Bir hata oluştu, lütfen tekrar deneyin.';
      showToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (viewMode === 'verify') {
    return (
      <VerificationScreen
        email={pendingVerificationEmail}
        onBack={() => setViewMode('form')}
      />
    );
  }

  if (viewMode === 'forgot') {
    return (
      <ForgotPasswordScreen
        initialEmail={email}
        onBack={() => setViewMode('form')}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
            <Text style={[styles.logoText, { color: colors.text, fontWeight: '900', fontSize: 32, letterSpacing: -0.5, marginTop: 12, marginBottom: 0 }]}>Keepr</Text>
            <Text style={{ fontSize: 9, color: colors.primary, fontWeight: '800', letterSpacing: 2, marginTop: 2, textTransform: 'uppercase' }}>Dijital Havuz</Text>
            <Text style={[styles.logoSubtitle, { color: colors.textMuted, marginTop: 8 }]}>
              Bağlantılarını minimalist biçimde düzenle.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Full Name & Username Inputs (Only visible during signup) */}
            {!isLogin && (
              <>
                <Text style={[styles.label, { color: colors.textMuted }]}>Ad Soyad</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 14 }]}>
                  <User size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Adınız Soyadınız"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    style={[styles.input, { color: colors.text }]}
                  />
                </View>

                <Text style={[styles.label, { color: colors.textMuted }]}>Kullanıcı Adı</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 14 }]}>
                  <User size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="kullaniciadi"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { color: colors.text }]}
                  />
                </View>
              </>
            )}

            {/* Email Input */}
            <Text style={[styles.label, { color: colors.textMuted }]}>E-Posta</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <User size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="eposta@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            {/* Password Input */}
            <Text style={[styles.label, { color: colors.textMuted, marginTop: 14 }]}>Şifre</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Lock size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            {isLogin && (
              <TouchableOpacity
                onPress={() => setViewMode('forgot')}
                style={{ alignSelf: 'flex-end', marginTop: 8 }}
                activeOpacity={0.6}
              >
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                  Şifremi Unuttum
                </Text>
              </TouchableOpacity>
            )}

            {/* KVKK Checkbox (Only visible during signup) */}
            {!isLogin && (
              <View style={styles.kvkkRow}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    {
                      borderColor: kvkkAccepted ? colors.primary : colors.border,
                      backgroundColor: kvkkAccepted ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => setKvkkAccepted(!kvkkAccepted)}
                  activeOpacity={0.7}
                >
                  {kvkkAccepted && <Check size={12} color="#fff" strokeWidth={3} />}
                </TouchableOpacity>
                <Text style={[styles.kvkkLabel, { color: colors.textMuted }]}>
                  <Text
                    style={{ color: colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' }}
                    onPress={() => setKvkkModalOpen(true)}
                  >
                    KVKK Aydınlatma Metni
                  </Text>
                  'ni okudum ve kabul ediyorum.
                </Text>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              onPress={handleAuth}
              disabled={isLoading || (!isLogin && !kvkkAccepted)}
              style={[
                styles.btn,
                { 
                  backgroundColor: (!isLogin && !kvkkAccepted) ? colors.border : colors.primary 
                }
              ]}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</Text>
              )}
            </TouchableOpacity>

            {/* Form Toggle */}
            <TouchableOpacity
              onPress={() => {
                setIsLogin(!isLogin);
                setKvkkAccepted(false);
              }}
              style={styles.toggleBtn}
              activeOpacity={0.6}
            >
              <Text style={[styles.toggleText, { color: colors.primary }]}>
                {isLogin
                  ? 'Hesabın yok mu? Kayıt ol'
                  : 'Zaten üye misin? Giriş yap'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* KVKK Modal */}
      <Modal
        visible={kvkkModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setKvkkModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>KVKK Aydınlatma Metni (v2026-07)</Text>
              <TouchableOpacity onPress={() => setKvkkModalOpen(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.modalText, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>1. Veri Sorumlusu{"\n"}</Text>
                Keepr ("Uygulama") olarak, kullanıcılarımızın kişisel verilerinin güvenliğine ve gizliliğine büyük önem veriyoruz. Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("Kanun") uyarınca aşağıda açıklanan kapsamda işlenecektir.{"\n\n"}
                <Text style={{ fontWeight: 'bold' }}>2. İşlenen Kişisel Verileriniz{"\n"}</Text>
                Uygulamamıza kaydolurken ve hizmetlerimizi kullanırken işlenen kişisel verileriniz şunlardır:{"\n"}
                - E-posta adresi, kullanıcı adı, ad soyad.{"\n"}
                - Şifre verileriniz (sunucularımızda tek yönlü kriptografik hash formatında saklanır; şifrenizin kendisi kesinlikle okunamaz ve erişilemez durumdadır).{"\n"}
                - Yüklediğiniz/Kaydettiğiniz internet bağlantıları (link/bookmark verileri), başlıklar ve açıklamalar.{"\n\n"}
                <Text style={{ fontWeight: 'bold' }}>3. Kişisel Verilerin İşlenme Amaçları{"\n"}</Text>
                Kişisel verileriniz şu amaçlarla işlenmektedir:{"\n"}
                - Kullanıcı hesabınızın oluşturulması, kimliğinizin doğrulanması ve oturum açma süreçlerinin yönetilmesi.{"\n"}
                - Uygulama özelliklerinin (link kaydetme, düzenleme, silme, favorileme) sunulması.{"\n"}
                - Güvenlik, siber saldırıların tespiti ve engellenmesi.{"\n"}
                - Kullanıcı deneyiminin iyileştirilmesi ve uygulama temalarınızın saklanması.{"\n\n"}
                <Text style={{ fontWeight: 'bold' }}>4. Kişisel Verilerin Aktarılması{"\n"}</Text>
                Kişisel verileriniz kesinlikle üçüncü şahıslarla paylaşılmamakta, satılmamakta veya ticari amaçlarla yurt dışına aktarılmamaktadır. Verileriniz, yasal yükümlülüklerin yerine getirilmesi amacıyla yetkili kamu kurum ve kuruluşları ile yalnızca yasal sınırlar dahilinde paylaşılabilecektir.{"\n\n"}
                <Text style={{ fontWeight: 'bold' }}>5. Haklarınız (Madde 11){"\n"}</Text>
                Kanun'un 11. maddesi uyarınca;{"\n"}
                - Kişisel verilerinizin işlenip işlenmediğini öğrenme,{"\n"}
                - İşlenmişse bilgi talep etme,{"\n"}
                - İşlenme amacını ve uygun kullanılıp kullanılmadığını öğrenme,{"\n"}
                - Eksik veya yanlış işlenmişse düzeltilmesini isteme ve silinmesini talep etme haklarına sahipsiniz. Haklarınızı kullanmak için devpanthera@proton.me adresine e-posta gönderebilirsiniz.
              </Text>
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={[styles.modalAcceptBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setKvkkAccepted(true);
                  setKvkkModalOpen(false);
                }}
              >
                <Text style={styles.modalAcceptBtnText}>Okudum, Kabul Ediyorum</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    ...Typography.titleLarge,
    fontSize: 28,
    marginTop: 16,
  },
  logoSubtitle: {
    ...Typography.bodyMedium,
    marginTop: 6,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    ...Typography.caption,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 6,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    height: '100%',
  },
  kvkkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: Radius.small,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  kvkkLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  btn: {
    height: 48,
    borderRadius: Radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleBtn: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  modalText: {
    fontSize: 12,
    lineHeight: 18,
  },
  modalFooter: {
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'stretch',
  },
  modalAcceptBtn: {
    height: 44,
    borderRadius: Radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAcceptBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
