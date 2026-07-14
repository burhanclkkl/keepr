import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Mail, User as UserIcon, Loader2, ArrowRight,
  Bookmark, Video, ShoppingBag, FileText, Heart, Pin, X,
} from 'lucide-react';
import { VerificationView } from './VerificationView';
import appLogo from '../../assets/logo.png';

// Floating mini bookmark card shown in left panel as visual demo
export const DemoCard = ({
  icon: Icon, color, title, domain, delay, offsetX, offsetY, rotate,
}: {
  icon: React.ElementType; color: string; title: string; domain: string;
  delay: number; offsetX: number; offsetY: number; rotate: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 30 }}
    animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
    whileHover={{ y: -14, scale: 1.06, rotate: rotate * 1.6, transition: { type: 'spring', stiffness: 350, damping: 15 } }}
    transition={{
      opacity: { delay, duration: 0.6, ease: 'easeOut' },
      scale: { delay, type: 'spring', stiffness: 220, damping: 18 },
      y: { delay: delay + 0.6, duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
    }}
    style={{
      position: 'absolute',
      left: `calc(50% + ${offsetX}px)`,
      top: `calc(50% + ${offsetY}px)`,
      transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
    }}
    className="bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-[#2c2c2e] rounded-xl shadow-lg px-3 py-2.5 flex items-center gap-2.5 w-44 select-none cursor-pointer"
  >
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={14} className="text-white" />
    </div>
    <div className="min-w-0">
      <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{title}</div>
      <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{domain}</div>
    </div>
  </motion.div>
);

interface AuthFormProps {
  initialRegister?: boolean;
  onSuccess?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialRegister = false, onSuccess }) => {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [isRegister, setIsRegister] = useState(initialRegister);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Email verification (OTP) and KVKK consent states
  const [viewMode, setViewMode] = useState<'form' | 'verify'>('form');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [kvkkModalOpen, setKvkkModalOpen] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!email || !password || (isRegister && (!username || !fullName))) {
      showToast('Lütfen tüm zorunlu alanları doldurun.', 'error');
      triggerShake();
      return;
    }
    if (isRegister && !kvkkAccepted) {
      showToast('Lütfen KVKK Aydınlatma Metni\'ni okuyup onaylayın.', 'info');
      triggerShake();
      return;
    }
    if (isRegister && password.length < 12) {
      showToast('Şifre en az 12 karakter olmalıdır.', 'error');
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        const res = await register(username.trim(), email.trim(), password, fullName.trim(), kvkkAccepted);
        if (res?.verification_pending) {
          setPendingVerificationEmail(email.trim());
          setViewMode('verify');
          showToast(res.message || 'Lütfen e-postanıza gönderilen doğrulama kodunu girin.', 'info');
          return;
        }
        localStorage.setItem('keepr_onboarding_pending', '1');
        showToast('Kayıt başarılı! Keepr\'a hoş geldiniz.');
      } else {
        await login(email.trim(), password);
        showToast('Giriş başarılı! Kütüphanenize yönlendiriliyorsunuz.');
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const isVerificationPending = err.response?.data?.verification_pending;
      if (isVerificationPending) {
        setPendingVerificationEmail(email.trim());
        setViewMode('verify');
        showToast(err.response?.data?.error || 'Lütfen e-postanıza gönderilen doğrulama kodunu girin.', 'info');
        return;
      }
      const errMsg = err.response?.data?.error || 'Bir sorun oluştu. Lütfen tekrar deneyin.';
      showToast(errMsg, 'error');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  if (viewMode === 'verify') {
    return (
      <VerificationView
        email={pendingVerificationEmail}
        onBack={() => setViewMode('form')}
        onSuccess={onSuccess || (() => {})}
      />
    );
  }

  return (
    <div className={`flex flex-col justify-center w-full max-w-sm mx-auto ${shake ? 'animate-shake' : ''}`}>
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {isRegister ? 'Hesabını oluştur' : 'Tekrar hoş geldin'}
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {isRegister
            ? 'Ücretsiz. Kartsız. Hemen başla.'
            : 'Linklerin seni bekliyorlar.'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name & Username — register only */}
        <AnimatePresence initial={false}>
          {isRegister && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Ad Soyad Field */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Ad Soyad
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <UserIcon size={16} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Adınız Soyadınız"
                    required={isRegister}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-transparent rounded-apple-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-[#121212] focus:border-accent/50 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Kullanıcı Adı Field */}
              <div className="space-y-1.5 pb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <UserIcon size={16} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="kullaniciadi"
                    required={isRegister}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-transparent rounded-apple-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-[#121212] focus:border-accent/50 transition-all shadow-inner"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            E-Posta
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Mail size={16} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="eposta@example.com"
              required
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-transparent rounded-apple-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-[#121212] focus:border-accent/50 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Şifre
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock size={16} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-transparent rounded-apple-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-[#121212] focus:border-accent/50 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* KVKK Checkbox (Register Only) */}
        {isRegister && (
          <div className="flex items-start gap-2.5 my-2">
            <input
              type="checkbox"
              id="kvkk"
              checked={kvkkAccepted}
              onChange={(e) => setKvkkAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-500 border-gray-300 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
            />
            <label htmlFor="kvkk" className="text-xs text-slate-500 dark:text-slate-400 leading-normal select-none cursor-pointer">
              <button
                type="button"
                onClick={() => setKvkkModalOpen(true)}
                className="text-accent font-bold hover:underline cursor-pointer bg-transparent border-none p-0 inline"
              >
                KVKK Aydınlatma Metni
              </button>
              'ni okudum ve kabul ediyorum.
            </label>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || (isRegister && !kvkkAccepted)}
          className="w-full mt-2 py-3 bg-accent hover:bg-accent-hover disabled:bg-slate-100 dark:disabled:bg-[#1c1c1e] disabled:text-slate-400 text-white font-bold text-xs rounded-apple-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:shadow-none cursor-pointer border-none"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <span>{isRegister ? 'Hesabımı Oluştur' : 'Giriş Yap'}</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      {/* Toggle login / register */}
      <div className="mt-6 text-center text-xs text-slate-400">
        <span>{isRegister ? 'Zaten hesabın var mı? ' : 'Henüz üye değil misin? '}</span>
        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setKvkkAccepted(false);
          }}
          className="font-bold text-accent hover:underline cursor-pointer bg-transparent border-none"
        >
          {isRegister ? 'Giriş Yap' : 'Ücretsiz Kaydol'}
        </button>
      </div>

      {/* KVKK Modal */}
      <AnimatePresence>
        {kvkkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#2c2c2e] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 dark:border-[#2c2c2e] flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  KVKK Aydınlatma Metni (v2026-07)
                </h3>
                <button
                  type="button"
                  onClick={() => setKvkkModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 bg-transparent border-none"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-[60vh] select-text">
                <p><strong>1. Veri Sorumlusu</strong><br />Keepr ("Uygulama") olarak, kullanıcılarımızın kişisel verilerinin güvenliğine ve gizliliğine büyük önem veriyoruz. Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("Kanun") uyarınca aşağıda açıklanan kapsamda işlenecektir.</p>
                <p><strong>2. İşlenen Kişisel Verileriniz</strong><br />Uygulamamıza kaydolurken ve hizmetlerimizi kullanırken işlenen kişisel verileriniz şunlardır:<br />- E-posta adresi, kullanıcı adı, ad soyad.<br />- Şifre verileriniz (sunucularımızda tek yönlü kriptografik hash formatında saklanır; şifrenizin kendisi kesinlikle okunamaz ve erişilemez durumdadır).<br />- Yüklediğiniz/Kaydettiğiniz internet bağlantıları (link/bookmark verileri), başlıklar ve açıklamalar.</p>
                <p><strong>3. Kişisel Verilerin İşlenme Amaçları</strong><br />Kişisel verileriniz şu amaçlarla işlenmektedir:<br />- Kullanıcı hesabınızın oluşturulması, kimliğinizin doğrulanması ve oturum açma süreçlerinin yönetilmesi.<br />- Uygulama özelliklerinin (link kaydetme, düzenleme, silme, favorileme) sunulması.<br />- Güvenlik, siber saldırıların tespiti ve engellenmesi.<br />- Kullanıcı deneyiminin iyileştirilmesi ve uygulama temalarınızın saklanması.</p>
                <p><strong>4. Kişisel Verilerin Aktarılması</strong><br />Kişisel verileriniz kesinlikle üçüncü şahıslarla paylaşılmamakta, satılmamakta veya ticari amaçlarla yurt dışına aktarılmamaktadır. Verileriniz, yasal yükümlülüklerin yerine getirilmesi amacıyla yetkili kamu kurum ve kuruluşları ile yalnızca yasal sınırlar dahilinde paylaşılabilecektir.</p>
                <p><strong>5. Haklarınız (Madde 11)</strong><br />Kanun'un 11. maddesi uyarınca;<br />- Kişisel verilerinizin işlenip işlenmediğini öğrenme,<br />- İşlenmişse bilgi talep etme,<br />- İşlenme amacını ve uygun kullanılıp kullanılmadığını öğrenme,<br />- Eksik veya yanlış işlenmişse düzeltilmesini isteme ve silinmesini talep etme haklarına sahipsiniz. Haklarınızı kullanmak için devpanthera@proton.me adresine e-posta gönderebilirsiniz.</p>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-[#1c1c1e] border-t border-gray-100 dark:border-[#2c2c2e] text-right">
                <button
                  type="button"
                  onClick={() => {
                    setKvkkAccepted(true);
                    setKvkkModalOpen(false);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border-none shadow-sm"
                >
                  Okudum, Kabul Ediyorum
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AuthView: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-12 bg-[#f8f9fa] dark:bg-[#0a0a0a]">
      <div className="w-full max-w-4xl bg-white dark:bg-[#121212] rounded-apple-xl border border-gray-100 dark:border-[#1c1c1e] shadow-xl overflow-hidden grid md:grid-cols-2 min-h-[560px]">
        {/* ───────── LEFT PANEL ───────── */}
        <div className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden bg-gradient-to-br from-[#f0f0ff] via-white to-[#fff0f5] dark:from-[#0d0d14] dark:via-[#111115] dark:to-[#120a0d] border-r border-gray-100 dark:border-[#1c1c1e]">
          {/* Ambient glow blobs */}
          <div className="absolute -top-16 -left-16 w-56 h-56 bg-accent/10 dark:bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-rose-400/10 dark:bg-rose-400/5 rounded-full blur-3xl pointer-events-none" />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 relative z-10"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <img src={appLogo} alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex items-center min-w-0">
              <span className="font-black text-xs text-slate-800 dark:text-slate-100 tracking-[0.2em] uppercase">
                Keepr
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-2 border-l border-slate-200 dark:border-[#2c2c2e] pl-2 truncate">
                Dijital Havuz
              </span>
            </div>
          </motion.div>

          {/* Floating demo cards */}
          <div className="relative flex-1 min-h-[180px] my-6">
            <DemoCard
              icon={Video}     color="bg-red-500"
              title="CSS Grid Rehberi"   domain="youtube.com"
              delay={0.15} offsetX={-28} offsetY={-58} rotate={-4}
            />
            <DemoCard
              icon={ShoppingBag} color="bg-amber-500"
              title="Ergonomik Sandalye" domain="trendyol.com"
              delay={0.35} offsetX={52}  offsetY={-8}  rotate={3}
            />
            <DemoCard
              icon={FileText}    color="bg-indigo-500"
              title="2025 Strateji Notu" domain="notion.so"
              delay={0.55} offsetX={-18} offsetY={58}  rotate={-2}
            />
          </div>

          {/* Tagline + description + pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="space-y-3 relative z-10"
          >
            <h1 className="text-[1.6rem] font-black tracking-tight text-slate-900 dark:text-slate-50 leading-snug">
              200 sekme mi<br />
              <span className="text-accent">açık bırakıyorsun?</span>
            </h1>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 max-w-[260px]">
              Keepr, <em>"bunu sonra okuyorum"</em> diyerek kapandığında
              unutulan her şeyin evidir. Link kaydet, kategorile, sabitle — hepsi bu.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {([
                { icon: Heart,    label: 'Favoriler' },
                { icon: Pin,      label: 'Sabitleme' },
                { icon: Bookmark, label: 'Akıllı Havuz' },
              ] as { icon: React.ElementType; label: string }[]).map(({ icon: Ic, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-[#1c1c1e] text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide border border-gray-200/60 dark:border-[#2c2c2e]"
                >
                  <Ic size={9} />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ───────── RIGHT PANEL ───────── */}
        <div className="flex-1 flex flex-col justify-center p-8 md:p-10">
          <AuthForm />
        </div>
      </div>
    </div>
  );
};
