import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { Users, AlertTriangle, Check, ArrowRight, LogIn } from 'lucide-react';
import appLogo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';

interface InvitationDetails {
  id: number;
  category_id: number;
  category_name: string;
  inviter_id: number;
  inviter_username: string;
  token: string;
  role: 'viewer' | 'editor';
  expires_at: string;
  is_used: boolean;
  is_expired: boolean;
}

interface CollabInviteViewProps {
  token: string;
}

export const CollabInviteView: React.FC<CollabInviteViewProps> = ({ token }) => {
  const { token: authToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InvitationDetails | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchInviteDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/invite/${token}`);
        setInvite(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Davetiye bilgileri yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };
    fetchInviteDetails();
  }, [token]);

  const handleAccept = async () => {
    if (!authToken) {
      // User is not logged in, store the invite token to accept it automatically after login
      localStorage.setItem('pending_invite_token', token);
      window.location.href = '/login';
      return;
    }

    try {
      setAccepting(true);
      await axios.post(
        `${API_URL}/api/invite/${token}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Davet kabul edilirken bir hata oluştu.');
    } finally {
      setAccepting(false);
    }
  };

  const handleLoginRedirect = () => {
    localStorage.setItem('pending_invite_token', token);
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center animate-pulse">
            <Users className="text-accent" size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 animate-pulse">Davetiye yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      {/* Container Box */}
      <div className="w-full max-w-md bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl p-8 shadow-2xl flex flex-col gap-6 select-none relative overflow-hidden">
        {/* Top Gradient Overlay */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-indigo-500 to-violet-600" />

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={appLogo} alt="Keepr Logo" className="w-9 h-9 object-contain" />
          <h2 className="text-sm font-black tracking-widest text-slate-400 uppercase">KEEPR</h2>
        </div>

        {error ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Davet Geçersiz</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-xs">{error}</p>
            </div>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="mt-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1c1e] dark:hover:bg-[#252529] text-slate-700 dark:text-slate-300 text-xs font-bold rounded-apple-xl transition-all cursor-pointer"
            >
              Ana Sayfaya Git
            </button>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-bounce">
              <Check size={24} strokeWidth={3} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Kabul Edildi!</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Ortak klasöre katıldınız. Yönlendiriliyorsunuz...
              </p>
            </div>
          </div>
        ) : invite ? (
          <div className="flex flex-col gap-6 py-2">
            {/* Info Message */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shadow-inner">
                <Users size={26} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Ortak Çalışma Daveti
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-extrabold text-accent">@{invite.inviter_username}</span> sizi{' '}
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">"{invite.category_name}"</span>{' '}
                  adlı ortak klasöre katılmaya davet ediyor.
                </p>
              </div>
            </div>

            {/* Role detail badge */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#1c1c1e] rounded-2xl border border-gray-100 dark:border-transparent text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Erişim Rolünüz</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                invite.role === 'editor'
                  ? 'bg-violet-500/10 text-violet-500 border border-violet-500/20'
                  : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
              }`}>
                {invite.role === 'editor' ? 'EDİTÖR (Yazma & Silme)' : 'İZLEYİCİ (Salt Okunur)'}
              </span>
            </div>

            {/* Accept / Login Action */}
            {authToken ? (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-apple-xl transition-all shadow-lg hover:shadow-accent/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {accepting ? 'Katılınıyor...' : 'Daveti Kabul Et ve Katıl'}
                <ArrowRight size={14} />
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400 rounded-apple-lg text-center text-[10px] font-semibold">
                  Bu daveti kabul etmek için giriş yapmalısınız. Giriş yaptıktan sonra davet otomatik tamamlanacaktır.
                </div>
                <button
                  onClick={handleLoginRedirect}
                  className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-apple-xl transition-all shadow-lg hover:shadow-accent/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn size={14} />
                  Giriş Yap / Kaydol
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
