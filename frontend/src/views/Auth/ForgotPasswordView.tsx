import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { Loader2, ArrowLeft, ArrowRight, Lock, Mail } from 'lucide-react';
import appLogo from '../../assets/logo.png';

interface ForgotPasswordViewProps {
  /** Girişte doldurulmuş e-posta (varsa) ön-doldurulur. */
  initialEmail?: string;
  onBack: () => void;
}

type Step = 'email' | 'reset';

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ initialEmail = '', onBack }) => {
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [shake, setShake] = useState(false);

  const inputRefs = useRef<HTMLInputElement[]>([]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Resend cooldown countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ── Step 1: request reset code ────────────────────────────
  const handleRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    if (!email.trim()) {
      showToast('Lütfen e-posta adresinizi girin.', 'error');
      triggerShake();
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: email.trim() });
      showToast(res.data?.message || 'Eğer bu e-posta kayıtlıysa, sıfırlama kodu gönderildi.', 'info');
      setStep('reset');
      setResendTimer(60);
      setCode(Array(6).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'İstek gönderilirken bir sorun oluştu.';
      showToast(errMsg, 'error');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP input handlers (VerificationView ile aynı davranış) ─
  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const next = [...code];
      if (!code[index] && index > 0) {
        next[index - 1] = '';
        setCode(next);
        inputRefs.current[index - 1]?.focus();
      } else {
        next[index] = '';
        setCode(next);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pasted)) {
      showToast('Lütfen sadece 6 haneli kodu yapıştırın.', 'error');
      return;
    }
    setCode(pasted.split(''));
    inputRefs.current[5]?.focus();
  };

  // ── Step 2: submit code + new password ────────────────────
  const handleReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      showToast('Lütfen 6 haneli kodu eksiksiz girin.', 'error');
      triggerShake();
      return;
    }
    if (newPassword.length < 12) {
      showToast('Yeni şifre en az 12 karakter olmalıdır.', 'error');
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password', {
        email: email.trim(),
        code: fullCode,
        new_password: newPassword,
      });
      showToast(res.data?.message || 'Şifreniz başarıyla sıfırlandı. Lütfen giriş yapın.', 'success');
      onBack();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Şifre sıfırlanamadı. Kodu kontrol edip tekrar deneyin.';
      showToast(errMsg, 'error');
      triggerShake();
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
      const res = await api.post('/api/auth/forgot-password', { email: email.trim() });
      showToast(res.data?.message || 'Yeni sıfırlama kodu gönderildi.', 'success');
      setResendTimer(60);
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Kod gönderilirken bir sorun oluştu.';
      showToast(errMsg, 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={`flex flex-col justify-center w-full max-w-sm mx-auto ${shake ? 'animate-shake' : ''}`}>
      {/* Back button */}
      <button
        onClick={() => (step === 'reset' ? setStep('email') : onBack())}
        className="self-start flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 bg-transparent border-none cursor-pointer p-0 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>{step === 'reset' ? 'E-postayı Değiştir' : 'Girişe Geri Dön'}</span>
      </button>

      {/* Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
          <img src={appLogo} alt="Logo" className="w-8 h-8 object-contain" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {step === 'email' ? 'Şifreni mi unuttun?' : 'Yeni Şifreni Belirle'}
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
          {step === 'email' ? (
            'E-posta adresini gir, sana 6 haneli bir sıfırlama kodu gönderelim.'
          ) : (
            <>
              <span className="font-semibold text-slate-600 dark:text-slate-400">{email}</span> adresine gönderdiğimiz kodu ve yeni şifreni gir.
            </>
          )}
        </p>
      </div>

      {step === 'email' ? (
        /* ── STEP 1: Email ── */
        <form onSubmit={handleRequest} className="space-y-4">
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
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-transparent rounded-apple-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-[#121212] focus:border-accent/50 transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-accent hover:bg-accent-hover disabled:bg-slate-100 dark:disabled:bg-[#1c1c1e] disabled:text-slate-400 text-white font-bold text-xs rounded-apple-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:shadow-none cursor-pointer border-none"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>Sıfırlama Kodu Gönder</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      ) : (
        /* ── STEP 2: Code + new password ── */
        <form onSubmit={handleReset} className="space-y-5">
          {/* 6 Digit inputs */}
          <div className="flex justify-between gap-2.5">
            {code.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                ref={(el) => { inputRefs.current[idx] = el as HTMLInputElement; }}
                onChange={(e) => handleChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onPaste={idx === 0 ? handlePaste : undefined}
                disabled={isLoading}
                className="w-12 h-14 text-center text-xl font-black rounded-xl border border-solid border-gray-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-all shadow-xs focus:ring-1 focus:ring-emerald-500"
              />
            ))}
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Yeni Şifre
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={16} />
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-transparent rounded-apple-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-[#121212] focus:border-accent/50 transition-all shadow-inner"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
              En az 12 karakter; büyük/küçük harf, rakam ve özel karakter içermeli.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-accent hover:bg-accent-hover disabled:bg-slate-100 dark:disabled:bg-[#1c1c1e] disabled:text-slate-400 text-white font-bold text-xs rounded-apple-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:shadow-none cursor-pointer border-none"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>Şifreyi Sıfırla</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>

          {/* Resend */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0 || isResending}
              className={`text-xs font-bold transition-all border-none bg-transparent cursor-pointer ${
                resendTimer > 0
                  ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 hover:underline'
              }`}
            >
              {isResending ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  Kod Gönderiliyor...
                </span>
              ) : resendTimer > 0 ? (
                `Kodu Yeniden Gönder (${resendTimer}s)`
              ) : (
                'Yeni Kod Gönder'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
