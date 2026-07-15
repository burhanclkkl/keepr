import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Mail } from 'lucide-react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Typography, Radius } from '../theme';

interface ForgotPasswordScreenProps {
  initialEmail?: string;
  onBack: () => void;
}

type Step = 'email' | 'reset';

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ initialEmail = '', onBack }) => {
  const { colors, themeMode } = useTheme();
  const { showToast } = useToast();
  
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  const inputRefs = useRef<TextInput[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Step 1: Send reset code
  const handleRequest = async () => {
    if (!email.trim()) {
      showToast('Lütfen e-posta adresinizi girin.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: email.trim() });
      showToast(res.data?.message || 'E-postanıza şifre sıfırlama kodu gönderildi.', 'success');
      setStep('reset');
      setResendTimer(60);
      setCode(Array(6).fill(''));
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Kod gönderilirken bir sorun oluştu.';
      showToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verification and Reset password
  const handleReset = async () => {
    const otpCode = code.join('');
    if (otpCode.length !== 6) {
      showToast('Lütfen 6 haneli kodu eksiksiz girin.', 'error');
      return;
    }
    if (newPassword.length < 12) {
      showToast('Yeni şifre en az 12 karakter olmalıdır.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password', {
        email: email.trim(),
        code: otpCode,
        new_password: newPassword,
      });
      showToast('Şifreniz başarıyla sıfırlandı. Giriş yapabilirsiniz.', 'success');
      onBack();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Şifre sıfırlanamadı. Kodu kontrol edip tekrar deneyin.';
      showToast(errMsg, 'error');
      setCode(Array(6).fill(''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: email.trim() });
      showToast(res.data?.message || 'Yeni sıfırlama kodu e-postanıza gönderildi.', 'success');
      setResendTimer(60);
      setCode(Array(6).fill(''));
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Kod gönderilemedi.';
      showToast(errMsg, 'error');
    } finally {
      setIsResending(false);
    }
  };

  // Handle single digit input change
  const handleChange = (value: string, index: number) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    
    // Auto-detect and handle pasted 6-digit verification code
    if (cleaned.length === 6) {
      const newCode = cleaned.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = cleaned.slice(-1);
    setCode(newCode);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace key press
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.6}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
            <Text style={[styles.logoText, { color: colors.text, fontWeight: '900', fontSize: 24, letterSpacing: -0.5, marginTop: 12 }]}>Şifre Sıfırlama</Text>
            <Text style={[styles.logoSubtitle, { color: colors.textMuted, marginTop: 6 }]}>
              {step === 'email' 
                ? 'E-posta adresinizi girerek şifre sıfırlama kodu talep edin.'
                : 'E-postanıza gelen 6 haneli kodu ve yeni şifrenizi girin.'
              }
            </Text>
          </View>

          <View style={styles.formContainer}>
            {step === 'email' ? (
              <>
                <Text style={[styles.label, { color: colors.textMuted }]}>E-Posta Adresi</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Mail size={16} color={colors.textMuted} style={styles.inputIcon} />
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

                <TouchableOpacity
                  onPress={handleRequest}
                  disabled={isLoading}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnText}>Sıfırlama Kodu Gönder</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: colors.textMuted, textAlign: 'center', marginBottom: 10 }]}>6 Haneli Doğrulama Kodu</Text>
                
                {/* OTP Digits Row */}
                <View style={styles.codeContainer}>
                  {code.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={(ref) => { inputRefs.current[idx] = ref as TextInput; }}
                      value={digit}
                      onChangeText={(val) => handleChange(val, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      style={[
                        styles.codeInput,
                        {
                          backgroundColor: colors.card,
                          borderColor: digit ? colors.primary : colors.border,
                          color: colors.text,
                        },
                      ]}
                    />
                  ))}
                </View>

                {/* New Password Input */}
                <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>Yeni Şifre</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Lock size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="En az 12 karakter"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { color: colors.text }]}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleReset}
                  disabled={isLoading}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnText}>Şifreyi Güncelle</Text>
                  )}
                </TouchableOpacity>

                {/* Resend Cooldown UI */}
                <View style={styles.resendContainer}>
                  {resendTimer > 0 ? (
                    <Text style={[styles.resendTimerText, { color: colors.textMuted }]}>
                      Yeni kod için bekleyin: <Text style={{ fontWeight: 'bold', color: colors.text }}>{resendTimer} sn</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResend} disabled={isResending}>
                      {isResending ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : (
                        <Text style={[styles.resendLink, { color: colors.primary }]}>Yeni Kod Gönder</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 50,
    height: 50,
    borderRadius: Radius.large,
  },
  logoText: {
    ...Typography.titleLarge,
    fontSize: 22,
    marginTop: 10,
  },
  logoSubtitle: {
    ...Typography.bodyMedium,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 12,
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
    marginBottom: 16,
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
  btn: {
    height: 48,
    borderRadius: Radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  codeInput: {
    width: '14%',
    height: 50,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendTimerText: {
    fontSize: 12,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
