import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link2, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
const SESSION_KEY = 'keepr_last_clip';

interface ClipboardDetectProps {
  onSave: (url: string) => void;
}

export const ClipboardDetect: React.FC<ClipboardDetectProps> = ({ onSave }) => {
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkClipboard = useCallback(async () => {
    try {
      if (!navigator?.clipboard?.readText) return;
      const text = (await navigator.clipboard.readText()).trim();
      if (!URL_REGEX.test(text)) return;
      if (sessionStorage.getItem(SESSION_KEY) === text) return;
      setDetectedUrl(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDetectedUrl(null), 4500);
    } catch { /* permission denied — silent */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(checkClipboard, 1000);
    window.addEventListener('focus', checkClipboard);
    return () => {
      clearTimeout(t);
      window.removeEventListener('focus', checkClipboard);
    };
  }, [checkClipboard]);

  const dismiss = (save: boolean) => {
    if (detectedUrl) sessionStorage.setItem(SESSION_KEY, detectedUrl);
    if (save && detectedUrl) onSave(detectedUrl);
    if (timerRef.current) clearTimeout(timerRef.current);
    setDetectedUrl(null);
  };

  return (
    <AnimatePresence>
      {detectedUrl && (
        <motion.div
          initial={{ opacity: 0, y: 64, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 64, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-[#2c2c2e] rounded-2xl px-4 py-3 w-[calc(100%-2rem)] max-w-sm select-none"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.13)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Link2 size={14} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Panoda link bulundu</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{detectedUrl}</p>
          </div>
          <button
            onClick={() => dismiss(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer border-none"
          >
            Kaydet <ArrowRight size={10} />
          </button>
          <button
            onClick={() => dismiss(false)}
            className="flex-shrink-0 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2c2c2e] transition-colors cursor-pointer border-none bg-transparent"
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
