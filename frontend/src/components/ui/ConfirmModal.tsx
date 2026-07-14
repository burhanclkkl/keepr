import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, LogOut } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'primary';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'Vazgeç',
  onConfirm,
  onCancel,
  variant = 'primary',
}) => {
  // Prevent background scroll when modal is active
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

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <LogOut className="w-5 h-5 text-accent" />;
    }
  };

  const getConfirmButtonStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20';
      default:
        return 'bg-accent hover:bg-accent/90 text-white shadow-accent/20';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            className="relative w-full max-w-sm bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-apple-xl shadow-xl overflow-hidden z-10 p-5 flex flex-col items-center text-center space-y-4"
          >
            {/* Custom Icon Wrapper */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-[#1c1c1e] border border-gray-100/30`}>
              {getIcon()}
            </div>

            {/* Typography */}
            <div className="space-y-1.5 w-full">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                {message}
              </p>
            </div>

            {/* Buttons Row */}
            <div className="flex w-full gap-2.5 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2 px-3 border border-gray-200 dark:border-[#1c1c1e] hover:bg-slate-50 dark:hover:bg-[#1c1c1e] text-xs font-semibold text-slate-600 dark:text-slate-400 rounded-apple-md cursor-pointer transition-colors"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-apple-md cursor-pointer shadow-xs transition-all ${getConfirmButtonStyles()}`}
              >
                {confirmText}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
