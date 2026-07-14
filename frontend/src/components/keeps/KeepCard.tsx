import React from 'react';
import { Folder, Trash2, ExternalLink, Check, Heart, Pin, Bell, Lock } from 'lucide-react';
import type { Keep } from '../../hooks/useKeeps';
import { PremiumFeature } from '../ui/PremiumFeature';

interface KeepCardProps {
  keep: Keep;
  onDelete: (id: number) => void;
  onMove: (keep: Keep) => void;
  onSelect: (keep: Keep) => void;
  onToggleFavorite?: (id: number, isFavorite: boolean) => void;
  onTogglePin?: (id: number, isPinned: boolean) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  viewLayout?: 'grid' | 'list';
  readOnly?: boolean;
}

const getDomain = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
};

const getFallbackGradient = (domain: string) => {
  const gradients = [
    'from-pink-400 to-indigo-500',
    'from-purple-400 to-blue-500',
    'from-teal-400 to-indigo-600',
    'from-amber-400 to-rose-500',
    'from-emerald-400 to-teal-600',
    'from-cyan-400 to-blue-600'
  ];
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

export const KeepCard = React.memo<KeepCardProps>(({
  keep,
  onDelete,
  onMove,
  onSelect,
  onToggleFavorite,
  onTogglePin,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  viewLayout = 'grid',
  readOnly = false
}) => {
  const domain = getDomain(keep.url);
  const fallbackGrad = getFallbackGradient(domain);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.action-btn')) {
      return;
    }
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(keep.id);
      return;
    }
    onSelect(keep);
  };

  if (viewLayout === 'list') {
    return (
      <tr 
        onClick={handleCardClick}
        className={`hover:bg-slate-50/50 dark:hover:bg-[#1c1c1e]/30 transition-colors cursor-pointer group ${
          isSelected ? 'bg-accent/5 dark:bg-accent/5' : ''
        }`}
      >
        {/* CHECKBOX SELECTION COLUMN */}
        <td className="py-3 px-4 text-center select-none align-middle">
          {readOnly ? (
            <div className="w-5 h-5 flex items-center justify-center text-slate-400 dark:text-slate-600 mx-auto" title="Salt Okunur">
              <Lock size={12} />
            </div>
          ) : isSelectionMode || isSelected ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(keep.id);
              }}
              className={`action-btn w-5 h-5 rounded-full border-2 flex items-center justify-center text-white cursor-pointer mx-auto transition-all ${
                isSelected ? 'bg-accent border-accent' : 'border-slate-300 dark:border-[#2c2c2e] bg-slate-50 dark:bg-[#1c1c1e]'
              }`}
            >
              {isSelected && <Check size={10} strokeWidth={3} />}
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(keep.id);
              }}
              className="action-btn w-5 h-5 rounded-full border border-slate-300 dark:border-[#2c2c2e] hover:border-accent hover:bg-accent/15 flex items-center justify-center text-accent opacity-0 group-hover:opacity-100 cursor-pointer mx-auto transition-all"
            >
              <Check size={10} strokeWidth={3} />
            </div>
          )}
        </td>

        {/* TITLE AND SITE ICON COLUMN */}
        <td className="py-3 px-4 align-middle">
          <div className="flex items-center gap-3">
            {/* SITE MONOGRAM BADGE */}
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative shadow-xs bg-slate-50 dark:bg-[#1c1c1e] flex items-center justify-center text-white text-xs font-extrabold select-none bg-gradient-to-br from-slate-200 to-slate-300 dark:from-[#2c2c2e] dark:to-[#1c1c1e]">
              {keep.isOptimistic ? (
                <div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${fallbackGrad} flex items-center justify-center`}>
                  {domain.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* TITLE & LINK TEXT */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-sm">
                  {keep.title || domain}
                </span>
                {/* Pin icon next to title if true */}
                {keep.is_pinned && (
                  <span className="text-amber-500 animate-in zoom-in duration-200 flex-shrink-0" title="Başa Sabitlendi">
                    <Pin size={10} fill="currentColor" className="rotate-45" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <a 
                  href={keep.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-accent font-semibold truncate hover:underline"
                >
                  {domain}
                </a>
                {keep.reading_time_minutes && keep.reading_time_minutes > 0 && (
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-1 py-0.2 rounded-sm">
                    {keep.reading_time_minutes} dk
                  </span>
                )}
                {keep.reminder_at && (
                  <span 
                    className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${
                      keep.is_reminder_sent 
                        ? 'text-slate-400 dark:text-slate-500' 
                        : 'text-accent dark:text-accent/90 animate-pulse'
                    }`}
                    title={keep.is_reminder_sent ? "Alarm Gönderildi" : `Planlanan Alarm: ${new Date(keep.reminder_at).toLocaleString()}`}
                  >
                    <Bell size={10} fill={keep.is_reminder_sent ? "none" : "currentColor"} />
                    <span>Alarm</span>
                  </span>
                )}
              </div>
            </div>

            {/* Favorite heart badge next to title if true */}
            {keep.is_favorite && (
              <span className="text-rose-500 animate-in zoom-in duration-200 flex-shrink-0">
                <Heart size={10} fill="currentColor" />
              </span>
            )}
          </div>
        </td>

        {/* CATEGORY rozeti COLUMN */}
        <td className="py-3 px-4 align-middle">
          {keep.category_name ? (
            <span className="px-2 py-0.5 rounded-apple-sm text-[9px] font-bold bg-slate-100 dark:bg-[#1c1c1e] text-slate-500 dark:text-slate-400 border border-gray-100 dark:border-transparent">
              {keep.category_name}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 dark:text-slate-600 font-semibold italic">Genel</span>
          )}
        </td>

        {/* DATE ADDED COLUMN */}
        <td className="py-3 px-4 align-middle">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
            {new Date(keep.created_at).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </td>

        {/* HOVER ACTIONS COLUMN */}
        <td className="py-3 px-4 align-middle text-right pr-6">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             {/* Pin Toggle */}
            {!readOnly && (
              <PremiumFeature feature="pin">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin?.(keep.id, !keep.is_pinned);
                  }}
                  title={keep.is_pinned ? "Sabitlemeyi Kaldır" : "Başa Sabitle"}
                  className={`action-btn p-1.5 rounded-apple-sm transition-colors cursor-pointer ${
                    keep.is_pinned
                      ? 'text-amber-500 hover:text-amber-600 bg-amber-500/10'
                      : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-[#1c1c1e]'
                  }`}
                >
                  <Pin size={12} fill={keep.is_pinned ? "currentColor" : "none"} className={keep.is_pinned ? "rotate-45" : ""} />
                </button>
              </PremiumFeature>
            )}

            {/* Favorite Toggle */}
            {!readOnly && (
              <PremiumFeature feature="favorite">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.(keep.id, !keep.is_favorite);
                  }}
                  title={keep.is_favorite ? "Favorilerden Çıkar" : "Favoriye Ekle"}
                  className={`action-btn p-1.5 rounded-apple-sm transition-colors cursor-pointer ${
                    keep.is_favorite
                      ? 'text-rose-500 hover:text-rose-600 bg-rose-500/10'
                      : 'text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-[#1c1c1e]'
                  }`}
                >
                  <Heart size={12} fill={keep.is_favorite ? "currentColor" : "none"} />
                </button>
              </PremiumFeature>
            )}

            {/* Categorize */}
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(keep);
                }}
                title="Kategoriye Taşı"
                className="action-btn p-1.5 rounded-apple-sm text-slate-400 hover:text-accent hover:bg-slate-50 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer"
              >
                <Folder size={12} />
              </button>
            )}
            
            {/* Delete */}
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(keep.id);
                }}
                title="Sil"
                className="action-btn p-1.5 rounded-apple-sm text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // Fallback: Grid Card layout
  return (
    <div className="relative overflow-hidden rounded-apple-lg border border-gray-100 dark:border-[#1c1c1e] bg-white dark:bg-[#121212] select-none shadow-sm hover:shadow-md transition-shadow group">
      
      {/* CARD CONTENT LAYER */}
      <div
        onClick={handleCardClick}
        className="relative bg-white dark:bg-[#121212] p-3 flex items-center gap-3.5 cursor-pointer select-none"
      >
        {/* CHECKBOX SELECTION ELEMENT / MONOGRAM */}
        {readOnly ? (
          <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-[#1c1c1e] border border-gray-100 dark:border-transparent flex items-center justify-center text-slate-400 dark:text-slate-600 flex-shrink-0" title="Salt Okunur">
            <Lock size={14} />
          </div>
        ) : isSelectionMode || isSelected ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(keep.id);
            }}
            className={`action-btn w-9 h-9 rounded-full border-2 flex items-center justify-center text-white cursor-pointer flex-shrink-0 z-10 transition-all ${
              isSelected ? 'bg-accent border-accent' : 'border-slate-300 dark:border-[#2c2c2e] bg-slate-50 dark:bg-[#1c1c1e]'
            }`}
          >
            {isSelected && <Check size={16} strokeWidth={3} />}
          </div>
        ) : (
          <div className="relative group/check flex-shrink-0">
            {/* Show selection checkbox overlay on hover */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(keep.id);
              }}
              className="action-btn absolute inset-0 w-9 h-9 rounded-full bg-black/40 hover:bg-accent/80 opacity-0 group-hover/check:opacity-100 flex items-center justify-center text-white cursor-pointer z-10 transition-opacity"
            >
              <Check size={14} strokeWidth={3} />
            </div>
            
            {/* MONOGRAM BADGE (Site Icon) */}
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 relative shadow-xs bg-slate-50 dark:bg-[#1c1c1e] flex items-center justify-center text-white text-sm font-extrabold select-none">
              {keep.isOptimistic ? (
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${fallbackGrad} flex items-center justify-center`}>
                  {domain.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}


        {/* DETAILS SECTION */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate leading-tight max-w-[140px]">
              {keep.title || domain}
            </h3>
            {/* Inline status badges — no overlap with action bar */}
            {!isSelectionMode && keep.is_pinned && (
              <span
                className="inline-flex items-center px-1 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-500 dark:text-amber-400 flex-shrink-0"
                title="Başa Sabitlendi"
              >
                <Pin size={8} fill="currentColor" />
              </span>
            )}
            {!isSelectionMode && keep.is_favorite && (
              <span
                className="inline-flex items-center px-1 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-400 dark:text-rose-400 flex-shrink-0"
                title="Favorilerimde"
              >
                <Heart size={8} fill="currentColor" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
              {domain}
            </span>
            {keep.reading_time_minutes && keep.reading_time_minutes > 0 && (
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                {keep.reading_time_minutes} dk
              </span>
            )}
            {keep.reminder_at && (
              <>
                <span className="text-slate-300 dark:text-slate-700 text-[8px]">•</span>
                <span 
                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${
                    keep.is_reminder_sent 
                      ? 'text-slate-400 dark:text-slate-500' 
                      : 'text-accent dark:text-accent/90 animate-pulse'
                  }`}
                  title={keep.is_reminder_sent ? "Alarm Gönderildi" : `Planlanan Alarm: ${new Date(keep.reminder_at).toLocaleString()}`}
                >
                  <Bell size={10} fill={keep.is_reminder_sent ? "none" : "currentColor"} />
                  <span>Alarm</span>
                </span>
              </>
            )}
            {keep.category_name && (
              <>
                <span className="text-slate-300 dark:text-slate-700 text-[8px]">•</span>
                <span className="px-1.5 py-0.5 rounded-apple-sm text-[8px] font-bold bg-slate-50 dark:bg-[#1c1c1e] text-slate-500 dark:text-slate-400 border border-gray-100 dark:border-transparent">
                  {keep.category_name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* DESKTOP HOVER ACTIONS */}
        {!isSelectionMode && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#1a1a1a] pl-1.5 pr-1 py-1 rounded-apple-md border border-gray-200/60 dark:border-[#2c2c2e] shadow-sm pointer-events-auto">
            {/* Pin Toggle Button */}
            {!readOnly && (
              <PremiumFeature feature="pin">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin?.(keep.id, !keep.is_pinned);
                  }}
                  title={keep.is_pinned ? "Sabitlemeyi Kaldır" : "Başa Sabitle"}
                  className={`action-btn p-1.5 rounded-apple-sm transition-colors cursor-pointer ${
                    keep.is_pinned
                      ? 'text-amber-500 hover:text-amber-600 bg-amber-500/10'
                      : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-[#2c2c2e]'
                  }`}
                >
                  <Pin size={13} fill={keep.is_pinned ? "currentColor" : "none"} />
                </button>
              </PremiumFeature>
            )}

            {/* Favorite Toggle Button */}
            {!readOnly && (
              <PremiumFeature feature="favorite">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.(keep.id, !keep.is_favorite);
                  }}
                  title={keep.is_favorite ? "Favorilerden Çıkar" : "Favoriye Ekle"}
                  className={`action-btn p-1.5 rounded-apple-sm transition-colors cursor-pointer ${
                    keep.is_favorite
                      ? 'text-rose-500 hover:text-rose-600 bg-rose-500/10'
                      : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-[#2c2c2e]'
                  }`}
                >
                  <Heart size={13} fill={keep.is_favorite ? "currentColor" : "none"} />
                </button>
              </PremiumFeature>
            )}

            {/* Categorize button */}
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(keep);
                }}
                title="Kategoriye Taşı"
                className="action-btn p-1.5 rounded-apple-sm text-slate-400 hover:text-accent hover:bg-slate-100 dark:hover:bg-[#2c2c2e] transition-colors cursor-pointer"
              >
                <Folder size={13} />
              </button>
            )}
            
            {/* External website link */}
            <a
              href={keep.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Bağlantıyı Aç"
              onClick={(e) => e.stopPropagation()}
              className="action-btn p-1.5 rounded-apple-sm text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-[#2c2c2e] transition-colors"
            >
              <ExternalLink size={13} />
            </a>
            
            {/* Delete keep button */}
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(keep.id);
                }}
                title="Sil"
                className="action-btn p-1.5 rounded-apple-sm text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-[#2c2c2e] transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
});
