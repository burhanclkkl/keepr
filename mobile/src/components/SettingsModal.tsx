import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { X, Check, Eye, EyeOff, User, Key, Palette, UserX, AlertTriangle, LogOut, LayoutGrid, List, Crown, Sparkles, ExternalLink, Users, Link } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme, BRAND_COLORS, ThemeMode, ThemeColor } from '../context/ThemeContext';
import api from '../services/api';
import { Typography, Radius } from '../theme';
import { ConfirmModal } from './ConfirmModal';
import { PremiumFeature } from './PremiumFeature';
import { ProUpgradeModal } from './ProUpgradeModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinWithToken?: (token: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onJoinWithToken }) => {
  const { user, refreshProfile, logout } = useAuth();
  const { themeMode, themeColor, colors, updateTheme } = useTheme();

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [inviteTokenInput, setInviteTokenInput] = useState('');
  const [isJoiningInvite, setIsJoiningInvite] = useState(false);
  const [inviteJoinSuccess, setInviteJoinSuccess] = useState(false);

  // Mode & Color selection states
  const [selectedMode, setSelectedMode] = useState<ThemeMode>('light');
  const [selectedColor, setSelectedColor] = useState<ThemeColor>('indigo');
  const [selectedLayout, setSelectedLayout] = useState<'grid' | 'list'>('grid');
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalFeature, setProModalFeature] = useState<string | null>('theme');

  // UI status
  const [isSaving, setIsSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'theme' | 'subscription' | 'account' | 'team'>('profile');

  // Account deletion states
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Password requirements checklist
  const hasMinLength = newPassword.length >= 12;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[@$!%*?&.#_-]/.test(newPassword);
  const hasNoInclusion = newPassword.length > 0 && 
    !newPassword.toLowerCase().includes(username.toLowerCase()) && 
    !newPassword.toLowerCase().includes(email.split('@')[0].toLowerCase());
  const hasNoRepeating = newPassword.length > 0 && !/(.)\1\1\1/.test(newPassword);

  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial && hasNoInclusion && hasNoRepeating;

  // Sensitive profile details changed check
  const isProfileSensitiveChanged = (username.trim() !== (user?.username || '')) || (email.trim() !== (user?.email || ''));
  const isSensitiveChanged = isProfileSensitiveChanged || (newPassword.length > 0);

  // Populate data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setSelectedMode(themeMode);
      setSelectedColor(themeColor);
      setSelectedLayout((user?.view_layout as 'grid' | 'list') || 'grid');
      setActiveTab('profile');
      setDeletePassword('');
    }
  }, [isOpen, user, themeMode, themeColor]);

  const handleManualJoin = async () => {
    if (!inviteTokenInput.trim()) {
      Alert.alert('Hata', 'Lütfen geçerli bir davet kodu veya linki girin.');
      return;
    }
    
    let tokenVal = inviteTokenInput.trim();
    const match = tokenVal.match(/invite\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      tokenVal = match[1];
    }

    if (onJoinWithToken) {
      // Use the parent AcceptInviteModal flow
      setIsJoiningInvite(true);
      try {
        onClose();
        onJoinWithToken(tokenVal);
        setInviteTokenInput('');
      } finally {
        setIsJoiningInvite(false);
      }
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!username.trim() || !email.trim()) {
      Alert.alert('Hata', 'Kullanıcı adı ve e-posta alanları zorunludur.');
      return;
    }

    if (newPassword) {
      if (!isPasswordValid) {
        Alert.alert('Hata', 'Şifreniz belirlenen güvenlik politikalarına uymuyor.');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert('Hata', 'Şifreler eşleşmiyor.');
        return;
      }
    }

    if (isSensitiveChanged && !currentPassword) {
      Alert.alert('Güvenlik Uyarısı', 'Kullanıcı adı, e-posta veya şifre değişikliği için mevcut şifrenizi girmelisiniz.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        full_name: fullName.trim() || null,
        username: username.trim(),
        email: email.trim(),
        view_layout: selectedLayout,
      };

      // Only send theme fields if user is Pro AND the value actually changed.
      // Free users must never send theme_mode/theme_color — backend returns 403 otherwise.
      const isPro = user?.is_pro ?? false;
      if (isPro && selectedMode !== (user?.theme_mode || themeMode)) {
        payload.theme_mode = selectedMode;
      }
      if (isPro && selectedColor !== (user?.theme_color || themeColor)) {
        payload.theme_color = selectedColor;
      }

      if (isSensitiveChanged) {
        payload.current_password = currentPassword;
      }

      if (newPassword) {
        payload.password = newPassword;
      }

      const response = await api.put('/api/auth/me', payload);

      if (response.data) {
        // Apply theme locally only if pro and theme actually changed
        const isPro = user?.is_pro ?? false;
        if (isPro && (selectedMode !== themeMode || selectedColor !== themeColor)) {
          await updateTheme(selectedMode, selectedColor);
        }

        if (newPassword) {
          Alert.alert('Şifre Güncellendi', 'Şifreniz başarıyla güncellendi. Güvenliğiniz için lütfen yeni şifrenizle tekrar giriş yapın.', [
            {
              text: 'Tamam',
              onPress: async () => {
                await logout();
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                onClose();
              }
            }
          ]);
          return;
        }

        // Refresh local user profile
        await refreshProfile();

        Alert.alert('Başarılı', 'Ayarlarınız başarıyla güncellendi.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }
    } catch (e: any) {
      console.error(e);
      // Check if backend returned PRO_REQUIRED gate — open upgrade modal instead of generic Alert
      const code = e.response?.data?.code;
      const feature = e.response?.data?.feature;
      if (e.response?.status === 403 && code === 'PRO_REQUIRED') {
        // Revert local theme selection to current saved values so UI doesn't flicker
        setSelectedMode(themeMode);
        setSelectedColor(themeColor);
        setProModalFeature(feature || 'theme');
        setIsProModalOpen(true);
        return;
      }
      const errMsg = e.response?.data?.error || e.response?.data?.message || 'Ayarlar güncellenirken bir hata oluştu.';
      Alert.alert('Hata', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const doLogout = async () => {
    setLogoutConfirmOpen(false);
    await logout();
    onClose();
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) return;
    setDeleteConfirmOpen(true);
  };

  const doDeleteAccount = async () => {
    setDeleteConfirmOpen(false);
    setIsDeletingAccount(true);
    try {
      const response = await api.delete('/api/auth/me', {
        data: { password: deletePassword }
      });
      if (response.status === 200) {
        await logout();
        onClose();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Hesap silinirken hata oluştu.';
      Alert.alert('Hata', errMsg);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        {/* Backdrop overlay */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdrop}
        />

        {/* Modal Sheet Container */}
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Profil & Ayarlar</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Uygulama tercihlerinizi ve hesabınızı yönetin.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Headers */}
          <View style={[styles.tabBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('profile')}
              style={[
                styles.tabItem,
                activeTab === 'profile' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 }
              ]}
              activeOpacity={0.7}
            >
              <User size={12} color={activeTab === 'profile' ? colors.primary : colors.textMuted} style={styles.tabIcon} />
              <Text style={[styles.tabText, { color: activeTab === 'profile' ? colors.text : colors.textMuted }]}>Profil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('password')}
              style={[
                styles.tabItem,
                activeTab === 'password' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 }
              ]}
              activeOpacity={0.7}
            >
              <Key size={12} color={activeTab === 'password' ? colors.primary : colors.textMuted} style={styles.tabIcon} />
              <Text style={[styles.tabText, { color: activeTab === 'password' ? colors.text : colors.textMuted }]}>Şifre</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('theme')}
              style={[
                styles.tabItem,
                activeTab === 'theme' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 }
              ]}
              activeOpacity={0.7}
            >
              <Palette size={12} color={activeTab === 'theme' ? colors.primary : colors.textMuted} style={styles.tabIcon} />
              <Text style={[styles.tabText, { color: activeTab === 'theme' ? colors.text : colors.textMuted }]}>Tema</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('subscription')}
              style={[
                styles.tabItem,
                activeTab === 'subscription' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 }
              ]}
              activeOpacity={0.7}
            >
              <Crown size={12} color={activeTab === 'subscription' ? '#f59e0b' : colors.textMuted} style={styles.tabIcon} />
              <Text style={[styles.tabText, { color: activeTab === 'subscription' ? colors.text : colors.textMuted }]}>Üyelik</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('team')}
              style={[
                styles.tabItem,
                activeTab === 'team' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 }
              ]}
              activeOpacity={0.7}
            >
              <Users size={12} color={activeTab === 'team' ? '#8B5CF6' : colors.textMuted} style={styles.tabIcon} />
              <Text style={[styles.tabText, { color: activeTab === 'team' ? '#8B5CF6' : colors.textMuted }]}>Ortak</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('account')}
              style={[
                styles.tabItem,
                activeTab === 'account' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 }
              ]}
              activeOpacity={0.7}
            >
              <UserX size={12} color={activeTab === 'account' ? '#ef4444' : colors.textMuted} style={styles.tabIcon} />
              <Text style={[styles.tabText, { color: activeTab === 'account' ? '#ef4444' : colors.textMuted }]}>Hesap</Text>
            </TouchableOpacity>
          </View>

          {/* Main Scroll Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollContent}
          >
            
            {/* TAB 1: Profile */}
            {activeTab === 'profile' && (
              <View style={styles.section}>
                {/* Full Name */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Ad Soyad</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Adınızı ve soyadınızı girin"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                />

                {/* Username */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Kullanıcı Adı</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholder="Kullanıcı adınız"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                />

                {/* Email */}
                <Text style={[styles.label, { color: colors.textMuted }]}>E-posta</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="e-posta@adresiniz.com"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                />

                {/* Sensitive profile verification warning */}
                {isProfileSensitiveChanged && (
                  <View style={[styles.warningBox, { backgroundColor: colors.background, borderColor: '#f59e0b' }]}>
                    <Text style={styles.warningText}>
                      Profil bilgilerinizi kaydetmek için lütfen mevcut şifrenizi girin.
                    </Text>
                    <TextInput
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                      placeholder="Mevcut şifreniz"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, marginTop: 8, marginBottom: 0 }]}
                    />
                  </View>
                )}

              </View>
            )}


            {/* TAB: Team / Ortak Çalışma */}
            {activeTab === 'team' && (
              <View style={styles.section}>
                {/* Hero gradient banner */}
                <View style={{
                  borderRadius: Radius.large,
                  overflow: 'hidden',
                  marginBottom: 20,
                }}>
                  <View style={{
                    backgroundColor: '#6d28d9',
                    padding: 20,
                    position: 'relative',
                  }}>
                    <View style={{
                      position: 'absolute', right: -16, top: -16,
                      width: 80, height: 80, borderRadius: 40,
                      backgroundColor: 'rgba(255,255,255,0.08)'
                    }} />
                    <View style={{
                      position: 'absolute', right: 0, bottom: -24,
                      width: 48, height: 48, borderRadius: 24,
                      backgroundColor: 'rgba(255,255,255,0.05)'
                    }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Users size={16} color="rgba(255,255,255,0.85)" />
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 2 }}>KEEPR TEAM</Text>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 4, letterSpacing: -0.3 }}>Ortak Klasöre Katıl</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10.5, lineHeight: 15 }}>
                      Arkadaşlarınızın paylaştığı davet linkini yapıştırarak ortak klasöre anında erişin.
                    </Text>
                  </View>
                </View>

                {/* Input label */}
                <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8 }]}>Davet Linki veya Kodu</Text>

                {/* Input + Button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.background,
                    borderRadius: Radius.medium,
                    borderWidth: 1.5,
                    borderColor: 'rgba(139, 92, 246, 0.35)',
                    paddingHorizontal: 10,
                    height: 44,
                    gap: 6,
                  }}>
                    <Link size={13} color="#8B5CF6" />
                    <TextInput
                      value={inviteTokenInput}
                      onChangeText={setInviteTokenInput}
                      placeholder="keepr.app/invite/abc123..."
                      placeholderTextColor={colors.textMuted}
                      style={{ flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleManualJoin}
                    disabled={isJoiningInvite || !inviteTokenInput.trim()}
                    style={{
                      backgroundColor: '#7c3aed',
                      height: 44,
                      paddingHorizontal: 16,
                      borderRadius: Radius.medium,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 5,
                      opacity: isJoiningInvite || !inviteTokenInput.trim() ? 0.45 : 1,
                    }}
                    activeOpacity={0.8}
                  >
                    {isJoiningInvite ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : inviteJoinSuccess ? (
                      <Check size={14} color="#fff" strokeWidth={3} />
                    ) : null}
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>
                      {inviteJoinSuccess ? 'Katıldı!' : 'Katıl'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Hint */}
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 8, lineHeight: 14 }}>
                  Linkin tamamını veya yalnızca token kısmını girebilirsiniz.
                </Text>

                {/* Role info cards */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <View style={{
                    flex: 1, padding: 12, borderRadius: Radius.medium,
                    backgroundColor: 'rgba(139, 92, 246, 0.08)',
                    borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)',
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#8B5CF6', marginBottom: 4 }}>👁️ İzleyici</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, lineHeight: 14 }}>Bağlantıları görüntüleyebilirsiniz.</Text>
                  </View>
                  <View style={{
                    flex: 1, padding: 12, borderRadius: Radius.medium,
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)',
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#6366f1', marginBottom: 4 }}>✏️ Editör</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, lineHeight: 14 }}>Bağlantı ekleyip silebilirsiniz.</Text>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: Password */}
            {activeTab === 'password' && (
              <View style={styles.section}>
                {/* New Password */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Yeni Şifre</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPass}
                    placeholder="En az 12 karakter girin"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.passwordInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPass(!showPass)}
                    style={styles.eyeBtn}
                    activeOpacity={0.6}
                  >
                    {showPass ? (
                      <EyeOff size={14} color={colors.textMuted} />
                    ) : (
                      <Eye size={14} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Password Strength Checklist */}
                {newPassword.length > 0 && (
                  <View style={[styles.checklistContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.checklistTitle, { color: colors.textMuted }]}>ŞİFRE GÜVENLİK GEREKSİNİMLERİ</Text>
                    
                    <View style={styles.checkRow}>
                      <Check size={11} color={hasMinLength ? '#10b981' : colors.textMuted} />
                      <Text style={[styles.checkText, { color: hasMinLength ? colors.text : colors.textMuted }]}>En az 12 karakter</Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Check size={11} color={hasUpper ? '#10b981' : colors.textMuted} />
                      <Text style={[styles.checkText, { color: hasUpper ? colors.text : colors.textMuted }]}>En az 1 büyük harf (A-Z)</Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Check size={11} color={hasLower ? '#10b981' : colors.textMuted} />
                      <Text style={[styles.checkText, { color: hasLower ? colors.text : colors.textMuted }]}>En az 1 küçük harf (a-z)</Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Check size={11} color={hasDigit ? '#10b981' : colors.textMuted} />
                      <Text style={[styles.checkText, { color: hasDigit ? colors.text : colors.textMuted }]}>En az 1 rakam (0-9)</Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Check size={11} color={hasSpecial ? '#10b981' : colors.textMuted} />
                      <Text style={[styles.checkText, { color: hasSpecial ? colors.text : colors.textMuted }]}>En az 1 özel karakter (@$!%*?&.#_-)</Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Check size={11} color={hasNoInclusion ? '#10b981' : colors.textMuted} />
                      <Text style={[styles.checkText, { color: hasNoInclusion ? colors.text : colors.textMuted }]}>Kullanıcı adı/e-posta içermez</Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Check size={11} color={hasNoRepeating ? '#10b981' : colors.textMuted} />
                      <Text style={[styles.checkText, { color: hasNoRepeating ? colors.text : colors.textMuted }]}>Ardışık karakter tekrarı yok</Text>
                    </View>
                  </View>
                )}

                {/* Confirm Password */}
                <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>Yeni Şifre Tekrar</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPass}
                    placeholder="Şifrenizi tekrar girin"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.passwordInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPass(!showConfirmPass)}
                    style={styles.eyeBtn}
                    activeOpacity={0.6}
                  >
                    {showConfirmPass ? (
                      <EyeOff size={14} color={colors.textMuted} />
                    ) : (
                      <Eye size={14} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Sensitive verification required for password change */}
                {newPassword.length > 0 && (
                  <View style={[styles.warningBox, { backgroundColor: colors.background, borderColor: '#f59e0b', marginTop: 16 }]}>
                    <Text style={styles.warningText}>
                      Şifrenizi güncellemek için mevcut şifrenizi girin.
                    </Text>
                    <TextInput
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                      placeholder="Mevcut şifreniz"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, marginTop: 8, marginBottom: 0 }]}
                    />
                  </View>
                )}
              </View>
            )}

            {/* TAB 3: Theme */}
            {activeTab === 'theme' && (
              <View style={styles.section}>
                {/* Mode Segmented Controls */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Tema Modu</Text>
                <PremiumFeature feature="theme" onTriggerProModal={() => setIsProModalOpen(true)}>
                  <View style={[styles.modeBar, { backgroundColor: colors.background, borderColor: colors.border, width: '100%' }]}>
                    <TouchableOpacity
                      onPress={() => setSelectedMode('light')}
                      style={[
                        styles.modeItem,
                        selectedMode === 'light' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 }
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modeText, { color: selectedMode === 'light' ? colors.text : colors.textMuted }]}>
                        Açık (Light)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSelectedMode('dark')}
                      style={[
                        styles.modeItem,
                        selectedMode === 'dark' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 }
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modeText, { color: selectedMode === 'dark' ? colors.text : colors.textMuted }]}>
                        Koyu (Dark)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </PremiumFeature>

                {/* Accent Colors Circles */}
                <Text style={[styles.label, { color: colors.textMuted, marginTop: 24, marginBottom: 8 }]}>
                  Accent Rengi
                </Text>
                <PremiumFeature feature="theme" onTriggerProModal={() => setIsProModalOpen(true)}>
                  <View style={styles.colorsWrapper}>
                    {(Object.keys(BRAND_COLORS) as ThemeColor[]).map((colName) => {
                      const palette = BRAND_COLORS[colName];
                      const isSelected = selectedColor === colName;
                      return (
                        <TouchableOpacity
                          key={colName}
                          onPress={() => setSelectedColor(colName)}
                          style={[
                            styles.colorCircle,
                            { backgroundColor: palette.primary }
                          ]}
                          activeOpacity={0.8}
                        >
                          {isSelected && (
                            <Check size={14} color="#fff" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </PremiumFeature>

                {/* View Layout Card Buttons */}
                <Text style={[styles.label, { color: colors.textMuted, marginTop: 24 }]}>Düzen Seçeneği</Text>
                <View style={styles.layoutGrid}>
                  <TouchableOpacity
                    onPress={() => setSelectedLayout('grid')}
                    style={[
                      styles.layoutCard,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      selectedLayout === 'grid' && { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }
                    ]}
                    activeOpacity={0.7}
                  >
                    <LayoutGrid
                      size={22}
                      color={selectedLayout === 'grid' ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.layoutCardText, { color: selectedLayout === 'grid' ? colors.primary : colors.textMuted }]}>
                      Kart
                    </Text>
                    <Text style={[styles.layoutCardSub, { color: selectedLayout === 'grid' ? colors.primary : colors.borderActive }]}>
                      Grid
                    </Text>
                    {selectedLayout === 'grid' && (
                      <View style={[styles.layoutCheck, { backgroundColor: colors.primary }]}>
                        <Check size={8} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSelectedLayout('list')}
                    style={[
                      styles.layoutCard,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      selectedLayout === 'list' && { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }
                    ]}
                    activeOpacity={0.7}
                  >
                    <List
                      size={22}
                      color={selectedLayout === 'list' ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.layoutCardText, { color: selectedLayout === 'list' ? colors.primary : colors.textMuted }]}>
                      Liste
                    </Text>
                    <Text style={[styles.layoutCardSub, { color: selectedLayout === 'list' ? colors.primary : colors.borderActive }]}>
                      List
                    </Text>
                    {selectedLayout === 'list' && (
                      <View style={[styles.layoutCheck, { backgroundColor: colors.primary }]}>
                        <Check size={8} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAB: Subscription */}
            {activeTab === 'subscription' && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Üyelik ve Paketler</Text>
                
                {/* Current plan card */}
                <View style={{
                  padding: 16,
                  borderRadius: Radius.medium,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 20
                }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>Mevcut Paketiniz</Text>
                  
                  {user?.subscription_type === 'team' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <Crown size={20} color="#8b5cf6" fill="rgba(139, 92, 246, 0.1)" />
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#8b5cf6' }}>Keepr Team</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>Sınırsız Özellikler & Ortak Klasörler</Text>
                      </View>
                    </View>
                  ) : user?.subscription_type === 'pro' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <Sparkles size={20} color={colors.primary} />
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.primary }}>Keepr Pro</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>Özel Temalar, Pinler ve Akıllı Alarmlar</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <User size={20} color={colors.textMuted} />
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>Ücretsiz Sürüm</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>Temel özellikler ve link saklama</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Upgrade paths */}
                {user?.subscription_type === 'team' ? (
                  <View style={{
                    padding: 16,
                    borderRadius: Radius.medium,
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <Check size={28} color="#10b981" strokeWidth={3} />
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#10b981' }}>En Üst Pakettesiniz!</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', lineHeight: 14 }}>
                      Keepr Team paketinin sunduğu tüm akıllı alarm, sınırsız tema ve ortak klasör yetkilerine sahipsiniz.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 4 }}>Paket Seçenekleri</Text>
                    
                    {/* If user is free, show Pro upgrade choice */}
                    {user?.subscription_type !== 'pro' && (
                      <TouchableOpacity
                        onPress={() => {
                          onClose();
                          setIsProModalOpen(true);
                          setProModalFeature('reminder');
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 16,
                          borderRadius: Radius.medium,
                          backgroundColor: colors.background,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text }}>Keepr Pro</Text>
                            <View style={{ backgroundColor: `${colors.primary}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 8, fontWeight: '800', color: colors.primary }}>POPÜLER</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }}>Temalar, sabitlemeler ve akıllı alarmlar.</Text>
                        </View>
                        <View style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.small }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>Yükselt</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Team upgrade choice (always available for free or pro) */}
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        setIsProModalOpen(true);
                        setProModalFeature('folder');
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderRadius: Radius.medium,
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: '#8b5cf6',
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#8b5cf6' }}>Keepr Team</Text>
                          <View style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 8, fontWeight: '800', color: '#8b5cf6' }}>EN DETAYLI</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }}>
                          {user?.subscription_type === 'pro'
                            ? 'Ortak klasörler ve ekip paylaşım özellikleri.'
                            : 'Tüm Pro özellikler + ortak klasörler.'
                          }
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.small }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>
                          {user?.subscription_type === 'pro' ? 'Team Geç' : 'Yükselt'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* TAB 4: Account Actions (Logout, Delete Account) */}
            {activeTab === 'account' && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Oturum İşlemleri</Text>
                
                {/* Logout Button */}
                <TouchableOpacity
                  onPress={handleLogout}
                  style={[styles.actionRowBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <LogOut size={16} color="#ef4444" style={{ marginRight: 8 }} />
                  <Text style={[styles.actionRowBtnText, { color: '#ef4444' }]}>Oturumu Kapat</Text>
                </TouchableOpacity>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />

                {/* Delete Account Section */}
                <View style={[styles.warningBox, { backgroundColor: colors.background, borderColor: '#ef4444' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <AlertTriangle size={15} color="#ef4444" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>TEHLİKELİ ALAN: Hesabı Kaldır</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '500', color: colors.textMuted, lineHeight: 14 }}>
                    Hesabınızı kalıcı olarak silmek üzeresiniz. Bu işlem geri alınamaz ve tüm kayıtlı bağlantılarınız silinecektir. Onaylamak için şifrenizi girin.
                  </Text>
                  
                  <TextInput
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    secureTextEntry
                    placeholder="Şifrenizi girin"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, marginTop: 12, marginBottom: 12 }]}
                  />

                  <TouchableOpacity
                    onPress={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    style={[styles.dangerSubmitBtn, { backgroundColor: '#ef4444' }]}
                    activeOpacity={0.8}
                  >
                    {isDeletingAccount ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.dangerSubmitBtnText}>Hesabımı Kalıcı Olarak Sil</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </ScrollView>

          {/* Footer Save Button Row */}
          {activeTab !== 'account' && (
            <View style={[styles.footer, { borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={onClose}
                disabled={isSaving}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                activeOpacity={0.6}
              >
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>Ayarları Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

        </View>
      </KeyboardAvoidingView>

      {/* Logout Confirm Modal */}
      <ConfirmModal
        isOpen={logoutConfirmOpen}
        title="Oturumu Kapat"
        message="Hesabınızdan çıkış yapmak istediğinize emin misiniz?"
        confirmText="Çıkış Yap"
        cancelText="Vazgeç"
        variant="danger"
        onConfirm={doLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />

      {/* Delete Account Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Hesabı Kalıcı Sil"
        message="Hesabınız ve tüm bağlantılarınız kalıcı olarak silinecek. Bu işlem geri alınamaz!"
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        variant="danger"
        countdownSeconds={5}
        onConfirm={doDeleteAccount}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <ProUpgradeModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        feature={proModalFeature}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    ...Typography.titleMedium,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.medium,
    borderWidth: 1,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.medium - 2,
  },
  tabIcon: {
    marginRight: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 0,
    flexShrink: 1,
  },
  section: {
    paddingBottom: 20,
  },
  label: {
    ...Typography.caption,
    marginBottom: 6,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingLeft: 12,
    paddingRight: 40,
    fontSize: 13,
    fontWeight: '600',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  modeBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  modeItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.medium - 2,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  colorsWrapper: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  layoutCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    gap: 4,
    position: 'relative',
  },
  layoutCardText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  layoutCardSub: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  layoutCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.medium,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2.5,
    height: 40,
    borderRadius: Radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  warningBox: {
    padding: 12,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  warningText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d97706',
    lineHeight: 14,
  },
  checklistContainer: {
    padding: 10,
    borderRadius: Radius.medium,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 16,
  },
  checklistTitle: {
    fontSize: 8,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  checkText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  actionRowBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dangerSubmitBtn: {
    height: 40,
    borderRadius: Radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerSubmitBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
