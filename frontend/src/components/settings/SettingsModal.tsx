import React, { useState, useEffect } from 'react';
import { X, Check, Eye, EyeOff, Loader2, User, Key, Palette, UserX, AlertTriangle, ShieldAlert, LogOut, Crown, Sparkles, Users, Link, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEME_COLORS } from '../../context/ThemeContext';
import type { ThemeMode, ThemeColor } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useProModal } from '../../context/ProModalContext';
import { ConfirmModal } from '../ui/ConfirmModal';
import { PremiumFeature } from '../ui/PremiumFeature';
import { SubscriptionService } from '../../services/subscriptionService';
import api from '../../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser, logout } = useAuth();
  const { themeMode, themeColor, updateTheme } = useTheme();
  const { showToast } = useToast();
  const { openProModal } = useProModal();

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  // Invite join states
  const [inviteInput, setInviteInput] = useState('');
  const [isJoiningInvite, setIsJoiningInvite] = useState(false);
  const [inviteJoinSuccess, setInviteJoinSuccess] = useState(false);

  // Mode & Color selection states
  const [selectedMode, setSelectedMode] = useState<ThemeMode>('light');
  const [selectedColor, setSelectedColor] = useState<ThemeColor>('indigo');
  const [selectedLayout, setSelectedLayout] = useState<'grid' | 'list'>('grid');

  // UI status
  const [isSaving, setIsSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'theme' | 'account' | 'subscription' | 'team'>('profile');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Account deletion states
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);

  useEffect(() => {
    let timer: any;
    if (showDeleteConfirm) {
      setDeleteCountdown(5);
      timer = setInterval(() => {
        setDeleteCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setDeleteCountdown(5);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showDeleteConfirm]);

  // Body scroll lock effect
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
      setSelectedLayout((user.view_layout as 'grid' | 'list') || 'grid');
      setDeletePassword('');
      setShowDeleteConfirm(false);
      setActiveTab('profile');
    }
  }, [isOpen, user, themeMode, themeColor]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // 1. Password validation check
      if (newPassword) {
        if (!isPasswordValid) {
          showToast('Şifreniz belirlenen güvenlik politikalarına uymuyor.', 'error');
          setIsSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          showToast('Şifreler eşleşmiyor.', 'error');
          setIsSaving(false);
          return;
        }
      }

      // 2. Sensitive changes password check
      if (isSensitiveChanged && !currentPassword) {
        showToast('Kullanıcı adı, e-posta veya şifre değişikliği için mevcut şifrenizi girmelisiniz.', 'error');
        setIsSaving(false);
        return;
      }

      // 3. Build payload for update API
      const payload: any = {
        full_name: fullName.trim() || null,
        username: username.trim(),
        email: email.trim(),
        view_layout: selectedLayout
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

      // 4. Make API put request
      const response = await api.put('/api/auth/me', payload);

      if (response.data) {
        // Apply theme locally only if pro and something changed
        if (isPro && (selectedMode !== themeMode || selectedColor !== themeColor)) {
          await updateTheme(selectedMode, selectedColor);
        }

        if (newPassword) {
          showToast('Şifreniz güncellendi. Güvenliğiniz için lütfen yeni şifrenizle tekrar giriş yapın.', 'info');
          logout();
          setNewPassword('');
          setConfirmPassword('');
          setCurrentPassword('');
          onClose();
          return;
        }

        // Update user state globally to sync changes
        setUser(response.data.user);
        
        showToast('Ayarlar başarıyla kaydedildi.');
        
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      // PRO_REQUIRED: open upgrade modal instead of showing error toast
      if (err.response?.status === 403 && err.response?.data?.code === 'PRO_REQUIRED') {
        const feature = err.response?.data?.feature || 'theme';
        // Revert local selections
        setSelectedMode(themeMode);
        setSelectedColor(themeColor);
        openProModal(feature);
        return;
      }
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Güncelleme yapılırken hata oluştu.';
      showToast(errMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleJoinInvite = async () => {
    if (!inviteInput.trim()) return;
    let token = inviteInput.trim();
    // extract token if full URL was pasted
    const match = token.match(/invite\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) token = match[1];

    setIsJoiningInvite(true);
    try {
      await api.post(`/api/invite/${token}/accept`);
      setInviteJoinSuccess(true);
      setInviteInput('');
      showToast('Ortak klasöre başarıyla katıldınız!');
      setTimeout(() => setInviteJoinSuccess(false), 3000);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Davet kabul edilirken bir hata oluştu.';
      showToast(errMsg, 'error');
    } finally {
      setIsJoiningInvite(false);
    }
  };

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      showToast('Hesabınızı silmek için mevcut şifrenizi girmelisiniz.', 'error');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const response = await api.delete('/api/auth/me', {
        data: { password: deletePassword }
      });
      if (response.status === 200) {
        showToast('Hesabınız başarıyla silindi. Hoşçakalın!', 'success');
        logout();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Hesap silinirken hata oluştu.';
      showToast(errMsg, 'error');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container — matches mobile sheet proportions */}
      <div className="relative w-full max-w-[540px] bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-start flex-shrink-0">
          <div>
            <h3 className="font-black text-[15px] text-slate-800 dark:text-slate-200 tracking-tight">Profil &amp; Ayarlar</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">
              Uygulama tercihlerinizi ve hesabınızı yönetin.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-[#1c1c1e] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Horizontal Tab Bar — identical look to mobile */}
        <div className="px-6 pb-0 flex-shrink-0">
          <div className="flex p-0.5 bg-slate-100 dark:bg-[#1c1c1e] rounded-xl border border-gray-200/20 dark:border-white/5 select-none overflow-x-auto gap-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {([
              { id: 'profile',      label: 'Profil',   icon: <User      size={11.5} /> },
              { id: 'password',     label: 'Şifre',    icon: <Key       size={11.5} /> },
              { id: 'theme',        label: 'Tema',     icon: <Palette   size={11.5} /> },
              { id: 'subscription', label: 'Üyelik',   icon: <Crown     size={11.5} /> },
              { id: 'team',         label: 'Ortak',    icon: <Users     size={11.5} /> },
              { id: 'account',      label: 'Hesap',    icon: <UserX     size={11.5} /> },
            ] as { id: typeof activeTab; label: string; icon: React.ReactNode }[]).map((tab) => {
              const isActive = activeTab === tab.id;
              const isDanger = tab.id === 'account';
              const isTeam   = tab.id === 'team';
              const isSub    = tab.id === 'subscription';
              const activeColor = isDanger ? 'text-red-500' : isTeam ? 'text-accent' : isSub ? 'text-accent' : 'text-slate-800 dark:text-slate-100';
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 flex-1 px-3.5 py-2.5 rounded-[10px] text-[10.5px] font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? `bg-white dark:bg-[#2b2b30] shadow-sm ${activeColor}`
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">

          {/* ── TAB: Profile ── */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ad Soyad</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Adınızı ve soyadınızı girin"
                  className="w-full h-10 px-3 bg-transparent border border-gray-200 dark:border-[#2c2c2e] rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-accent transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Kullanıcı Adı</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                  placeholder="Kullanıcı adı"
                  className="w-full h-10 px-3 bg-transparent border border-gray-200 dark:border-[#2c2c2e] rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-accent transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">E-posta Adresi</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="e-posta@adresiniz.com"
                  className="w-full h-10 px-3 bg-transparent border border-gray-200 dark:border-[#2c2c2e] rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-accent transition-all" />
              </div>
              {isProfileSensitiveChanged && (
                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-dashed border-amber-300 dark:border-amber-500/30 rounded-xl space-y-2">
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold leading-relaxed">
                    Güvenlik uyarısı: Bu değişiklikleri onaylamak için mevcut şifrenizi girin.
                  </p>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                    placeholder="Mevcut şifreniz"
                    className="w-full h-10 px-3 bg-white dark:bg-[#18181a] border border-amber-300 dark:border-amber-500/30 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500" />
                </div>
              )}

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} disabled={isSaving}
                  className="flex-1 h-10 border border-gray-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#1c1c1e] text-xs font-semibold text-slate-600 dark:text-slate-400 rounded-xl cursor-pointer transition-colors bg-transparent">
                  Vazgeç
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex-[2.5] h-10 flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all border-none">
                  {isSaving ? <><Loader2 size={13} className="animate-spin" /><span>Kaydediliyor...</span></> : <span>Ayarları Kaydet</span>}
                </button>
              </div>
            </form>
          )}

          {/* ── TAB: Password ── */}
          {activeTab === 'password' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Yeni Şifre</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="En az 12 karakter girin"
                    className="w-full h-10 pl-3 pr-10 bg-transparent border border-gray-200 dark:border-[#2c2c2e] rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-accent transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              {newPassword.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-[#1c1c1e] rounded-xl border border-gray-100 dark:border-[#2c2c2e] space-y-1.5">
                  <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Güvenlik Gereksinimleri</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-medium">
                    {[
                      [hasMinLength,   'En az 12 karakter'],
                      [hasUpper,       'En az 1 büyük harf'],
                      [hasLower,       'En az 1 küçük harf'],
                      [hasDigit,       'En az 1 rakam'],
                      [hasSpecial,     'En az 1 özel karakter'],
                      [hasNoInclusion, 'Kullanıcı adı/e-posta içermez'],
                      [hasNoRepeating, 'Ardışık tekrar yok'],
                    ].map(([ok, label], i) => (
                      <div key={i} className={`flex items-center gap-1.5 ${ok ? 'text-emerald-500' : 'text-slate-400'}`}>
                        <Check size={11} className={ok ? 'stroke-[3px]' : 'opacity-30'} />
                        <span>{label as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Yeni Şifre Tekrar</label>
                <div className="relative">
                  <input type={showConfirmPass ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifrenizi tekrar girin"
                    className="w-full h-10 pl-3 pr-10 bg-transparent border border-gray-200 dark:border-[#2c2c2e] rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-accent transition-all" />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              {newPassword.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-dashed border-amber-300 dark:border-amber-500/30 rounded-xl space-y-2">
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold leading-relaxed">
                    Bu değişikliği onaylamak için mevcut şifrenizi girin.
                  </p>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                    placeholder="Mevcut şifreniz"
                    className="w-full h-10 px-3 bg-white dark:bg-[#18181a] border border-amber-300 dark:border-amber-500/30 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} disabled={isSaving}
                  className="flex-1 h-10 border border-gray-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#1c1c1e] text-xs font-semibold text-slate-600 dark:text-slate-400 rounded-xl cursor-pointer transition-colors bg-transparent">
                  Vazgeç
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex-[2.5] h-10 flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all border-none">
                  {isSaving ? <><Loader2 size={13} className="animate-spin" /><span>Kaydediliyor...</span></> : <span>Ayarları Kaydet</span>}
                </button>
              </div>
            </form>
          )}

          {/* ── TAB: Theme ── */}
          {activeTab === 'theme' && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Dark / Light Mode */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tema Modu</label>
                <PremiumFeature feature="theme" className="w-full">
                  <div className="flex p-0.5 bg-slate-100 dark:bg-[#1c1c1e] rounded-xl border border-gray-200/20 dark:border-white/5 select-none">
                    {(['light', 'dark'] as const).map((m) => (
                      <button key={m} type="button" onClick={() => setSelectedMode(m)}
                        className={`flex-1 py-2.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${selectedMode === m ? 'bg-white dark:bg-[#2b2b30] text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        {m === 'light' ? 'Açık (Light)' : 'Koyu (Dark)'}
                      </button>
                    ))}
                  </div>
                </PremiumFeature>
              </div>
              {/* Accent colors */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Accent Rengi</label>
                <PremiumFeature feature="theme">
                  <div className="flex items-center gap-3 py-1">
                    {(Object.keys(THEME_COLORS) as ThemeColor[]).map((colName) => {
                      const palette = THEME_COLORS[colName];
                      return (
                        <button key={colName} type="button" onClick={() => setSelectedColor(colName)}
                          className="relative w-8 h-8 rounded-full border-2 border-transparent transition-transform hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                          style={{ backgroundColor: palette.hex, borderColor: selectedColor === colName ? 'white' : 'transparent', boxShadow: selectedColor === colName ? `0 0 0 2px ${palette.hex}` : 'none' }}>
                          {selectedColor === colName && <Check size={14} className="text-white drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>
                </PremiumFeature>
              </div>
              {/* Layout */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Düzen Seçeneği</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { val: 'grid', label: 'Kart', sub: 'Grid' },
                    { val: 'list', label: 'Liste', sub: 'List' },
                  ] as const).map(({ val, label, sub }) => (
                    <button key={val} type="button" onClick={() => setSelectedLayout(val)}
                      className={`relative flex flex-col items-center justify-center py-4 rounded-xl border-[1.5px] gap-1 cursor-pointer transition-all ${selectedLayout === val ? 'border-accent bg-accent/5 text-accent' : 'border-gray-200 dark:border-[#2c2c2e] text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#1c1c1e]'}`}>
                      {val === 'grid' ? <LayoutGrid size={20} /> : <List size={20} />}
                      <span className="text-xs font-bold">{label}</span>
                      <span className="text-[9px] font-semibold tracking-wide opacity-70">{sub}</span>
                      {selectedLayout === val && (
                        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-accent flex items-center justify-center">
                          <Check size={8} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} disabled={isSaving}
                  className="flex-1 h-10 border border-gray-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#1c1c1e] text-xs font-semibold text-slate-600 dark:text-slate-400 rounded-xl cursor-pointer transition-colors bg-transparent">
                  Vazgeç
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex-[2.5] h-10 flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all border-none">
                  {isSaving ? <><Loader2 size={13} className="animate-spin" /><span>Kaydediliyor...</span></> : <span>Ayarları Kaydet</span>}
                </button>
              </div>
            </form>
          )}

          {/* ── TAB: Subscription ── */}
          {activeTab === 'subscription' && (
            <div className="space-y-4">
              {/* Current Plan Card */}
              <div className="p-4 bg-slate-50 dark:bg-[#1c1c1e] border border-gray-100 dark:border-[#2c2c2e] rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mevcut Paketiniz</span>
                <div className="flex flex-row items-center justify-between gap-4 mt-2">
                  <div className="flex items-center gap-3">
                    {user?.subscription_type === 'team' && <Crown size={22} className="text-accent" />}
                    {user?.subscription_type === 'pro'  && <Sparkles size={22} className="text-accent" />}
                    {(!user?.subscription_type || user?.subscription_type === 'free') && <User size={22} className="text-slate-400" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-black leading-none text-slate-800 dark:text-slate-200">
                          {user?.subscription_type === 'team' ? 'Keepr TEAM' : user?.subscription_type === 'pro' ? 'Keepr PRO' : 'Ücretsiz Sürüm'}
                        </p>
                        {user?.subscription_type === 'team' && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-accent/10 text-accent border border-accent/15 uppercase">TEAM</span>}
                        {user?.subscription_type === 'pro'  && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-accent/10 text-accent border border-accent/15 uppercase">PRO</span>}
                        {(!user?.subscription_type || user?.subscription_type === 'free') && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-slate-100 dark:bg-[#2c2c2e] text-slate-400 uppercase">FREE</span>}
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-relaxed">
                        {user?.subscription_type === 'team' ? 'Keepr Team üyeliğiniz aktif. Tüm pro/ekip özelliklerine tam erişim yetkiniz bulunmaktadır.' : user?.subscription_type === 'pro' ? 'Özel Temalar, Pinler ve Akıllı Alarmlar aktif.' : 'Temel özellikler ve link saklama'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upgrade options */}
              {user?.subscription_type === 'team' ? (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/8 flex flex-col items-center gap-2 text-center">
                  <Check size={28} color="#10b981" strokeWidth={3} />
                  <p className="text-[13px] font-black text-emerald-600 dark:text-emerald-400">En Üst Pakettesiniz!</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Keepr Team paketinin sunduğu tüm akıllı alarm, sınırsız tema ve ortak klasör yetkilerine sahipsiniz.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Paket Seçenekleri</p>
                  {/* Pro — shown only for free users */}
                  {(!user?.subscription_type || user?.subscription_type === 'free') && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#1c1c1e] border border-gray-100 dark:border-[#2c2c2e] rounded-xl">
                      <div className="flex-1 mr-3">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-black text-slate-800 dark:text-slate-200">Keepr Pro</p>
                          <span className="px-1.5 py-0.5 bg-accent/10 text-accent text-[8px] font-black rounded-md">POPÜLER</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Temalar, sabitlemeler ve akıllı alarmlar.</p>
                      </div>
                      <button type="button" disabled={isSaving}
                        onClick={async () => { setIsSaving(true); try { const r = await SubscriptionService.upgradeMock('pro'); setUser(r.user); showToast(r.message, 'success'); } catch { showToast('Başarısız.', 'error'); } finally { setIsSaving(false); } }}
                        className="px-3 py-2 bg-accent hover:bg-accent/90 text-white text-[10px] font-black rounded-lg cursor-pointer border-none flex-shrink-0">
                        Yükselt
                      </button>
                    </div>
                  )}
                  {/* Team */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#1c1c1e] border border-violet-200 dark:border-violet-500/20 rounded-xl">
                    <div className="flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-black text-violet-600 dark:text-violet-400">Keepr Team</p>
                        <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-500 text-[8px] font-black rounded-md">EN DETAYLI</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {user?.subscription_type === 'pro' ? 'Ortak klasörler ve ekip paylaşım özellikleri.' : 'Tüm Pro özellikler + ortak klasörler.'}
                      </p>
                    </div>
                    <button type="button" disabled={isSaving}
                      onClick={async () => { setIsSaving(true); try { const r = await SubscriptionService.upgradeMock('team'); setUser(r.user); showToast(r.message, 'success'); } catch { showToast('Başarısız.', 'error'); } finally { setIsSaving(false); } }}
                      className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black rounded-lg cursor-pointer border-none flex-shrink-0">
                      {user?.subscription_type === 'pro' ? 'Team Geç' : 'Yükselt'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Team ── */}
          {activeTab === 'team' && (
            <div className="space-y-5">
              {/* Hero */}
              <div className="rounded-2xl overflow-hidden bg-accent relative text-white p-5">
                <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
                <div className="absolute right-2 -bottom-6 w-12 h-12 rounded-full bg-white/5" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={15} className="text-white/80" />
                    <span className="text-[9px] font-black text-white/70 uppercase tracking-[2px]">KEEPR TEAM</span>
                  </div>
                  <p className="text-[15px] font-black mb-1 tracking-tight">Ortak Klasöre Katıl</p>
                  <p className="text-[10.5px] text-white/80 leading-relaxed">
                    Arkadaşlarınızın paylaştığı davet linkini yapıştırarak ortak klasöre anında erişin.
                  </p>
                </div>
              </div>
              {/* Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Davet Linki veya Kodu</label>
                <div className="flex items-stretch gap-0">
                  <div className="flex-1 flex items-center gap-2 bg-white dark:bg-[#18181a] border border-accent/20 dark:border-accent/30 rounded-l-xl px-3 h-11">
                    <Link size={13} className="text-accent flex-shrink-0" />
                    <input type="text" value={inviteInput} onChange={(e) => setInviteInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinInvite()}
                      placeholder="keepr.app/invite/abc123 veya token..."
                      className="flex-1 bg-transparent text-[11px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none" />
                  </div>
                  <button type="button" onClick={handleJoinInvite} disabled={isJoiningInvite || !inviteInput.trim()}
                    className="px-5 h-11 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-[11px] font-black rounded-r-xl transition-colors flex items-center gap-1.5 cursor-pointer flex-shrink-0 border-none">
                    {isJoiningInvite ? <Loader2 size={12} className="animate-spin" /> : inviteJoinSuccess ? <Check size={12} strokeWidth={3} /> : null}
                    {inviteJoinSuccess ? 'Katıldı!' : 'Katıl'}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed">
                  Linkin tamamını veya yalnızca token kısmını girebilirsiniz. Süresi dolmuşsa klasör sahibinden yeni link isteyin.
                </p>
              </div>
              {/* Role info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-accent/5 dark:bg-accent/10 border border-accent/10">
                  <p className="text-[10px] font-black text-accent mb-1">👁️ İzleyici</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed">Bağlantıları görüntüleyebilirsiniz.</p>
                </div>
                <div className="p-3 rounded-xl bg-accent/5 dark:bg-accent/10 border border-accent/10">
                  <p className="text-[10px] font-black text-accent mb-1">✏️ Editör</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed">Bağlantı ekleyip silebilirsiniz.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Account ── */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Logout */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-[#1c1c1e] pb-2">
                  <LogOut size={14} className="text-red-500" />
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Oturum İşlemleri</h4>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                  Hesabınızdan güvenli bir şekilde çıkış yapabilirsiniz.
                </p>
                <button type="button"
                  onClick={() => setLogoutConfirmOpen(true)}
                  className="flex items-center gap-1.5 h-11 px-4 border border-red-200 dark:border-red-500/20 hover:bg-red-500/5 text-red-500 text-xs font-bold rounded-xl cursor-pointer transition-colors bg-transparent">
                  <LogOut size={12} />
                  Oturumu Kapat
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-[#1c1c1e]" />

              {/* Delete */}
              <form onSubmit={handleDeleteAccountSubmit} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-rose-100 dark:border-rose-500/10 pb-2">
                  <ShieldAlert size={16} className="text-rose-500" />
                  <h4 className="font-bold text-xs text-rose-600 dark:text-rose-400">Hesabımı Kalıcı Olarak Sil</h4>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl">
                  <div className="flex gap-2 mb-1">
                    <AlertTriangle className="text-rose-500 flex-shrink-0" size={14} />
                    <p className="text-[10px] font-black text-rose-600 dark:text-rose-400">DİKKAT: Bu işlem geri alınamaz!</p>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                    Hesabınızı kaldırdığınızda tüm bağlantılarınız, kategorileriniz ve kişisel verileriniz kalıcı olarak silinir.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Mevcut Şifreniz</label>
                  <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} required
                    placeholder="Onaylamak için şifrenizi girin"
                    className="w-full h-10 px-3 bg-transparent border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 transition-all" />
                </div>
                {showDeleteConfirm ? (
                  <div className="p-4 bg-red-600 text-white rounded-xl space-y-3">
                    <p className="text-[11px] font-bold">Hesabınızı ve tüm verilerinizi tamamen yok etmek istediğinizden kesinlikle emin misiniz?</p>
                    <div className="flex items-center gap-3">
                      <button type="submit" disabled={isDeletingAccount || deleteCountdown > 0}
                        className="flex-1 h-9 bg-white text-red-600 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 border-none">
                        {isDeletingAccount ? <Loader2 size={12} className="animate-spin" /> : null}
                        {deleteCountdown > 0 ? `Bekleyin (${deleteCountdown}s)` : 'Evet, Kalıcı Olarak Sil'}
                      </button>
                      <button type="button" onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 h-9 border border-white/20 hover:bg-white/10 text-xs font-semibold rounded-xl cursor-pointer bg-transparent text-white">
                        Vazgeç
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button"
                    onClick={() => {
                      if (!deletePassword) { showToast('Şifrenizi girmelisiniz.', 'error'); return; }
                      setShowDeleteConfirm(true);
                    }}
                    className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all border-none">
                    Hesabımı Kaldır
                  </button>
                )}
              </form>
            </div>
          )}

        </div>{/* end scrollable */}

        <ConfirmModal
          isOpen={logoutConfirmOpen}
          title="Oturumu Kapat"
          message="Hesabınızdan güvenli bir şekilde çıkış yapmak istediğinizden emin misiniz?"
          confirmText="Çıkış Yap"
          cancelText="Vazgeç"
          variant="primary"
          onConfirm={() => { setLogoutConfirmOpen(false); logout(); onClose(); }}
          onCancel={() => setLogoutConfirmOpen(false)}
        />
      </div>
    </div>
  );
};

