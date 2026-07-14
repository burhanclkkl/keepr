import React, { useState } from 'react';
import { X, Crown, Check, Lock, Loader, Palette, Pin, Heart, FolderTree, Sparkles, Bell, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SubscriptionService } from '../../services/subscriptionService';
import { useToast } from '../../context/ToastContext';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string | null;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose, feature }) => {
  const { setUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [upgradedTier, setUpgradedTier] = useState<'pro' | 'team'>('pro');

  if (!isOpen) return null;

  const featureLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    theme: { label: 'Özel Temalar & Koyu Mod', icon: <Palette size={13} /> },
    favorite: { label: 'Favorilere Ekleme', icon: <Heart size={13} /> },
    pin: { label: 'Bağlantıları Başa Sabitleme', icon: <Pin size={13} /> },
    folder: { label: 'İç İçe Alt Klasörler', icon: <FolderTree size={13} /> },
    reminder: { label: 'Akıllı Alarm & Hatırlatıcı', icon: <Bell size={13} /> },
    share: { label: 'Koleksiyon Paylaşımı (Ekip/Ortak)', icon: <Share2 size={13} /> },
  };

  const proFeatures = [
    {
      icon: <Palette size={15} />,
      title: 'Sınırsız Tema Özelleştirmesi',
      desc: 'Koyu mod and 5 farklı renk paletini dilediğiniz gibi kullanın.',
    },
    {
      icon: <Pin size={15} />,
      title: 'Bağlantı Sabitleme (Pins)',
      desc: 'En kritik bağlantılarınızı listenin en üstüne sabitleyin.',
    },
    {
      icon: <Heart size={15} />,
      title: 'Sınırsız Favoriler',
      desc: 'Sık eriştiğiniz bağlantıları tek tıkla favorileyin.',
    },
    {
      icon: <Bell size={15} />,
      title: 'Akıllı Alarm & Hatırlatıcılar',
      desc: 'Linklerinize hatırlatma tarihi kurun, zamanı gelince bildirim alın.',
    },
    {
      icon: <FolderTree size={15} />,
      title: 'Akıllı Alt Klasörler',
      desc: 'İç içe geçmiş alt koleksiyonlar ile kusursuz düzen.',
      soon: true,
    },
  ];

  const handleUpgradeMock = async (targetTier: 'pro' | 'team') => {
    setLoading(true);
    setUpgradedTier(targetTier);
    try {
      const res = await SubscriptionService.upgradeMock(targetTier);
      setUser(res.user);
      setSuccess(true);
      showToast(res.message, 'success');
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2200);
    } catch (err: any) {
      console.error(err);
      showToast('Abonelik yükseltme başarısız oldu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRealUpgradeClick = () => {
    showToast('Ödeme sistemi entegrasyonu yakında aktif olacaktır. Test için "Ücretsiz Yükselt" butonunu kullanabilirsiniz.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={loading || success ? undefined : onClose}
      />

      {/* Modal Container — clean card, light by default, respects dark mode */}
      <div className="relative w-full sm:max-w-sm overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#161618] border-0 sm:border border-gray-100 dark:border-[#2c2c2e] shadow-2xl flex flex-col max-h-[92vh]">

        {/* Top accent stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-accent via-[#34d399] to-accent flex-shrink-0" />

        {/* Close Button */}
        {!(loading || success) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-xl transition-colors z-10 cursor-pointer border-none bg-transparent"
          >
            <X size={16} />
          </button>
        )}

        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center text-center">
          {success ? (
            /* ── SUCCESS STATE ── */
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/20">
                <Check size={38} strokeWidth={3} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Tebrikler! 🎉</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Hesabınız başarıyla <strong className="text-slate-700 dark:text-slate-200">Keepr {upgradedTier.toUpperCase()}</strong> sürümüne yükseltildi. Tüm özelliklerin kilidi açıldı.
              </p>
              <div className="flex gap-1.5 pt-1">
                {['#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6'].map((c, i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: c, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Crown Icon — accent colored, no amber */}
              <div className="relative mb-4 mt-2">
                <div className="absolute inset-0 bg-accent/15 rounded-2xl blur-xl" />
                <div className="relative w-14 h-14 bg-accent/10 dark:bg-accent/15 border border-accent/20 rounded-2xl flex items-center justify-center">
                  <Crown size={28} className="text-accent fill-accent/20" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                Keepr Premium'a Yükseltin
              </h2>

              {/* Locked Feature Badge */}
              {feature && featureLabels[feature] && (
                <div className="mt-3 flex items-center gap-2 bg-accent/5 dark:bg-accent/10 border border-accent/15 dark:border-accent/20 text-slate-600 dark:text-slate-300 px-3.5 py-2.5 rounded-xl text-xs text-left w-full max-w-xs">
                  <Lock size={12} className="text-accent flex-shrink-0" />
                  <span>
                    <strong className="text-slate-700 dark:text-slate-200">{featureLabels[feature].label}</strong> özelliğini kullanmak için Premium üye olmanız gerekmektedir.
                  </span>
                </div>
              )}

              {/* Features List */}
              <div className="w-full mt-5 space-y-3 text-left max-w-xs">
                {proFeatures.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="mt-0.5 w-7 h-7 rounded-xl bg-accent/8 dark:bg-accent/12 border border-accent/10 text-accent flex items-center justify-center flex-shrink-0 group-hover:bg-accent/15 transition-colors">
                      {f.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{f.title}</h4>
                        {f.soon && (
                          <span className="text-[9px] font-black bg-slate-100 dark:bg-[#2c2c2e] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wide">Yakında</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="w-full border-t border-gray-100 dark:border-[#2c2c2e] my-5 max-w-xs" />

              {/* Actions */}
              <div className="w-full space-y-2 max-w-xs">
                {/* Primary — accent button */}
                <button
                  onClick={handleRealUpgradeClick}
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-all shadow-md shadow-accent/15 hover:scale-[1.01] active:scale-98 cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} className="fill-white/20" />
                  Şimdi Yükselt — 4.99$/ay'dan başlayan
                </button>

                {/* Pro mock button */}
                <button
                  onClick={() => handleUpgradeMock('pro')}
                  disabled={loading}
                  className="w-full py-3 px-6 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-[#1c1c1e] dark:hover:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 font-semibold border border-gray-200 dark:border-[#2c2c2e] transition-all active:scale-98 flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  {loading && upgradedTier === 'pro' ? (
                    <Loader size={14} className="animate-spin text-accent" />
                  ) : (
                    <span>Test: Pro Sürümüne Yükselt</span>
                  )}
                </button>

                {/* Team mock button */}
                <button
                  onClick={() => handleUpgradeMock('team')}
                  disabled={loading}
                  className="w-full py-3 px-6 rounded-2xl bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20 transition-all active:scale-98 flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  {loading && upgradedTier === 'team' ? (
                    <Loader size={14} className="animate-spin text-violet-500" />
                  ) : (
                    <span>Test: Team Sürümüne Yükselt</span>
                  )}
                </button>
              </div>

              {/* Footer */}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 leading-relaxed max-w-xs">
                Ödemeler Stripe güvencesiyle 256-bit şifrelenir. İstediğiniz an iptal edebilirsiniz.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
