import React, { createContext, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Automatically dismiss toast after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`glass shadow-lg border px-4 py-3 rounded-apple-lg flex items-center justify-between text-sm pointer-events-auto select-none ${
                toast.type === 'error'
                  ? 'border-red-500/20 text-red-500'
                  : toast.type === 'info'
                  ? 'border-accent/20 text-accent'
                  : 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {toast.type === 'error' ? '✕' : toast.type === 'info' ? 'ℹ' : '✓'}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{toast.message}</span>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 ml-4 transition-colors pointer-events-auto"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast, ToastProvider içerisinde kullanılmalıdır.');
  }
  return context;
};
