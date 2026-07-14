import React from 'react';
import { Settings } from 'lucide-react';
import type { Category } from '../../hooks/useCategories';
import { useAuth } from '../../context/AuthContext';
import appLogo from '../../assets/logo.png';

interface HeaderProps {
  categories: Category[];
  selectedCategoryId: number | string | null | undefined;
  onSelectCategory: (id: number | string | null | undefined) => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenSettings,
}) => {
  const { user } = useAuth();

  return (
    <header className="md:hidden border-b border-gray-100 dark:border-[#1c1c1e] bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3 flex flex-col gap-3">
      
      {/* Mobile Top Bar: User profile info & Settings */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {/* Stylized Logo for Mobile */}
          <img src={appLogo} alt="Keepr Logo" className="w-6 h-6 rounded shadow-xs flex-shrink-0 object-cover" />
          <div className="flex items-center min-w-0">
            <span className="font-black text-[10px] tracking-[0.2em] text-slate-800 dark:text-slate-200 uppercase">Keepr</span>
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1.5 border-l border-slate-200 dark:border-[#2c2c2e] pl-1.5 truncate">Dijital Havuz</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-500">@{user?.username}</span>
          {user?.subscription_type === 'pro' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-accent/10 text-accent border border-accent/20 uppercase ml-1.5">
              PRO
            </span>
          )}
          {user?.subscription_type === 'team' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-violet-500/10 text-violet-500 border border-violet-500/20 uppercase ml-1.5">
              TEAM
            </span>
          )}
          <div className="w-7 h-7 rounded-full bg-accent text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-full bg-slate-50 dark:bg-[#1c1c1e] text-slate-400 hover:text-accent transition-colors cursor-pointer"
            title="Ayarlar"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* MOBILE HORIZONTAL CATEGORY SLIDER */}
      <div className="overflow-x-auto flex gap-1.5 py-1 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* All categories pill */}
        <button
          onClick={() => onSelectCategory(undefined)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border shrink-0 cursor-pointer ${
            selectedCategoryId === undefined
              ? 'bg-accent border-accent text-white shadow-sm shadow-accent/20'
              : 'bg-slate-50 dark:bg-[#1c1c1e] border-slate-100 dark:border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          Tümü
        </button>

        {/* Uncategorized category pill */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border shrink-0 cursor-pointer ${
            selectedCategoryId === null
              ? 'bg-accent border-accent text-white shadow-sm shadow-accent/20'
              : 'bg-slate-50 dark:bg-[#1c1c1e] border-slate-100 dark:border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          Kategorisiz
        </button>

        {/* Favorites category pill */}
        <button
          onClick={() => onSelectCategory('favorites')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border shrink-0 cursor-pointer ${
            selectedCategoryId === 'favorites'
              ? 'bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/20'
              : 'bg-slate-50 dark:bg-[#1c1c1e] border-slate-100 dark:border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          Favoriler
        </button>

        {/* Categories pill list */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border shrink-0 cursor-pointer ${
              selectedCategoryId === category.id
                ? 'bg-accent border-accent text-white shadow-sm shadow-accent/20'
                : 'bg-slate-50 dark:bg-[#1c1c1e] border-slate-100 dark:border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

    </header>
  );
};
