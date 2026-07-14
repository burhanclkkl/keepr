import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { Search, Clock, ExternalLink, Sparkles, FolderOpen, AlertTriangle, Moon, Sun, ChevronDown, ChevronRight } from 'lucide-react';
import appLogo from '../../assets/logo.png';

interface SharedKeep {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  reading_time_minutes: number | null;
  created_at: string;
}

interface SharedCategory {
  id: number;
  name: string;
  icon: string | null;
  username: string;
}

interface SharedSubcategory {
  id: number;
  name: string;
  icon: string | null;
  keeps: SharedKeep[];
}

interface SharedCollectionViewProps {
  slug: string;
}

export const SharedCollectionView: React.FC<SharedCollectionViewProps> = ({ slug }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<SharedCategory | null>(null);
  const [keeps, setKeeps] = useState<SharedKeep[]>([]);
  const [subcategories, setSubcategories] = useState<SharedSubcategory[]>([]);
  const [expandedSubs, setExpandedSubs] = useState<Record<number, boolean>>({});
  const [searchVal, setSearchVal] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Sync with HTML class if already applied, or localStorage
    const saved = localStorage.getItem('keepr_user_prefs');
    if (saved) {
      try {
        return JSON.parse(saved).theme_mode === 'dark';
      } catch {
        return false;
      }
    }
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const fetchSharedData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/categories/shared/${slug}`);
        setCategory(response.data.category);
        setKeeps(response.data.keeps);
        setSubcategories(response.data.subcategories || []);
        // SEO: Set dynamic page title
        if (response.data.category?.name) {
          document.title = `${response.data.category.name} - Keepr Paylaşılan Koleksiyon`;
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Koleksiyon yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchSharedData();
  }, [slug]);

  // Dark Mode Toggle helper
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const getDomain = (urlStr: string) => {
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname.replace('www.', '');
    } catch {
      return urlStr;
    }
  };

  const filteredKeeps = useMemo(() => {
    if (!searchVal.trim()) return keeps;
    const query = searchVal.toLowerCase();
    return keeps.filter(
      (k) =>
        (k.title && k.title.toLowerCase().includes(query)) ||
        (k.description && k.description.toLowerCase().includes(query)) ||
        k.url.toLowerCase().includes(query)
    );
  }, [keeps, searchVal]);

  const filteredSubcategories = useMemo(() => {
    if (!searchVal.trim()) return subcategories;
    const query = searchVal.toLowerCase();
    return subcategories.map(sub => ({
      ...sub,
      keeps: sub.keeps.filter(k =>
        (k.title && k.title.toLowerCase().includes(query)) ||
        (k.description && k.description.toLowerCase().includes(query)) ||
        k.url.toLowerCase().includes(query)
      )
    })).filter(sub => sub.keeps.length > 0);
  }, [subcategories, searchVal]);

  const renderKeepCard = (keep: SharedKeep) => (
    <div
      key={keep.id}
      className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1e] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:translate-y-[-2px] hover:shadow-md hover:border-slate-200 dark:hover:border-[#2a2a2f] transition-all duration-200 group animate-in fade-in duration-200"
    >
      <div className="p-5 flex flex-col gap-3">
        {keep.image_url && (
          <div className="w-full h-32 rounded-xl overflow-hidden mb-1 flex-shrink-0 bg-slate-50 dark:bg-[#1c1c1e] relative">
            <img src={keep.image_url} alt={keep.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        )}
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
            {getDomain(keep.url)}
          </span>
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-accent transition-colors line-clamp-2">
            {keep.title || keep.url}
          </h3>
          {keep.description && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed line-clamp-2">
              {keep.description}
            </p>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-slate-50 dark:border-[#1c1c1e]/60 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          {keep.reading_time_minutes && keep.reading_time_minutes > 0 ? (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {keep.reading_time_minutes} dk okuma
            </span>
          ) : null}
        </div>
        <a
          href={keep.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent-hover transition-colors select-none no-underline cursor-pointer"
        >
          Git <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] select-none">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 dark:border-[#1c1c1e] border-t-accent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Koleksiyon Yükleniyor</span>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] px-6 select-none">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shadow-sm">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Koleksiyon Bulunamadı</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            {error || 'Erişmeye çalıştığınız koleksiyon mevcut değil veya paylaşımı kapatılmış olabilir.'}
          </p>
          <a
            href="/"
            className="mt-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl shadow-md shadow-accent/15 transition-all select-none no-underline"
          >
            Ana Sayfaya Dön
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex flex-col select-none">
      
      {/* Premium Header Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-slate-100 dark:border-[#1c1c1e] px-4 md:px-8 py-3.5 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <img src={appLogo} alt="Keepr Logo" className="w-8 h-8 rounded-xl shadow-md object-cover flex-shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-black text-xs tracking-[0.2em] text-slate-800 dark:text-slate-200 uppercase">Keepr</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider bg-accent/10 text-accent uppercase">SHARED</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Paylaşılan Koleksiyon</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Dark Mode toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer"
            title={isDarkMode ? 'Açık Mod' : 'Karanlık Mod'}
          >
            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-md shadow-accent/15 transition-all select-none no-underline"
          >
            Keepr'ı Dene
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
        
        {/* Banner Details */}
        <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1e] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
              <FolderOpen size={22} />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <h1 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none truncate pr-1">
                {category.name}
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Oluşturan: <span className="text-slate-600 dark:text-slate-300 font-bold">@{category.username}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-[#2a2a2f] rounded-2xl px-3 py-1.5">
              {keeps.length} Bağlantı
            </span>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-4 text-slate-400" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Bu koleksiyonda ara..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1e] rounded-2xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-accent transition-all"
          />
        </div>

        {/* Keeps Grid */}
        {filteredKeeps.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredKeeps.map(renderKeepCard)}
          </div>
        )}

        {/* Subcategories (Hierarchical Accordions) */}
        {filteredSubcategories.length > 0 && (
          <div className="flex flex-col gap-4 mt-4">
            <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 mt-2">
              Alt Klasörler
            </h2>
            {filteredSubcategories.map((sub) => {
              const isExpanded = expandedSubs[sub.id] !== false;
              return (
                <div
                  key={sub.id}
                  className="border border-slate-100 dark:border-[#1c1c1e] rounded-3xl bg-white dark:bg-[#121212] overflow-hidden shadow-sm transition-all duration-200"
                >
                  <button
                    onClick={() => setExpandedSubs(prev => ({ ...prev, [sub.id]: !isExpanded }))}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#1c1c1e]/20 transition-colors cursor-pointer text-left border-none bg-transparent"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-accent/5 dark:bg-accent/10 flex items-center justify-center text-accent">
                        <FolderOpen size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {sub.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                          {sub.keeps.length} bağlantı
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-400">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="p-6 border-t border-slate-50 dark:border-[#1c1c1e]/60 bg-slate-50/20 dark:bg-[#121212]/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sub.keeps.map(renderKeepCard)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filteredKeeps.length === 0 && filteredSubcategories.length === 0 && (
          <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1e] rounded-3xl p-12 text-center flex flex-col items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-[#1c1c1e] text-slate-400 flex items-center justify-center">
              <FolderOpen size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Koleksiyon Boş</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
              Bu koleksiyonda henüz gösterilecek bağlantı bulunmuyor veya aramanızla eşleşen sonuç bulunamadı.
            </p>
          </div>
        )}

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-accent to-accent-hover rounded-3xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg shadow-accent/15 mt-4 select-none">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles size={18} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold">Sekmelerinizde Kaybolmayın!</h3>
              <p className="text-xs text-white/80 leading-relaxed max-w-md">
                Bunu sonra okurum diyerek tarayıcı sekmelerini şişirmek yerine linklerinizi Keepr kütüphanenizde güvenle saklayın, alarm kurun ve organize edin.
              </p>
            </div>
          </div>
          <a
            href="/"
            className="px-5 py-3 bg-white hover:bg-slate-50 text-accent text-xs font-bold rounded-2xl shadow-md transition-all select-none no-underline text-center flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            Ücretsiz Kaydol
            <ExternalLink size={12} className="mt-[-1px]" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-[#1c1c1e] py-6 px-4 md:px-8 text-center bg-white dark:bg-[#0a0a0a] transition-colors mt-auto">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          &copy; 2026 Keepr. Tüm Hakları Saklıdır.
        </p>
      </footer>
    </div>
  );
};
