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
import { ArrowLeft } from 'lucide-react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Typography, Radius } from '../theme';
import * as SecureStore from 'expo-secure-store';

interface VerificationScreenProps {
  email: string;
  onBack: () => void;
}

export const VerificationScreen: React.FC<VerificationScreenProps> = ({ email, onBack }) => {
  const { login } = useAuth();
  const { colors, themeMode } = useTheme();
  const { showToast } = useToast();
  
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  
  const inputRefs = useRef<TextInput[]>([]);

  // Timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (value: string, index: number) => {
    // Only allow digits
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

    // Auto focus next input
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

  // Auto-submit once all digits are entered
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6 && !isLoading) {
      handleVerify(fullCode);
    }
  }, [code]);

  const handleVerify = async (otpCode: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/verify-code', {
        email,
        code: otpCode,
      });
      
      const { token, refresh_token, user } = response.data;
      if (token && refresh_token && user) {
        // Successful verification login
        await SecureStore.setItemAsync('keepr_onboarding_pending', '1');
        await login(token, refresh_token, user);
      } else {
        throw new Error('Geçersiz doğrulama yanıtı.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Doğrulama kodu geçersiz veya süresi dolmuş.';
      showToast(errMsg, 'error');
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    try {
      const response = await api.post('/api/auth/resend-code', { email });
      showToast(response.data.message || 'Yeni doğrulama kodu e-postanıza gönderildi.', 'success');
      setResendTimer(60);
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      if (err.response?.status === 429) {
        showToast(err.response.data.error || 'Çok fazla istek. Lütfen biraz bekleyin.', 'info');
        setResendTimer(60);
      } else {
        const errMsg = err.response?.data?.error || 'Kod gönderilemedi. Lütfen daha sonra tekrar deneyin.';
        showToast(errMsg, 'error');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          {/* Back Button */}
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.6}>
            <ArrowLeft size={16} color={colors.textMuted} />
            <Text style={[styles.backBtnText, { color: colors.textMuted }]}>Geri Dön</Text>
          </TouchableOpacity>

          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
            <Text style={[styles.logoText, { color: colors.text, fontWeight: '900', fontSize: 26, letterSpacing: -0.5, marginTop: 12 }]}>
              E-postanı Doğrula
            </Text>
            <Text style={[styles.logoSubtitle, { color: colors.textMuted, marginTop: 8 }]}>
              Giriş işlemini tamamlamak için {email} adresine gönderdiğimiz 6 haneli kodu girin.
            </Text>
          </View>

          {/* OTP Grid */}
          <View style={styles.otpGridContainer}>
            <View style={styles.otpGrid}>
              {code.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el as TextInput; }}
                  style={[
                    styles.otpInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  keyboardType="numeric"
                  value={digit}
                  onChangeText={(val) => handleChange(val, idx)}
                  onKeyPress={(e) => handleKeyPress(e, idx)}
                  editable={!isLoading}
                />
              ))}
            </View>

            {isLoading && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.loaderText, { color: colors.primary }]}>Kod doğrulanıyor...</Text>
              </View>
            )}
          </View>

          {/* Timer and Resend */}
          <View style={styles.resendContainer}>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendTimer > 0 || isResending}
              activeOpacity={0.6}
            >
              {isResending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.resendText,
                    {
                      color: resendTimer > 0 ? colors.textMuted : colors.primary,
                      fontWeight: resendTimer > 0 ? 'normal' : 'bold',
                    },
                  ]}
                >
                  {resendTimer > 0
                    ? `Kodu Yeniden Gönder (${resendTimer}s)`
                    : 'Yeni Kod Gönder'}
                </Text>
              )}
            </TouchableOpacity>
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
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    ...Typography.bodyMedium,
    marginLeft: 6,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.large,
  },
  logoText: {
    ...Typography.titleLarge,
    textAlign: 'center',
  },
  logoSubtitle: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  otpGridContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
  },
  otpInput: {
    width: 44,
    height: 52,
    borderRadius: Radius.medium,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  loaderText: {
    ...Typography.caption,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  resendText: {
    ...Typography.bodyMedium,
  },
});
