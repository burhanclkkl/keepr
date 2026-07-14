import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, FolderTree } from 'lucide-react';
import type { Category } from '../../hooks/useCategories';
import type { Keep } from '../../hooks/useKeeps';

interface BottomSheetProps {
  keep: Keep | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (categoryId: number | null) => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  keep,
  categories,
  isOpen,
  onClose,
  onSelectCategory,
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDragEnd = (_event: any, info: any) => {
    // If dragged down past 80px on mobile, close the sheet
    if (info.offset.y > 80) {
      onClose();
    }
  };

  if (!isOpen || !keep) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        
        {/* BACKDROP OVERLAY */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
        />

        {/* BOTTOM SHEET (MOBILE) */}
        {isMobile ? (
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-h-[85vh] bg-white dark:bg-[#121212] rounded-t-apple-xl border-t border-gray-100 dark:border-[#1c1c1e] shadow-2xl flex flex-col pointer-events-auto z-10"
          >
            {/* Drag Handle Bar */}
            <div className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-5 pb-3 border-b border-gray-100 dark:border-[#1c1c1e] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Kategoriye Taşı</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[280px]">
                  "{keep.title || keep.url}"
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-50 dark:bg-[#1c1c1e] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 pb-8">
              {/* Uncategorized (Genel) button */}
              <button
                onClick={() => onSelectCategory(null)}
                className={`w-full flex items-center justify-between p-3.5 rounded-apple-lg border text-sm font-semibold transition-all ${
                  keep.category_id === null
                    ? 'bg-accent/10 border-accent/20 text-accent dark:bg-accent/5 dark:border-accent/10'
                    : 'bg-slate-50 dark:bg-[#121212] border-gray-100 dark:border-[#1c1c1e] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c1c1e]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder size={18} className="text-slate-400" />
                  <span>Kategorisiz (Genel)</span>
                </div>
                {keep.category_id === null && <span className="text-xs">✓</span>}
              </button>

              {categories.filter(c => !c.parent_id).map((category) => {
                const subCats = categories.filter(sub => sub.parent_id === category.id);
                return (
                  <div key={category.id} className="space-y-1.5">
                    <button
                      onClick={() => onSelectCategory(category.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-apple-lg border text-sm font-semibold transition-all ${
                        keep.category_id === category.id
                          ? 'bg-accent/10 border-accent/20 text-accent dark:bg-accent/5 dark:border-accent/10'
                          : 'bg-slate-50 dark:bg-[#121212] border-gray-100 dark:border-[#1c1c1e] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c1c1e]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Folder size={18} className="text-slate-400" />
                        <span>{category.name}</span>
                      </div>
                      {keep.category_id === category.id && <span className="text-xs">✓</span>}
                    </button>
                    {subCats.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => onSelectCategory(sub.id)}
                        className={`w-full flex items-center justify-between p-3 pl-8 rounded-apple-lg border text-sm font-semibold transition-all ${
                          keep.category_id === sub.id
                            ? 'bg-accent/10 border-accent/20 text-accent dark:bg-accent/5 dark:border-accent/10'
                            : 'bg-slate-50/50 dark:bg-[#121212]/50 border-gray-100/50 dark:border-[#1c1c1e]/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FolderTree size={16} className="text-slate-400" />
                          <span>{sub.name}</span>
                        </div>
                        {keep.category_id === sub.id && <span className="text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          
          /* POPOVER / DIALOG (DESKTOP) */
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="glass w-full max-w-sm rounded-apple-xl border border-gray-100 dark:border-[#1c1c1e] shadow-2xl p-5 relative z-10"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100/50 dark:border-[#1c1c1e]/50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Kategori Seçin</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[250px] mt-0.5">
                  "{keep.title || keep.url}"
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              <button
                onClick={() => onSelectCategory(null)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-apple-md border text-xs font-semibold transition-all ${
                  keep.category_id === null
                    ? 'bg-accent/10 border-accent/20 text-accent dark:bg-accent/5 dark:border-accent/10'
                    : 'bg-transparent border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-[#1c1c1e]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder size={14} className="text-slate-400" />
                  <span>Kategorisiz (Genel)</span>
                </div>
                {keep.category_id === null && <span className="text-[10px]">✓</span>}
              </button>

              {categories.filter(c => !c.parent_id).map((category) => {
                const subCats = categories.filter(sub => sub.parent_id === category.id);
                return (
                  <div key={category.id} className="space-y-1">
                    <button
                      onClick={() => onSelectCategory(category.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-apple-md border text-xs font-semibold transition-all ${
                        keep.category_id === category.id
                          ? 'bg-accent/10 border-accent/20 text-accent dark:bg-accent/5 dark:border-accent/10'
                          : 'bg-transparent border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-[#1c1c1e]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Folder size={14} className="text-slate-400" />
                        <span>{category.name}</span>
                      </div>
                      {keep.category_id === category.id && <span className="text-[10px]">✓</span>}
                    </button>
                    {subCats.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => onSelectCategory(sub.id)}
                        className={`w-full flex items-center justify-between pl-7 pr-3 py-1.5 rounded-apple-md border text-[11px] font-semibold transition-all ${
                          keep.category_id === sub.id
                            ? 'bg-accent/10 border-accent/20 text-accent dark:bg-accent/5 dark:border-accent/10'
                            : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/30 dark:hover:bg-[#1c1c1e]/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <FolderTree size={12} className="text-slate-400" />
                          <span>{sub.name}</span>
                        </div>
                        {keep.category_id === sub.id && <span className="text-[9px]">✓</span>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};
