import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Calendar, Link as LinkIcon, Save, Eye, Bell, Check, Users } from 'lucide-react';
import type { Keep } from '../../hooks/useKeeps';
import { useAuth } from '../../context/AuthContext';
import { useProModal } from '../../context/ProModalContext';
import { useToast } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

interface InspectorProps {
  keep: Keep | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: number, data: { title: string; description: string }) => Promise<void>;
  onRefreshKeep?: (keep: Keep) => void;
  readOnly?: boolean;
}

export const Inspector: React.FC<InspectorProps> = ({ keep, isOpen, onClose, onUpdate, onRefreshKeep, readOnly }) => {
  const { user } = useAuth();
  const { openProModal } = useProModal();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [reminderTime, setReminderTime] = useState('');
  const [isUpdatingReminder, setIsUpdatingReminder] = useState(false);

  useEffect(() => {
    if (keep) {
      setTitle(keep.title || '');
      setDescription(keep.description || '');
      if (keep.reminder_at) {
        try {
          const date = new Date(keep.reminder_at);
          const pad = (n: number) => String(n).padStart(2, '0');
          const localStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
          setReminderTime(localStr);
        } catch (e) {
          setReminderTime('');
        }
      } else {
        setReminderTime('');
      }
    }
  }, [keep]);

  if (!isOpen || !keep) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(keep.id, { title, description });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetReminder = async () => {
    if (!keep || !reminderTime) return;
    setIsUpdatingReminder(true);
    try {
      const isoString = new Date(reminderTime).toISOString();
      const response = await api.post(`/api/keeps/${keep.id}/reminder`, { reminder_at: isoString });
      showToast('Alarm başarıyla kuruldu.');
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
      if (response.data.keep) {
        onRefreshKeep?.(response.data.keep);
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || 'Alarm kurulurken bir hata oluştu.';
      showToast(errorMsg, 'error');
    } finally {
      setIsUpdatingReminder(false);
    }
  };

  const handleClearReminder = async () => {
    if (!keep) return;
    setIsUpdatingReminder(true);
    try {
      const response = await api.post(`/api/keeps/${keep.id}/reminder`, { reminder_at: null });
      showToast('Alarm kaldırıldı.');
      setReminderTime('');
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
      if (response.data.keep) {
        onRefreshKeep?.(response.data.keep);
      }
    } catch (e: any) {
      showToast('Alarm kaldırılırken bir hata oluştu.', 'error');
    } finally {
      setIsUpdatingReminder(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
        
        {/* LIGHT BACKDROP FOR OUTSIDE CLICK CLOSES */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/10 dark:bg-black/40 backdrop-blur-xs pointer-events-auto cursor-pointer"
        />

        {/* DRWER CONTENT */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-md h-full bg-white dark:bg-[#121212] border-l border-gray-100 dark:border-[#1c1c1e] shadow-2xl flex flex-col pointer-events-auto z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-[#1c1c1e] flex justify-between items-center bg-gray-50 dark:bg-[#121212]">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Eye size={16} className="text-accent" />
              Detayları İncele
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#1c1c1e] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Read Only Warn Banner */}
          {readOnly && (
            <div className="mx-5 mt-4 p-3 bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 rounded-apple-lg border border-violet-500/20 text-xs font-semibold flex items-start gap-2">
              <Users size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                Bu bağlantı paylaşılan bir klasörde bulunmaktadır ve sadece görüntüleme (İzleyici) yetkiniz vardır. Değişiklik yapılamaz.
              </span>
            </div>
          )}

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* CLICKABLE URL BAR */}
            <a
              href={keep.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#1c1c1e] hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-apple-lg border border-gray-100 dark:border-transparent text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 truncate max-w-[300px]">
                <LinkIcon size={14} className="text-slate-400" />
                <span className="truncate">{keep.url}</span>
              </div>
              <ExternalLink size={14} className="text-slate-400 group-hover:text-accent-hover transition-colors flex-shrink-0" />
            </a>

            {/* EDITABLE FORM */}
            <div className="space-y-4">
              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Başlık
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Başlık girin..."
                  disabled={readOnly}
                  className="w-full px-3 py-2 bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-apple-md text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-accent transition-all font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Description input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Açıklama
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Açıklama girin..."
                  rows={4}
                  disabled={readOnly}
                  className="w-full px-3 py-2 bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-apple-md text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-accent transition-all font-medium resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Save changes button */}
              {!readOnly && (
                <button
                  onClick={handleSave}
                  disabled={isSaving || (title === (keep.title || '') && description === (keep.description || ''))}
                  className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:bg-slate-100 dark:disabled:bg-[#1c1c1e] disabled:text-slate-400 text-white text-xs font-bold rounded-apple-md transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:shadow-none cursor-pointer"
                >
                  <Save size={14} />
                  <span>Değişiklikleri Kaydet</span>
                </button>
              )}
            </div>

            {/* ALARM / REMINDER SECTION */}
            {!readOnly && (
              <div className="pt-4 border-t border-gray-100 dark:border-[#1c1c1e] space-y-3">
                <label className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Bell size={12} className="text-accent" />
                  <span>Akıllı Hatırlatıcı & Alarm</span>
                </label>

                {!user?.is_pro ? (
                  <div 
                    onClick={() => openProModal('reminder')}
                    className="flex items-center justify-between p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-apple-lg cursor-pointer hover:bg-amber-500/10 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Pro & Team Özelliği</span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400">Okuma hatırlatıcıları kurmak için yükseltin.</span>
                    </div>
                    <span className="px-2 py-0.5 text-[8px] font-extrabold uppercase bg-amber-500 text-white rounded-apple-sm">YÜKSELT</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {keep.reminder_at ? (
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#1c1c1e] rounded-apple-lg border border-gray-100 dark:border-transparent">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Planlanan Alarm</span>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                            {formatDate(keep.reminder_at)}
                          </span>
                          {keep.is_reminder_sent && (
                            <span className="text-[9px] font-semibold text-emerald-500 mt-0.5 flex items-center gap-1">
                              <Check size={10} /> Gönderildi (E-posta)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleClearReminder}
                          disabled={isUpdatingReminder}
                          className="action-btn px-2.5 py-1 text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-apple-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Kaldır
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-apple-md text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-accent transition-all font-semibold"
                        />
                        <button
                          onClick={handleSetReminder}
                          disabled={!reminderTime || isUpdatingReminder}
                          className="px-3.5 py-2 bg-accent hover:bg-accent-hover disabled:bg-slate-100 dark:disabled:bg-[#1c1c1e] disabled:text-slate-400 text-white text-xs font-bold rounded-apple-md transition-colors shadow-xs cursor-pointer"
                        >
                          Kur
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {readOnly && keep.reminder_at && (
              <div className="pt-4 border-t border-gray-100 dark:border-[#1c1c1e] space-y-2">
                <label className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Bell size={12} className="text-violet-500" />
                  <span>Planlanan Alarm</span>
                </label>
                <div className="p-3 bg-slate-50 dark:bg-[#1c1c1e] rounded-apple-lg border border-gray-100 dark:border-transparent">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {formatDate(keep.reminder_at)}
                  </span>
                </div>
              </div>
            )}

            {/* METADATA HISTORY */}
            <div className="pt-4 border-t border-gray-100 dark:border-[#1c1c1e] space-y-2">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                <Calendar size={12} />
                <span>Kayıt Tarihi:</span>
                <span className="text-slate-600 dark:text-slate-400 font-medium ml-auto">
                  {formatDate(keep.created_at)}
                </span>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
