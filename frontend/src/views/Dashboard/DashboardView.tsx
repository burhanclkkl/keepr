import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { AddKeepBar } from '../../components/keeps/AddKeepBar';
import { KeepCard } from '../../components/keeps/KeepCard';
import { SettingsModal } from '../../components/settings/SettingsModal';
import { BottomSheet } from '../../components/keeps/BottomSheet';
import { Inspector } from '../../components/keeps/Inspector';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ClipboardDetect } from '../../components/ui/ClipboardDetect';
import { useCategories, useShareCategory } from '../../hooks/useCategories';
import type { Category } from '../../hooks/useCategories';
import { useKeeps, useCreateKeep, useDeleteKeep, useUpdateKeep, useBulkMoveKeeps, useBulkFavoriteKeeps, useBulkPinKeeps } from '../../hooks/useKeeps';
import type { Keep } from '../../hooks/useKeeps';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useProModal } from '../../context/ProModalContext';
import { useKeepKeyboardShortcuts } from '../../hooks/useKeepKeyboardShortcuts';
import { Bookmark, Search, Clock, ArrowUpDown, ChevronDown, Check, Trash2, Heart, Folder, X, Share2, Users, User, Link as LinkIcon, Pin } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../services/api';
import { OnboardingModal } from '../../components/ui/OnboardingModal';

interface DropdownOption<T> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

function DropdownSelect<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (val: T) => void;
  options: DropdownOption<T>[];
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find((opt) => opt.id === value) || options[0];
  const SelectedIcon = selectedOption?.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-[#1c1c1e] hover:bg-slate-100 dark:hover:bg-[#252529] text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-apple-md border border-gray-200/40 dark:border-transparent transition-colors focus:outline-none cursor-pointer select-none"
      >
        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}:</span>
        {SelectedIcon && <SelectedIcon size={12} className="text-slate-500 dark:text-slate-400" />}
        <span>{selectedOption?.label}</span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-[#2a2a2e] rounded-apple-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-100 focus:outline-none">
          {options.map((opt) => {
            const OptIcon = opt.icon;
            const isSelected = opt.id === value;
            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-[#252529] cursor-pointer ${
                  isSelected ? 'text-accent font-bold' : 'text-slate-600 dark:text-slate-400 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  {OptIcon && <OptIcon size={12} className={isSelected ? 'text-accent' : 'text-slate-400'} />}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={12} className="text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const DashboardView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { openProModal } = useProModal();
  const queryClient = useQueryClient();
  
  // State for search and category filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | string | null | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Bulk selection states
  const [selectedKeepIds, setSelectedKeepIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sharing states
  const [shareCat, setShareCat] = useState<Category | null>(null);
  const shareCategoryMutation = useShareCategory();

  // Collaborator States
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  // 1. Fetch Categories
  const { data: categories = [] } = useCategories();

  const isSelectedCategoryViewerOnly = useMemo(() => {
    if (typeof selectedCategoryId !== 'number') return false;
    const cat = categories.find(c => c.id === selectedCategoryId);
    return cat?.collaborator_role === 'viewer';
  }, [selectedCategoryId, categories]);

  const isKeepReadOnly = useCallback((keep: Keep) => {
    if (keep.user_id === user?.id) return false;
    if (!keep.category_id) return false;
    const cat = categories.find(c => c.id === keep.category_id);
    return cat?.collaborator_role === 'viewer';
  }, [categories, user]);

  // 2. Fetch Unfiltered Keeps to compute Category Badge counts accurately
  const { data: allKeeps = [] } = useKeeps();

  // 3. Fetch Filtered Keeps for the primary feed
  const keepsParams = useMemo(() => ({
    category_id: selectedCategoryId,
    search: searchQuery,
  }), [selectedCategoryId, searchQuery]);

  const { data: keeps = [], isLoading: isKeepsLoading } = useKeeps(keepsParams);

  // Clear selections when changing categories
  useEffect(() => {
    setSelectedKeepIds([]);
    setIsSelectionMode(false);
  }, [selectedCategoryId]);

  // Auto-accept pending collaborative invitation if present
  useEffect(() => {
    const pendingToken = localStorage.getItem('pending_invite_token');
    if (pendingToken && user) {
      const acceptPending = async () => {
        try {
          await api.post(`/api/invite/${pendingToken}/accept`);
          showToast('Ortak çalışma daveti başarıyla kabul edildi! 🎉', 'success');
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        } catch (err: any) {
          const errorMsg = err.response?.data?.error || 'Bekleyen davet kabul edilemedi.';
          showToast(errorMsg, 'error');
        } finally {
          localStorage.removeItem('pending_invite_token');
        }
      };
      acceptPending();
    }
  }, [user, showToast, queryClient]);

  // Fetch Category Collaborators when opening Share Modal
  useEffect(() => {
    if (shareCat) {
      setGeneratedLink('');
      setInviteRole('viewer');
      
      const fetchCollaborators = async () => {
        try {
          setLoadingCollabs(true);
          const response = await api.get(`/api/collaborators/category/${shareCat.id}`);
          setCollaborators(response.data);
        } catch (err) {
          console.error('Error fetching collaborators:', err);
        } finally {
          setLoadingCollabs(false);
        }
      };
      fetchCollaborators();
    } else {
      setCollaborators([]);
    }
  }, [shareCat]);

  const handleCreateCollabInvite = async () => {
    if (!shareCat) return;
    try {
      setGeneratingLink(true);
      const response = await api.post('/api/invite', {
        category_id: shareCat.id,
        role: inviteRole
      });
      const inviteUrl = `${window.location.origin}/invite/${response.data.token}`;
      setGeneratedLink(inviteUrl);
      showToast('Davet bağlantısı başarıyla oluşturuldu.', 'success');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Davet bağlantısı oluşturulamadı.';
      showToast(errorMsg, 'error');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleRemoveCollaborator = async (collabId: number) => {
    try {
      await api.delete(`/api/collaborators/${collabId}`);
      showToast('Klasör ortağı başarıyla çıkarıldı.', 'success');
      setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
    } catch (err) {
      showToast('Ortağı çıkarırken bir hata oluştu.', 'error');
    }
  };

  const handleToggleSelect = useCallback((id: number) => {
    const keep = keeps.find(k => k.id === id);
    if (keep && isKeepReadOnly(keep)) {
      showToast('Salt okunur bağlantılar üzerinde toplu işlem yapılamaz.', 'error');
      return;
    }
    setSelectedKeepIds((prev) => {
      const isAlreadySelected = prev.includes(id);
      let updated;
      if (isAlreadySelected) {
        updated = prev.filter((item) => item !== id);
      } else {
        updated = [...prev, id];
      }
      setIsSelectionMode(updated.length > 0);
      return updated;
    });
  }, [keeps, isKeepReadOnly, showToast]);

  const handleBulkDelete = () => {
    if (selectedKeepIds.length === 0) return;
    setDeleteConfirmOpen(true);
  };

  const executeBulkDelete = async () => {
    setDeleteConfirmOpen(false);
    try {
      await api.post('/api/keeps/bulk-delete', { ids: selectedKeepIds });
      showToast(`${selectedKeepIds.length} bağlantı başarıyla silindi.`);
      
      // Invalidate keeps queries to update dashboard and category counters
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
      
      setSelectedKeepIds([]);
      setIsSelectionMode(false);
    } catch (err) {
      showToast('Toplu silme sırasında hata oluştu.', 'error');
    }
  };
  
  // Local Search states for toolbar input
  const [searchVal, setSearchVal] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Modal/Inspector UI States
  const [moveKeep, setMoveKeep] = useState<Keep | null>(null);
  const [inspectKeep, setInspectKeep] = useState<Keep | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [clipboardUrl, setClipboardUrl] = useState<string>('');

  // Check if onboarding is pending on mount
  useEffect(() => {
    if (localStorage.getItem('keepr_onboarding_pending') === '1') {
      setShowOnboarding(true);
    }
  }, []);

  // Sorting State
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical-asc' | 'alphabetical-desc'>('newest');

  // 300ms Debouncer for toolbar search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchVal]);

  // Command+K / Ctrl+K keyboard shortcut listener for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard shortcuts integration when a keep is inspected
  useKeepKeyboardShortcuts({
    isActive: inspectKeep !== null,
    onFavorite: () => {
      if (inspectKeep) {
        handleToggleFavorite(inspectKeep.id, !inspectKeep.is_favorite);
      }
    },
    onPin: () => {
      if (inspectKeep) {
        handleTogglePin(inspectKeep.id, !inspectKeep.is_pinned);
      }
    },
    onAlarm: () => {
      if (inspectKeep) {
        // Toggle the alarm date/time picker (open modal or show warning for free users)
        if (!user?.is_pro) {
          openProModal('reminder');
        } else {
          showToast('Bu özellik yakında aktif edilecektir.', 'info');
        }
      }
    },
    onDelete: () => {
      if (inspectKeep) {
        handleDeleteKeep(inspectKeep.id);
      }
    },
    onEscape: () => {
      setInspectKeep(null);
    }
  });



  const getDomain = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  };




  // Mutations
  const createKeepMutation = useCreateKeep(keepsParams);
  const deleteKeepMutation = useDeleteKeep(keepsParams);
  const updateKeepMutation = useUpdateKeep(keepsParams);
  const bulkMoveMutation = useBulkMoveKeeps();
  const bulkFavoriteMutation = useBulkFavoriteKeeps();
  const bulkPinMutation = useBulkPinKeeps();

  // Locally sorted keeps
  const processedKeeps = useMemo(() => {
    let result = [...keeps];
    
    // Sorting logic
    result.sort((a, b) => {
      // Pinned keeps always come first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      const titleA = (a.title || getDomain(a.url)).toLowerCase();
      const titleB = (b.title || getDomain(b.url)).toLowerCase();
      if (sortBy === 'alphabetical-asc') {
        return titleA.localeCompare(titleB, 'tr-TR');
      }
      if (sortBy === 'alphabetical-desc') {
        return titleB.localeCompare(titleA, 'tr-TR');
      }
      return 0;
    });
    
    return result;
  }, [keeps, sortBy]);

  // Memoized Category counts computing
  const keepCounts = useMemo(() => {
    const counts: Record<number | string, number> = {
      all: 0,
      uncategorized: 0,
      favorites: 0,
    };
    
    allKeeps.forEach((keep) => {
      counts.all += 1;
      if (keep.is_favorite) {
        counts.favorites += 1;
      }
      if (keep.category_id === null) {
        counts.uncategorized += 1;
      } else {
        counts[keep.category_id] = (counts[keep.category_id] || 0) + 1;
      }
    });
    
    return counts;
  }, [allKeeps]);

  // Handlers
  const handleAddKeep = async (url: string, title?: string, description?: string) => {
    try {
      await createKeepMutation.mutateAsync({
        url,
        title,
        description,
        category_id: (selectedCategoryId !== undefined && selectedCategoryId !== 'favorites') ? (selectedCategoryId as number | null) : null,
      });
      showToast('Bağlantı başarıyla eklendi.');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Bağlantı eklenirken bir hata oluştu.';
      showToast(errMsg, 'error');
    }
  };

  const handleDeleteKeep = useCallback(async (id: number) => {
    try {
      await deleteKeepMutation.mutateAsync(id);
      showToast('Bağlantı silindi.');
      setInspectKeep(prev => prev?.id === id ? null : prev);
    } catch (err) {
      showToast('Bağlantı silinirken bir hata oluştu.', 'error');
    }
  }, [deleteKeepMutation, showToast]);

  const handleSelectCategoryForKeep = async (newCategoryId: number | null) => {
    if (!moveKeep) return;
    
    if (moveKeep.id === -999) {
      // Bulk Move
      try {
        await bulkMoveMutation.mutateAsync({
          ids: selectedKeepIds,
          categoryId: newCategoryId
        });
        showToast('Seçili bağlantılar başarıyla taşındı.');
        setSelectedKeepIds([]);
        setIsSelectionMode(false);
      } catch (err) {
        showToast('Toplu taşıma işlemi sırasında hata oluştu.', 'error');
      } finally {
        setMoveKeep(null);
      }
      return;
    }
    
    try {
      await updateKeepMutation.mutateAsync({
        id: moveKeep.id,
        data: { category_id: newCategoryId },
      });
      
      const categoryName = newCategoryId 
        ? categories.find(c => c.id === newCategoryId)?.name || 'kategori' 
        : 'Genel';
        
      showToast(`Bağlantı "${categoryName}" kategorisine taşındı.`);
      
      // Update local inspect state if active
      if (inspectKeep?.id === moveKeep.id) {
        setInspectKeep(prev => prev ? { ...prev, category_id: newCategoryId } : null);
      }
    } catch (err) {
      showToast('Kategori güncellenirken hata oluştu.', 'error');
    } finally {
      setMoveKeep(null);
    }
  };

  const handleToggleFavorite = useCallback(async (id: number, isFavorite: boolean) => {
    try {
      await updateKeepMutation.mutateAsync({
        id,
        data: { is_favorite: isFavorite }
      });
      showToast(isFavorite ? 'Bağlantı favorilere eklendi.' : 'Bağlantı favorilerden çıkarıldı.');
      setInspectKeep(prev => prev?.id === id ? { ...prev, is_favorite: isFavorite } : prev);
    } catch (err) {
      showToast('Favori durumu güncellenirken hata oluştu.', 'error');
    }
  }, [updateKeepMutation, showToast]);

  const handleTogglePin = useCallback(async (id: number, isPinned: boolean) => {
    try {
      await updateKeepMutation.mutateAsync({
        id,
        data: { is_pinned: isPinned }
      });
      showToast(isPinned ? 'Bağlantı başa sabitlendi.' : 'Bağlantı sabitlemesi kaldırıldı.');
      setInspectKeep(prev => prev?.id === id ? { ...prev, is_pinned: isPinned } : prev);
    } catch (err) {
      showToast('Sabitleme durumu güncellenirken hata oluştu.', 'error');
    }
  }, [updateKeepMutation, showToast]);

  const handleBulkFavorite = async (isFavorite: boolean) => {
    // If not pro, open upgrade modal instead of API call
    if (!user?.is_pro) {
      openProModal('favorite');
      return;
    }
    try {
      await bulkFavoriteMutation.mutateAsync({
        ids: selectedKeepIds,
        isFavorite
      });
      showToast(isFavorite ? 'Seçili bağlantılar favorilere eklendi.' : 'Seçili bağlantılar favorilerden çıkarıldı.');
      setSelectedKeepIds([]);
      setIsSelectionMode(false);
    } catch (err) {
      showToast('Toplu işlem sırasında hata oluştu.', 'error');
    }
  };

  const handleBulkPin = async (isPinned: boolean) => {
    if (!user?.is_pro) {
      openProModal('pin');
      return;
    }
    try {
      await bulkPinMutation.mutateAsync({
        ids: selectedKeepIds,
        isPinned
      });
      showToast(isPinned ? 'Seçili bağlantılar başa sabitlendi.' : 'Seçili bağlantıların sabitlemesi kaldırıldı.');
      setSelectedKeepIds([]);
      setIsSelectionMode(false);
    } catch (err) {
      showToast('Toplu işlem sırasında hata oluştu.', 'error');
    }
  };

  const handleUpdateKeepMetadata = async (id: number, data: { title: string; description: string }) => {
    try {
      const updated = await updateKeepMutation.mutateAsync({ id, data });
      showToast('Değişiklikler kaydedildi.');
      // Refresh inspector details with updated data
      setInspectKeep(updated);
    } catch (err) {
      showToast('Güncelleme sırasında hata oluştu.', 'error');
      throw err;
    }
  };

  // Get active category title for display
  const activeCategoryTitle = useMemo(() => {
    if (selectedCategoryId === undefined) return 'Tüm Bağlantılar';
    if (selectedCategoryId === null) return 'Kategorisiz (Genel)';
    if (selectedCategoryId === 'favorites') return 'Favorilerim';
    return categories.find(c => c.id === selectedCategoryId)?.name || 'Kategori';
  }, [selectedCategoryId, categories]);

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] dark:bg-[#0a0a0a]">
      
      {/* SIDEBAR NAVIGATION (Desktop only) */}
      <div className="hidden md:block">
        <Sidebar
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          keepCounts={keepCounts}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onShareCategory={(cat) => setShareCat(cat)}
        />
      </div>

      {/* PRIMARY MAIN DASHBOARD PANEL */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* HEADER BAR */}
        <Header
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* FEED INNER CONTAINER */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          
          {/* LINK INGESTION BAR */}
          <div className="max-w-3xl">
            {isSelectedCategoryViewerOnly ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 rounded-apple-xl border border-violet-500/20 text-xs font-semibold">
                <span className="text-[10px] font-black tracking-wider bg-violet-500 text-white px-2 py-0.5 rounded-md uppercase">
                  Sadece İzleyici
                </span>
                Bu ortak klasörde salt okunur (viewer) yetkiniz bulunmaktadır. Yeni bağlantı eklenemez.
              </div>
            ) : (
              <AddKeepBar onAdd={handleAddKeep} isLoading={createKeepMutation.isPending} initialUrl={clipboardUrl} />
            )}
          </div>

          {/* ACTIVE SECTION TITLE */}
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base tracking-tight text-slate-800 dark:text-slate-200">
              {activeCategoryTitle}
            </h2>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-white dark:bg-[#121212] px-2 py-1 rounded-apple-sm border border-gray-100 dark:border-[#1c1c1e] shadow-sm">
              {processedKeeps.length} Adet
            </span>
          </div>

          {/* UNIFIED CONTROL TOOLBAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121212] p-3 rounded-apple-xl border border-gray-100 dark:border-[#1c1c1e] shadow-xs select-none">
            
            {/* Search Input on the Left */}
            <div className="relative flex-1 max-w-md w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search size={14} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Bağlantılarda ara (⌘K)..."
                className="w-full pl-9 pr-12 py-1.5 bg-slate-50 dark:bg-[#1c1c1e] border border-transparent rounded-apple-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-[#121212] focus:border-accent/50 transition-all shadow-inner"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none select-none">
                <kbd className="hidden sm:inline-block text-[8px] font-bold text-slate-400 bg-white dark:bg-[#121212] px-1.5 py-0.5 rounded border border-slate-200/10">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Custom Select Dropdowns on the Right */}
            <div className="flex items-center gap-3 self-end md:self-auto w-full md:w-auto justify-between md:justify-end">
              
              {/* Sırala Dropdown */}
              <DropdownSelect
                label="Sırala"
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                options={[
                  { id: 'newest', label: 'En Yeni', icon: Clock },
                  { id: 'oldest', label: 'En Eski', icon: Clock },
                  { id: 'alphabetical-asc', label: 'A - Z', icon: ArrowUpDown },
                  { id: 'alphabetical-desc', label: 'Z - A', icon: ArrowUpDown },
                ]}
              />

              {/* Seçim Modu Button */}
              <button
                type="button"
                onClick={() => {
                  if (isSelectionMode) {
                    setSelectedKeepIds([]);
                    setIsSelectionMode(false);
                  } else {
                    setIsSelectionMode(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-apple-md text-xs font-semibold border transition-all focus:outline-none cursor-pointer select-none ${
                  isSelectionMode
                    ? 'bg-accent/10 border-accent/20 text-accent font-bold'
                    : 'bg-slate-50 dark:bg-[#1c1c1e] hover:bg-slate-100 dark:hover:bg-[#252529] text-slate-700 dark:text-slate-300 border-gray-200/40 dark:border-transparent'
                }`}
              >
                <Check size={12} className={isSelectionMode ? 'text-accent' : 'text-slate-400'} />
                <span>{isSelectionMode ? 'Seçimi Kapat' : 'Toplu Seç'}</span>
              </button>

            </div>
          </div>

          {/* CARDS DISPLAY OR SKELETON LOADERS */}
          {isKeepsLoading ? (
            user?.view_layout === 'list' ? (
              <div className="border border-gray-100 dark:border-[#1c1c1e] rounded-apple-xl bg-white dark:bg-[#121212] overflow-hidden shadow-xs select-none">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 border-b border-gray-100 dark:border-[#1c1c1e] flex items-center justify-between px-4 animate-pulse">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1c1c1e]" />
                      <div className="space-y-1.5 flex-1 max-w-sm">
                        <div className="h-3.5 bg-slate-100 dark:bg-[#1c1c1e] rounded w-3/4" />
                        <div className="h-3 bg-slate-50 dark:bg-[#18181a] rounded w-1/2" />
                      </div>
                    </div>
                    <div className="w-24 h-4 bg-slate-100 dark:bg-[#1c1c1e] rounded mr-12" />
                    <div className="w-28 h-4 bg-slate-50 dark:bg-[#18181a] rounded mr-12" />
                    <div className="w-32 h-6 bg-slate-100 dark:bg-[#1c1c1e] rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            )
          ) : processedKeeps.length > 0 ? (
            user?.view_layout === 'list' ? (
              <div className="overflow-x-auto bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-apple-xl shadow-xs select-none">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-[#1c1c1e] bg-slate-50/50 dark:bg-[#1c1c1e]/25 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <th className="py-3.5 px-4 w-12 text-center">Seç</th>
                      <th className="py-3.5 px-4">Başlık / Bağlantı</th>
                      <th className="py-3.5 px-4 w-40">Kategori</th>
                      <th className="py-3.5 px-4 w-44">Tarih</th>
                      <th className="py-3.5 px-4 w-32 text-right pr-6">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1c1c1e]">
                    {processedKeeps.map((keep) => (
                      <KeepCard
                        key={keep.id}
                        keep={keep}
                        viewLayout="list"
                        onDelete={handleDeleteKeep}
                        onMove={setMoveKeep}
                        onSelect={setInspectKeep}
                        onToggleFavorite={handleToggleFavorite}
                        onTogglePin={handleTogglePin}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedKeepIds.includes(keep.id)}
                        onToggleSelect={handleToggleSelect}
                        readOnly={isKeepReadOnly(keep)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedKeeps.map((keep) => (
                  <KeepCard
                    key={keep.id}
                    keep={keep}
                    viewLayout="grid"
                    onDelete={handleDeleteKeep}
                    onMove={setMoveKeep}
                    onSelect={setInspectKeep}
                    onToggleFavorite={handleToggleFavorite}
                    onTogglePin={handleTogglePin}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedKeepIds.includes(keep.id)}
                    onToggleSelect={handleToggleSelect}
                    readOnly={isKeepReadOnly(keep)}
                  />
                ))}
              </div>
            )
          ) : (
            
            /* DYNAMIC EMPTY STATE WRAPPERS */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-[#121212] rounded-apple-xl border border-gray-100 dark:border-[#1c1c1e] shadow-xs max-w-xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 flex items-center justify-center">
                {searchQuery ? <Search size={22} /> : <Bookmark size={22} />}
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {searchQuery ? 'Eşleşen Bağlantı Bulunamadı' : 'Burası Çok Sessiz...'}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
                  {searchQuery 
                    ? `"${searchQuery}" kelimesiyle eşleşen başlık, açıklama veya bağlantı adresi bulunamadı.` 
                    : 'Henüz bu kategoriye bir bağlantı kaydetmemişsiniz. Sayfanın üstündeki alandan hemen bir tane ekleyin.'}
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* DRAWER AND DIALOG BINDINGS */}
      {/* Category Selection Modal Sheet */}
      <BottomSheet
        keep={moveKeep}
        categories={categories}
        isOpen={moveKeep !== null}
        onClose={() => setMoveKeep(null)}
        onSelectCategory={handleSelectCategoryForKeep}
      />

      {/* Keep Details Editor/Viewer Inspector Sidebar */}
      <Inspector
        keep={inspectKeep}
        isOpen={inspectKeep !== null}
        onClose={() => setInspectKeep(null)}
        onUpdate={handleUpdateKeepMetadata}
        onRefreshKeep={setInspectKeep}
        readOnly={inspectKeep ? isKeepReadOnly(inspectKeep) : false}
      />

      {/* FLOATING BULK ACTIONS TOOLBAR */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ y: 80, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 80, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 glass border border-slate-200/50 dark:border-[#1c1c1e] shadow-2xl rounded-apple-xl px-5 py-3.5 flex items-center gap-6 z-40"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                {selectedKeepIds.length}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Bağlantı Seçildi
              </span>
            </div>
            
            <div className="h-4 w-px bg-slate-200 dark:bg-[#1c1c1e]" />
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  const writeableIds = processedKeeps.filter(k => !isKeepReadOnly(k)).map(k => k.id);
                  if (writeableIds.length === 0) {
                    showToast('Seçilebilecek yazılabilir bağlantı bulunamadı.', 'info');
                    return;
                  }
                  setSelectedKeepIds(writeableIds);
                }}
                className="action-btn text-xs font-semibold text-slate-500 hover:text-accent transition-colors cursor-pointer"
              >
                Tümünü Seç
              </button>
              <button
                onClick={() => {
                  setSelectedKeepIds([]);
                  setIsSelectionMode(false);
                }}
                className="action-btn text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Temizle
              </button>
              <button
                onClick={() => setMoveKeep({
                  id: -999,
                  url: 'bulk',
                  title: 'Seçili Bağlantılar',
                  description: '',
                  category_id: null,
                  category_name: null,
                  user_id: 0,
                  is_favorite: false,
                  is_pinned: false,
                  created_at: '',
                  updated_at: ''
                })}
                className="action-btn px-3 py-1.5 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-apple-md border border-slate-200/30 dark:border-transparent transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Folder size={11} className="text-accent" />
                <span>Klasöre Taşı</span>
              </button>
              <button
                onClick={() => handleBulkFavorite(true)}
                className="action-btn px-3 py-1.5 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-apple-md border border-slate-200/30 dark:border-transparent transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Heart size={11} className="text-rose-500" fill="currentColor" />
                <span>Favorile</span>
              </button>
              <button
                onClick={() => handleBulkFavorite(false)}
                className="action-btn px-3 py-1.5 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-apple-md border border-slate-200/30 dark:border-transparent transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Heart size={11} className="text-slate-400" />
                <span>Favoriden Çıkar</span>
              </button>
              <button
                onClick={() => handleBulkPin(true)}
                className="action-btn px-3 py-1.5 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-apple-md border border-slate-200/30 dark:border-transparent transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Pin size={11} className="text-amber-500" fill="currentColor" />
                <span>Başa Sabitle</span>
              </button>
              <button
                onClick={() => handleBulkPin(false)}
                className="action-btn px-3 py-1.5 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-apple-md border border-slate-200/30 dark:border-transparent transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Pin size={11} className="text-slate-400" />
                <span>Sabitlemeyi Kaldır</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="action-btn px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold rounded-apple-md shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={11} />
                <span>Toplu Sil</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isSettingsOpen && (
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      )}

      {showOnboarding && (
        <OnboardingModal onDone={() => {
          setShowOnboarding(false);
          localStorage.removeItem('keepr_onboarding_pending');
        }} />
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Bağlantıları Sil"
        message={`Seçili ${selectedKeepIds.length} bağlantıyı kalıcı olarak silmek istediğinizden emin misiniz?`}
        confirmText="Sil"
        cancelText="Vazgeç"
        variant="danger"
        onConfirm={executeBulkDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* SHARE CATEGORY MODAL */}
      <AnimatePresence>
        {shareCat && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShareCat(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1c1c1e] border border-slate-100 dark:border-[#2c2c2e] rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col gap-5 select-none"
            >
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-[#2c2c2e]/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <Share2 size={15} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Koleksiyonu Paylaş</h3>
                </div>
                <button
                  onClick={() => setShareCat(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2c2c2e] cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1">
                {/* 1. Public Share */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">1. Herkese Açık Paylaşım</h4>
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-[#252529]/40 p-4 rounded-2xl">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Bağlantıyı Paylaş</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Ziyaretçiler bu listeyi salt okunur görebilir</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!shareCat.is_public}
                        disabled={shareCategoryMutation.isPending}
                        onChange={async (e) => {
                          const nextVal = e.target.checked;
                          if (nextVal && user?.subscription_type !== 'team') {
                            openProModal('share');
                            return;
                          }
                          try {
                            const updated = await shareCategoryMutation.mutateAsync({
                              id: shareCat.id,
                              is_public: nextVal,
                            });
                            setShareCat(updated);
                            showToast(nextVal ? 'Koleksiyon paylaşıma açıldı.' : 'Paylaşım kapatıldı.', 'success');
                          } catch (err) {
                            showToast('Paylaşım durumu güncellenemedi.', 'error');
                          }
                        }}
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:bg-slate-200 peer-checked:bg-accent"></div>
                    </label>
                  </div>

                  {shareCat.is_public && shareCat.share_slug && (
                    <div className="flex flex-col gap-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#252529]/40 p-2.5 rounded-2xl border border-slate-100 dark:border-[#2a2a2f]">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate flex-1 pl-1">
                          {`${window.location.origin}/shared/${shareCat.share_slug}`}
                        </span>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/shared/${shareCat.share_slug}`;
                            navigator.clipboard.writeText(url);
                            showToast('Bağlantı panoya kopyalandı! ✅', 'success');
                          }}
                          className="flex-shrink-0 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-[11px] font-bold rounded-xl shadow-sm transition-colors cursor-pointer border-none"
                        >
                          Kopyala
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100 dark:bg-[#2c2c2e]/60 my-1" />

                {/* 2. Collaborative Team Share */}
                <div className="space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={12} className="text-violet-500" />
                      <span>2. Ortak Çalışma & Ekip (Team)</span>
                    </h4>
                  </div>

                  {user?.subscription_type !== 'team' ? (
                    <div 
                      onClick={() => openProModal('share')}
                      className="flex flex-col items-center justify-center p-5 text-center bg-violet-500/5 hover:bg-violet-500/10 border border-dashed border-violet-500/20 rounded-2xl cursor-pointer transition-colors gap-2"
                    >
                      <Users size={22} className="text-violet-500" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Bu Özellik Ekip/Team Planına Özeldir</span>
                      <span className="text-[10px] text-slate-400 leading-relaxed max-w-xs">
                        Başkalarını bu klasöre davet edip birlikte düzenlemek (Viewer/Editor) için Team planına yükseltin.
                      </span>
                      <span className="mt-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-wider bg-violet-500 text-white rounded-lg">YÜKSELT</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Invite Generation Section */}
                      <div className="bg-slate-50 dark:bg-[#252529]/40 p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Yeni Ortak Davet Et</span>
                          <div className="flex items-center gap-1.5 bg-white dark:bg-[#121212] p-0.5 rounded-lg border border-slate-100 dark:border-transparent">
                            <button
                              type="button"
                              onClick={() => setInviteRole('viewer')}
                              className={`px-2 py-1 text-[9px] font-bold rounded-md uppercase transition-colors cursor-pointer ${
                                inviteRole === 'viewer'
                                  ? 'bg-accent text-white'
                                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                              }`}
                            >
                              İzleyici
                            </button>
                            <button
                              type="button"
                              onClick={() => setInviteRole('editor')}
                              className={`px-2 py-1 text-[9px] font-bold rounded-md uppercase transition-colors cursor-pointer ${
                                inviteRole === 'editor'
                                  ? 'bg-accent text-white'
                                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                              }`}
                            >
                              Editör
                            </button>
                          </div>
                        </div>

                        {generatedLink ? (
                          <div className="flex items-center gap-2 bg-white dark:bg-[#121212] p-2 rounded-xl border border-slate-100 dark:border-transparent">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate flex-1 pl-1">
                              {generatedLink}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(generatedLink);
                                showToast('Davet bağlantısı kopyalandı! 👥', 'success');
                              }}
                              className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white text-[10px] font-bold rounded-lg cursor-pointer"
                            >
                              Kopyala
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleCreateCollabInvite}
                            disabled={generatingLink}
                            className="w-full py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <LinkIcon size={12} />
                            <span>{generatingLink ? 'Bağlantı Oluşturuluyor...' : 'Davet Bağlantısı Oluştur'}</span>
                          </button>
                        )}
                      </div>

                      {/* Current Collaborators List */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Aktif Ekip Üyeleri</span>
                        {loadingCollabs ? (
                          <p className="text-[10px] text-slate-400 animate-pulse text-center py-2">Üyeler yükleniyor...</p>
                        ) : collaborators.length === 0 ? (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-2">Bu klasörde henüz başka bir ortak bulunmuyor.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                            {collaborators.map((collab) => (
                              <div 
                                key={collab.id} 
                                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#252529]/40 border border-slate-100 dark:border-transparent rounded-xl"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                    <User size={10} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                      @{collab.username}
                                    </span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                                      {collab.email}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                    collab.role === 'editor' 
                                      ? 'bg-violet-500/10 text-violet-500 border border-violet-500/20' 
                                      : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                                  }`}>
                                    {collab.role === 'editor' ? 'Editör' : 'İzleyici'}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveCollaborator(collab.id)}
                                    className="p-1 rounded text-red-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                                    title="Ortaklıktan Çıkar"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLIPBOARD AUTO-DETECT BANNER */}
      <ClipboardDetect onSave={(url) => setClipboardUrl(url)} />
    </div>
  );
};
