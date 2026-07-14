import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import appLogo from '../../assets/logo.png';

interface VerificationViewProps {
  email: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const VerificationView: React.FC<VerificationViewProps> = ({ email, onBack, onSuccess }) => {
  const { setSession } = useAuth();
  const { showToast } = useToast();
  
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [shake, setShake] = useState(false);
  
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle single digit input change
  const handleChange = (value: string, index: number) => {
    // Only allow single digits
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    // Keep only the last character entered
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // Empty input, backspace moves focus back and clears that previous input
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
  };

  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) {
      showToast('Lütfen sadece 6 haneli doğrulama kodunu yapıştırın.', 'error');
      return;
    }
    
    const digits = pastedData.split('');
    setCode(digits);
    
    // Focus the last input
    inputRefs.current[5]?.focus();
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
      setSession(token, refresh_token, user);
      showToast('E-posta doğrulama başarılı! Giriş yapıldı.', 'success');
      onSuccess();
    } catch (err: any) {
      // Brute-force lockout check
      const errMsg = err.response?.data?.error || 'Doğrulama kodu geçersiz veya süresi dolmuş.';
      showToast(errMsg, 'error');
      
      // Trigger shake animation and reset code inputs
      setShake(true);
      setTimeout(() => setShake(false), 500);
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
      showToast(response.data.message || 'Yeni doğrulama kodu başarıyla e-postanıza gönderildi.', 'success');
      setResendTimer(60); // Reset timer
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      // Check for 429 Too Many Requests
      if (err.response?.status === 429) {
        showToast(err.response.data.error || 'Çok fazla istek. Lütfen biraz bekleyin.', 'info');
        // Reset timer based on backend message if needed, or default to 60s
        setResendTimer(60);
      } else {
        const errMsg = err.response?.data?.error || 'Kod gönderilirken bir sorun oluştu.';
        showToast(errMsg, 'error');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={`flex flex-col justify-center w-full max-w-sm mx-auto ${shake ? 'animate-shake' : ''}`}>
      {/* Back button */}
      <button 
        onClick={onBack}
        className="self-start flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 bg-transparent border-none cursor-pointer p-0 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Girişe Geri Dön</span>
      </button>

      {/* Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
          <img src={appLogo} alt="Logo" className="w-8 h-8 object-contain" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          E-postanı Doğrula
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
          Giriş yapmak için <span className="font-semibold text-slate-600 dark:text-slate-400">{email}</span> adresine gönderdiğimiz 6 haneli güvenlik kodunu girin.
        </p>
      </div>

      {/* 6 Digit inputs box */}
      <div className="flex justify-between gap-2.5 my-4">
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

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-xs text-emerald-500 font-semibold my-2 animate-pulse">
          <Loader2 size={14} className="animate-spin" />
          <span>Kod doğrulanıyor...</span>
        </div>
      )}

      {/* Resend button / timer status */}
      <div className="text-center mt-6">
        <button
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
    </div>
  );
};
