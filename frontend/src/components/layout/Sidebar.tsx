import React, { useState } from 'react';
import { Folder, Plus, Trash2, Grid, FolderOpen, Loader2, Settings, Heart, Share2, ChevronRight, ChevronDown, FolderTree, Lock, Globe, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCreateCategory, useDeleteCategory } from '../../hooks/useCategories';
import type { Category } from '../../hooks/useCategories';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useProModal } from '../../context/ProModalContext';
import appLogo from '../../assets/logo.png';

interface SidebarProps {
  categories: Category[];
  selectedCategoryId: number | string | null | undefined;
  onSelectCategory: (id: number | string | null | undefined) => void;
  keepCounts: Record<number | string, number>;
  onOpenSettings: () => void;
  onShareCategory: (category: Category) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  keepCounts,
  onOpenSettings,
  onShareCategory,
}) => {
  const { user } = useAuth();
  const { openProModal } = useProModal();
  
  const [newCatName, setNewCatName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);
  
  // Subfolders tree states
  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({});
  const [addSubcatParentId, setAddSubcatParentId] = useState<number | null>(null);
  const [newSubcatName, setNewSubcatName] = useState('');

  const createCategoryMutation = useCreateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const handleCreateSubcategory = async (parentId: number, e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcatName.trim()) return;

    const isPro = user?.subscription_type === 'pro' || user?.subscription_type === 'team';
    // Alt klasör için Pro/Team gereklidir
    if (!isPro) {
      openProModal('folder');
      return;
    }

    try {
      await createCategoryMutation.mutateAsync({
        name: newSubcatName.trim(),
        icon: 'folder',
        parent_id: parentId,
      });
      setNewSubcatName('');
      setAddSubcatParentId(null);
      setExpandedCats((prev) => ({ ...prev, [parentId]: true }));
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'PRO_REQUIRED') {
        openProModal('folder');
      } else if (code === 'TEAM_REQUIRED') {
        openProModal('share');
      } else {
        console.error(err);
      }
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const isPro = user?.subscription_type === 'pro' || user?.subscription_type === 'team';
    if (!isPro && categories.length >= 10) {
      openProModal('category');
      return;
    }

    try {
      await createCategoryMutation.mutateAsync({
        name: newCatName.trim(),
        icon: 'folder', // default icon
      });
      setNewCatName('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent category selection on click delete
    setDeleteCatId(id);
  };

  return (
    <>
      <aside className="w-[310px] border-r border-gray-100 dark:border-[#1c1c1e] bg-white dark:bg-[#121212] flex flex-col h-screen select-none sticky top-0">
        
        {/* App Logo Header */}
        <div className="p-4 flex items-center gap-2.5 border-b border-gray-100 dark:border-[#1c1c1e] w-full">
          <img src={appLogo} alt="Keepr Logo" className="w-8 h-8 rounded-lg shadow-md shadow-accent/20 object-cover flex-shrink-0" />
          <div className="flex items-center min-w-0">
            <span className="font-black text-xs tracking-[0.2em] text-slate-800 dark:text-slate-200 uppercase">Keepr</span>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-2 border-l border-slate-200 dark:border-[#2c2c2e] pl-2 truncate">Dijital Havuz</span>
          </div>
        </div>
      {/* USER PROFILE INFO SECTION */}
      {user && (
        <div className="p-4 border-b border-gray-100 dark:border-[#1c1c1e] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-accent text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden leading-tight">
              <div className="flex items-center gap-1.5 min-w-0">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user.username}
                </h4>
                {user.subscription_type === 'pro' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider bg-[#34C759] text-white uppercase flex-shrink-0 ml-1">
                    PRO
                  </span>
                )}
                {user.subscription_type === 'team' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider bg-[#8B5CF6] text-white uppercase flex-shrink-0 ml-1">
                    TEAM
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
                {user.email}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onOpenSettings}
              title="Ayarlar"
              className="p-1.5 rounded-apple-sm text-slate-400 hover:text-accent hover:bg-slate-50 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      )}

      {/* NAVIGATION SECTION */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        
        {/* Core feeds */}
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Kütüphane
          </span>
          <button
            onClick={() => onSelectCategory(undefined)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-apple-md text-xs font-semibold transition-all cursor-pointer ${
              selectedCategoryId === undefined
                ? 'bg-accent/10 text-accent'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c1e]/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Grid size={13} />
              <span>Tümü</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1c1c1e] text-slate-400 dark:text-slate-500">
              {keepCounts['all'] || 0}
            </span>
          </button>
          <button
            onClick={() => onSelectCategory(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-apple-md text-xs font-semibold transition-all cursor-pointer ${
              selectedCategoryId === null
                ? 'bg-accent/10 text-accent'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c1e]/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder size={13} />
              <span>Kategorisiz</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1c1c1e] text-slate-400 dark:text-slate-500">
              {keepCounts['uncategorized'] || 0}
            </span>
          </button>
          <button
            onClick={() => onSelectCategory('favorites')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-apple-md text-xs font-semibold transition-all cursor-pointer ${
              selectedCategoryId === 'favorites'
                ? 'bg-rose-500/10 text-rose-500 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c1e]/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Heart size={13} fill={selectedCategoryId === 'favorites' ? 'currentColor' : 'none'} />
              <span>Favoriler</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1c1c1e] text-slate-400 dark:text-slate-500">
              {keepCounts['favorites'] || 0}
            </span>
          </button>
        </div>

        {/* Categories Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Kategoriler
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-1 rounded-apple-sm text-slate-400 hover:text-accent hover:bg-slate-50 dark:hover:bg-[#1c1c1e]/50 cursor-pointer"
              title="Kategori Ekle"
            >
              <Plus size={11} className={`transform transition-transform ${showAddForm ? 'rotate-45' : ''}`} />
            </button>
          </div>

          {/* Add Category Form */}
          {showAddForm && (
            <form onSubmit={handleCreateCategory} className="px-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Kategori adı..."
                  disabled={createCategoryMutation.isPending}
                  className="w-full pl-3 pr-8 py-1.5 bg-transparent border border-gray-200 dark:border-[#1c1c1e] rounded-apple-md text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-accent"
                  autoFocus
                />
                {createCategoryMutation.isPending ? (
                  <Loader2 size={11} className="absolute right-3 text-slate-400 animate-spin" />
                ) : (
                  <button
                    type="submit"
                    className="absolute right-3 text-slate-400 hover:text-accent font-bold text-xs cursor-pointer"
                  >
                    Ekle
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Category List */}
          <div className="space-y-1 max-h-80 overflow-y-auto px-1">
            {categories.filter(c => !c.parent_id).map((category) => {
              const subCats = categories.filter(c => c.parent_id === category.id);
              const hasSub = subCats.length > 0;
              const isExpanded = !!expandedCats[category.id];
              const isTeam = user?.subscription_type === 'team';

              return (
                <div key={category.id} className="space-y-0.5 animate-in fade-in duration-200">
                  {/* Parent Category Row */}
                  <button
                    onClick={() => onSelectCategory(category.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-apple-md text-xs font-semibold transition-all group relative cursor-pointer ${
                      selectedCategoryId === category.id
                        ? 'bg-accent/10 text-accent font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c1e]/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-6">
                      {hasSub ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCats(prev => ({ ...prev, [category.id]: !prev[category.id] }));
                          }}
                          className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer text-slate-400"
                        >
                          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </span>
                      ) : (
                        <span className="w-4 h-4 flex-shrink-0" />
                      )}
                      
                      {selectedCategoryId === category.id ? (
                        <FolderOpen size={13} className="flex-shrink-0 text-accent" />
                      ) : (
                        <Folder size={13} className="flex-shrink-0" />
                      )}
                      <span className="truncate">{category.name}</span>
                      {category.is_public && (
                        <span className="inline-flex items-center gap-0.5 ml-1 px-1 py-0.5 rounded text-[8px] font-black tracking-wide bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <Globe size={8} /> AÇIK
                        </span>
                      )}
                      {category.collaborator_role && (
                        <span className="inline-flex items-center gap-0.5 ml-1 px-1 py-0.5 rounded text-[8px] font-black tracking-wide bg-violet-500/10 text-violet-500 border border-violet-500/10 dark:bg-violet-500/20 dark:text-violet-400">
                          <Users size={8} /> EKİP ({category.collaborator_role === 'editor' ? 'EDİTÖR' : 'İZLEYİCİ'})
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 relative h-4 min-w-[24px] justify-end">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 dark:bg-[#1c1c1e]/50 text-slate-400 dark:text-slate-500 transition-opacity duration-150 group-hover:opacity-0">
                        {keepCounts[category.id] || 0}
                      </span>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 flex items-center gap-1 bg-slate-50 dark:bg-[#1c1c1e] pl-1.5 rounded-apple-sm">
                        {/* Add Subfolder Button (Pro/Team gated for owner, allowed for editor) */}
                        {(!category.collaborator_role || category.collaborator_role === 'editor') && (() => {
                          const isPro = user?.subscription_type === 'pro' || user?.subscription_type === 'team';
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!category.collaborator_role && !isPro) {
                                  openProModal('folder');
                                  return;
                                }
                                setAddSubcatParentId(addSubcatParentId === category.id ? null : category.id);
                              }}
                              className="p-1 rounded-apple-sm text-slate-400 hover:text-accent hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center gap-0.5"
                              title="Alt Klasör Ekle"
                            >
                              {!category.collaborator_role && !isPro && <Lock size={8} className="text-amber-500" />}
                              <Plus size={11} />
                            </button>
                          );
                        })()}
                        
                        {/* Share Button (Root folders only, owner only) */}
                        {!category.collaborator_role && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isTeam) {
                                openProModal('share');
                                return;
                              }
                              onShareCategory(category);
                            }}
                            className="p-1 rounded-apple-sm text-slate-400 hover:text-accent hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center gap-0.5"
                            title="Paylaş"
                          >
                            {!isTeam && <Lock size={8} className="text-amber-500" />}
                            <Share2 size={11} />
                          </button>
                        )}
                        
                        {/* Delete Button (Owner only) */}
                        {!category.collaborator_role && (
                          <button
                            onClick={(e) => handleDeleteCategory(category.id, e)}
                            className="p-1 rounded-apple-sm text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Add Subcategory Form */}
                  {addSubcatParentId === category.id && (
                    <form
                      onSubmit={(e) => handleCreateSubcategory(category.id, e)}
                      className="pl-8 pr-2 py-1 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={newSubcatName}
                          onChange={(e) => setNewSubcatName(e.target.value)}
                          placeholder="Alt klasör adı..."
                          disabled={createCategoryMutation.isPending}
                          className="w-full pl-2 pr-10 py-1 bg-transparent border border-gray-200 dark:border-[#1c1c1e]/80 rounded-apple-md text-[11px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-accent"
                          autoFocus
                        />
                        {createCategoryMutation.isPending ? (
                          <Loader2 size={10} className="absolute right-3 text-slate-400 animate-spin" />
                        ) : (
                          <button
                            type="submit"
                            className="absolute right-3 text-slate-400 hover:text-accent font-bold text-[10px] cursor-pointer"
                          >
                            Ekle
                          </button>
                        )}
                      </div>
                    </form>
                  )}

                  {/* Subcategories (Indented) */}
                  {isExpanded && subCats.length > 0 && (
                    <div className="pl-6 space-y-0.5 border-l border-slate-100 dark:border-[#1c1c1e]/50 ml-4 animate-in fade-in duration-200">
                      {subCats.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => onSelectCategory(sub.id)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded-apple-md text-[11px] font-medium transition-all group relative cursor-pointer ${
                            selectedCategoryId === sub.id
                              ? 'bg-accent/10 text-accent font-bold'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c1e]/20'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 overflow-hidden mr-6">
                            <FolderTree size={11} className="flex-shrink-0 text-slate-400" />
                            <span className="truncate">{sub.name}</span>
                            {sub.collaborator_role && (
                              <span className="inline-flex items-center gap-0.5 ml-1 px-1 py-0.5 rounded text-[8px] font-black tracking-wide bg-violet-500/10 text-violet-500 border border-violet-500/10 dark:bg-violet-500/20 dark:text-violet-400">
                                <Users size={8} /> EKİP ({sub.collaborator_role === 'editor' ? 'EDİTÖR' : 'İZLEYİCİ'})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 relative h-4 min-w-[20px] justify-end">
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-50 dark:bg-[#1c1c1e]/50 text-slate-400 dark:text-slate-500 transition-opacity duration-150 group-hover:opacity-0">
                              {keepCounts[sub.id] || 0}
                            </span>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 flex items-center gap-1 bg-slate-50 dark:bg-[#1c1c1e] pl-1.5 rounded-apple-sm">
                              {/* Subfolders cannot be shared, only show delete button for owner or editor */}
                              {(!category.collaborator_role || category.collaborator_role === 'editor') && (
                                <button
                                  onClick={(e) => handleDeleteCategory(sub.id, e)}
                                  className="p-1 rounded-apple-sm text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                  title="Sil"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </aside>

    <ConfirmModal
      isOpen={deleteCatId !== null}
      title="Kategoriyi Sil"
      message="Bu kategoriyi silmek istediğinizden emin misiniz? Bağlantılarınız silinmeyecektir."
      confirmText="Sil"
      cancelText="Vazgeç"
      variant="danger"
      onConfirm={async () => {
        if (deleteCatId !== null) {
          try {
            await deleteCategoryMutation.mutateAsync(deleteCatId);
            if (selectedCategoryId === deleteCatId) {
              onSelectCategory(undefined);
            }
          } catch (err) {
            console.error(err);
          } finally {
            setDeleteCatId(null);
          }
        }
      }}
      onCancel={() => setDeleteCatId(null)}
    />
    </>
  );
};
