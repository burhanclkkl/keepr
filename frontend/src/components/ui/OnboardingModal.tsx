import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, FolderOpen, Heart, ArrowRight, X, Check, Pin } from 'lucide-react';

interface OnboardingModalProps {
  onDone: () => void;
}

const slides = [
  {
    icon: Link2,
    color: 'bg-emerald-500',
    title: 'Bağlantıyı yapıştırın, gerisi bizde',
    desc: 'Üst çubuğa herhangi bir bağlantı (URL) yapıştırıp ekleyin. Keepr başlığı, açıklamayı ve logoyu arka planda saniyeler içinde sizin için derler.',
    hint: 'Örn: github.com, youtube.com, trendyol.com...',
  },
  {
    icon: FolderOpen,
    color: 'bg-blue-500',
    title: 'Kategorilerle dijital düzeninizi kurun',
    desc: 'Bağlantılarınızı Okuma, Alışveriş, İzleme gibi klasörlere taşıyın. En önemli içeriklerinizi listenin en üstüne sabitleyerek her an elinizin altında tutun.',
    hint: 'Kategorileri sol menüden dilediğiniz gibi oluşturup yönetebilirsiniz.',
  },
  {
    icon: Heart,
    color: 'bg-rose-500',
    title: 'Favorilerle hızlıca ulaşın',
    desc: 'Sık kullandığınız bağlantıları tek tıkla favorileyin. Sol paneldeki "Favoriler" filtresinden ya da toplu seçim barıyla hızlıca yönetin.',
    hint: 'Çoklu seçim modunu aktif ederek toplu taşıyabilir veya silebilirsiniz.',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [typedText, setTypedText] = useState('');

  const isLast = step === slides.length - 1;
  const slide = slides[step];
  const Icon = slide.icon;

  // Typewriting effect simulator for slide 0
  useEffect(() => {
    if (step === 0) {
      setTypedText('');
      const target = 'github.com/trending';
      let i = 0;
      const interval = setInterval(() => {
        setTypedText((prev) => prev + target.charAt(i));
        i++;
        if (i >= target.length) clearInterval(interval);
      }, 90);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleNext = () => {
    if (isLast) {
      setExiting(true);
      setTimeout(onDone, 300);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col md:flex-row min-h-[420px]"
          >
            {/* ── VISUAL DEMO SECTION (Left side of modal) ── */}
            <div className="md:w-5/12 bg-slate-50 dark:bg-[#0c0c0d] border-b md:border-b-0 md:border-r border-gray-100 dark:border-[#1c1c1e] p-6 flex flex-col items-center justify-center relative overflow-hidden select-none min-h-[160px]">
              {/* Dynamic decorative shapes */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl" />

              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="demo0"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="w-full space-y-3 relative z-10"
                  >
                    {/* Mock URL Input */}
                    <div className="w-full bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-xs">
                      <Link2 size={11} className="text-slate-400" />
                      <div className="text-[10px] font-mono text-slate-700 dark:text-slate-300 flex-1 truncate">
                        {typedText}
                        <span className="animate-pulse">|</span>
                      </div>
                    </div>
                    {/* Mock Animated Card Result */}
                    {typedText.length >= 10 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="bg-white dark:bg-[#121212] border border-gray-200/60 dark:border-[#1c1c1e] rounded-xl p-2.5 shadow-md flex items-center gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-[10px] font-extrabold text-white">
                          G
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[9px] font-bold text-slate-800 dark:text-slate-200 truncate">GitHub: Let's build from here</div>
                          <div className="text-[8px] text-slate-400 truncate">github.com</div>
                        </div>
                        <Check size={10} className="text-emerald-500 flex-shrink-0" />
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="demo1"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="w-full space-y-3 relative z-10"
                  >
                    {/* Mock Pinned Card */}
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="bg-white dark:bg-[#121212] border-2 border-accent/20 dark:border-[#2c2c2e] rounded-xl p-2.5 shadow-md flex items-center gap-2"
                    >
                      <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center">
                        <FolderOpen size={10} color="#fff" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-extrabold text-slate-700 dark:text-slate-300 truncate">React Belgeleri</div>
                      </div>
                      <Pin size={10} className="text-amber-500 rotate-45 fill-amber-500" />
                    </motion.div>

                    {/* Mock Category List */}
                    <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-xl p-2 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-[8px] font-bold text-accent bg-accent/5 px-2 py-1 rounded">
                        <span>📚 Okuma Listesi</span>
                        <span className="bg-accent/10 px-1 rounded text-[7px]">3</span>
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 px-2 py-0.5">
                        <span>🛒 Alışveriş</span>
                        <span>1</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="demo2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="w-full space-y-2.5 relative z-10"
                  >
                    {/* Floating Heart Heartbeat Card */}
                    <motion.div
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-xl p-3 shadow-md flex flex-col items-center justify-center gap-2"
                    >
                      <div className="w-9 h-9 rounded-full bg-rose-500/10 flex items-center justify-center">
                        <Heart size={16} className="text-rose-500 fill-rose-500" />
                      </div>
                      <span className="text-[9px] font-extrabold text-slate-800 dark:text-slate-200 text-center">Favorilere Eklendi</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── INFO TEXT SECTION (Right side of modal) ── */}
            <div className="flex-1 p-8 flex flex-col justify-between">
              {/* Skip button */}
              <button
                onClick={() => { setExiting(true); setTimeout(onDone, 300); }}
                className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer"
                title="Geç"
              >
                <X size={16} />
              </button>

              {/* Text Area */}
              <div className="space-y-4">
                {/* Header Icon */}
                <div className={`w-12 h-12 ${slide.color} rounded-2xl flex items-center justify-center shadow-lg shadow-accent/10`}>
                  <Icon size={20} color="#fff" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
                    {slide.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {slide.desc}
                  </p>
                </div>

                {/* Hint Card */}
                <div className="bg-slate-50 dark:bg-[#0c0c0d] border border-slate-100/50 dark:border-[#1c1c1e] rounded-xl px-3.5 py-2.5">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    💡 {slide.hint}
                  </p>
                </div>
              </div>

              {/* Footer Controls */}
              <div className="mt-8 pt-4 border-t border-slate-50 dark:border-[#1c1c1e] flex items-center justify-between">
                {/* Steps Dots */}
                <div className="flex items-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={`rounded-full transition-all duration-200 cursor-pointer ${
                        i === step
                          ? 'w-5 h-1.5 bg-accent'
                          : 'w-1.5 h-1.5 bg-slate-200 dark:bg-[#2c2c2e] hover:bg-slate-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Next button */}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {isLast ? (
                    <>
                      <span>Hadi Başlayalım</span>
                      <Check size={13} />
                    </>
                  ) : (
                    <>
                      <span>İleri</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
