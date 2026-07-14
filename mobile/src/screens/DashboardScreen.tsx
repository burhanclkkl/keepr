import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ActionSheetIOS,
  Platform,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, ArrowUpDown, Plus, Bookmark, Folder, Settings, Heart, Trash2, Check, X, Globe, Users, Pin } from 'lucide-react-native';
import api from '../services/api';
import { KeepCard, Keep } from '../components/KeepCard';
import { AddKeepModal } from '../components/AddKeepModal';
import { InspectorSheet } from '../components/InspectorSheet';
import { ManageCategoriesModal } from '../components/ManageCategoriesModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { SettingsModal } from '../components/SettingsModal';
import { AcceptInviteModal } from '../components/AcceptInviteModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../theme';
import { useShareIntentContext } from 'expo-share-intent';
import * as SecureStore from 'expo-secure-store';
import { OnboardingModal } from '../components/OnboardingModal';
import { ProUpgradeModal } from '../components/ProUpgradeModal';

interface Category {
  id: number;
  name: string;
  is_public?: boolean;
  share_slug?: string | null;
  parent_id?: number | null;
  collaborator_role?: 'viewer' | 'editor' | null;
}

interface DashboardScreenProps {
  initialInviteToken?: string | null;
  onCloseInvite?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  initialInviteToken,
  onCloseInvite,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, themeMode } = useTheme();
  const { user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<string | null>(null);

  const triggerProModal = (feature: string) => {
    setLockedFeature(feature);
    setIsProModalOpen(true);
  };

  // Data states
  const [keeps, setKeeps] = useState<Keep[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // UI Control states
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | string | null | undefined>(undefined);
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical-asc' | 'alphabetical-desc'>('newest');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [inspectKeep, setInspectKeep] = useState<Keep | null>(null);
  const [manualInviteToken, setManualInviteToken] = useState<string | null>(null);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [sharedInputUrl, setSharedInputUrl] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check onboarding on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      const pending = await SecureStore.getItemAsync('keepr_onboarding_pending');
      if (pending === '1') {
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, []);

  // Bulk operation states
  const [selectedKeepIds, setSelectedKeepIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);

  const isSelectedCategoryViewerOnly = useMemo(() => {
    if (typeof selectedCategoryId !== 'number') return false;
    const cat = categories.find((c) => c.id === selectedCategoryId);
    return cat?.collaborator_role === 'viewer';
  }, [selectedCategoryId, categories]);

  const isKeepReadOnly = useCallback((keep: Keep) => {
    if (keep.user_id === user?.id) return false;
    if (!keep.category_id) return false;
    const cat = categories.find((c) => c.id === keep.category_id);
    return cat?.collaborator_role === 'viewer';
  }, [categories, user]);
  const [bulkSelectedCategoryId, setBulkSelectedCategoryId] = useState<number | null>(null);

  // Consume native OS share sheet intents
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (hasShareIntent && (shareIntent.webUrl || shareIntent.text)) {
      const urlToShare = shareIntent.webUrl || shareIntent.text;
      if (urlToShare) {
        setSharedInputUrl(urlToShare);
        setIsAddOpen(true);
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  // 300ms Debouncer for search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const fetchData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    try {
      // 1. Fetch Categories
      const categoriesResp = await api.get<Category[]>('/api/categories');
      setCategories(categoriesResp.data);

      // 2. Fetch Keeps
      const keepsResp = await api.get<Keep[]>('/api/keeps');
      setKeeps(keepsResp.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCloseAcceptInvite = (success: boolean) => {
    if (success) {
      fetchData(false);
    }
    setManualInviteToken(null);
    if (onCloseInvite) {
      onCloseInvite();
    }
  };

  // Pull-to-refresh action
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData(false);
  };

  // Keep Mutation actions
  const handleAddKeep = async (url: string, categoryId: number | null, title?: string, description?: string) => {
    try {
      await api.post('/api/keeps', { url, category_id: categoryId, title, description });
      fetchData(false);
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Bağlantı eklenemedi.';
      Alert.alert('Hata', errMsg);
    }
  };

  const handleUpdateKeep = async (id: number, data: { title: string; description: string; category_id: number | null }) => {
    try {
      await api.put(`/api/keeps/${id}`, {
        title: data.title,
        description: data.description,
        category_id: data.category_id,
      });
      fetchData(false);
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteKeep = async (id: number) => {
    try {
      await api.delete(`/api/keeps/${id}`);
      fetchData(false);
    } catch (error) {
      throw error;
    }
  };

  // Single card favorite status toggler
  const handleToggleFavorite = async (id: number, isFavorite: boolean) => {
    try {
      await api.put(`/api/keeps/${id}`, { is_favorite: isFavorite });
      fetchData(false);
    } catch (error) {
      console.error('Favori güncellenemedi:', error);
    }
  };

  // Single card pin status toggler
  const handleTogglePin = async (id: number, isPinned: boolean) => {
    try {
      await api.put(`/api/keeps/${id}`, { is_pinned: isPinned });
      fetchData(false);
    } catch (error) {
      console.error('Sabitleme güncellenemedi:', error);
    }
  };

  // Selection togglers
  const handleToggleSelect = (id: number) => {
    const keep = keeps.find((k) => k.id === id);
    if (keep && isKeepReadOnly(keep)) {
      Alert.alert('Salt Okunur', 'Salt okunur bağlantılar üzerinde toplu işlem yapılamaz.');
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
  };

  // Bulk actions handlers
  const handleBulkDelete = () => {
    if (selectedKeepIds.length === 0) return;
    setIsDeleteConfirmOpen(true);
  };

  const handleBulkFavorite = async (isFavorite: boolean) => {
    if (selectedKeepIds.length === 0) return;
    if (user?.subscription_type !== 'pro' && user?.subscription_type !== 'team') {
      triggerProModal('favorite');
      return;
    }
    try {
      await api.post('/api/keeps/bulk-favorite', { ids: selectedKeepIds, is_favorite: isFavorite });
      setSelectedKeepIds([]);
      setIsSelectionMode(false);
      fetchData(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Toplu işlem sırasında bir hata oluştu.');
    }
  };

  const handleBulkPin = async (isPinned: boolean) => {
    if (selectedKeepIds.length === 0) return;
    if (user?.subscription_type !== 'pro' && user?.subscription_type !== 'team') {
      triggerProModal('pin');
      return;
    }
    try {
      await api.post('/api/keeps/bulk-pin', { ids: selectedKeepIds, is_pinned: isPinned });
      setSelectedKeepIds([]);
      setIsSelectionMode(false);
      fetchData(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Toplu işlem sırasında bir hata oluştu.');
    }
  };

  const handleCreateCategory = async (name: string, parentId?: number | null) => {
    try {
      await api.post('/api/categories', { name, icon: 'folder', parent_id: parentId });
      fetchData(false);
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Kategori oluşturulamadı.';
      Alert.alert('Hata', errMsg);
      throw error;
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await api.delete(`/api/categories/${id}`);
      if (selectedCategoryId === id) {
        setSelectedCategoryId(undefined);
      }
      fetchData(false);
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Kategori silinemedi.';
      Alert.alert('Hata', errMsg);
      throw error;
    }
  };

  const handleShareCategory = async (id: number, isPublic: boolean): Promise<Category> => {
    if (isPublic && user?.subscription_type !== 'team') {
      Alert.alert(
        'Ekip Özelliği',
        'Koleksiyon paylaşma özelliği yalnızca Keepr Team üyelerine özeldir.'
      );
      throw new Error('Team subscription required');
    }
    try {
      const response = await api.post(`/api/categories/${id}/share`, { is_public: isPublic });
      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, ...response.data } : cat))
      );
      return response.data;
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Paylaşım ayarı güncellenemedi.';
      Alert.alert('Hata', errMsg);
      throw error;
    }
  };

  // iOS Native Action Sheet for Sort Options selection
  const handleSortPress = () => {
    const options = ['İptal', 'En Yeni', 'En Eski', 'A - Z', 'Z - A'];
    const destructiveButtonIndex = undefined;
    const cancelButtonIndex = 0;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          title: 'Sıralama Seçenekleri',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) setSortBy('newest');
          else if (buttonIndex === 2) setSortBy('oldest');
          else if (buttonIndex === 3) setSortBy('alphabetical-asc');
          else if (buttonIndex === 4) setSortBy('alphabetical-desc');
        }
      );
    } else {
      // Android dialog fallback
      Alert.alert('Sıralama Seçenekleri', '', [
        { text: 'İptal', style: 'cancel' },
        { text: 'En Yeni', onPress: () => setSortBy('newest') },
        { text: 'En Eski', onPress: () => setSortBy('oldest') },
        { text: 'A - Z', onPress: () => setSortBy('alphabetical-asc') },
        { text: 'Z - A', onPress: () => setSortBy('alphabetical-desc') },
      ]);
    }
  };

  // Filter & sort keeps client-side
  const processedKeeps = useMemo(() => {
    let result = [...keeps];

    // Filter by Category if selected
    if (selectedCategoryId === 'favorites') {
      result = result.filter((k) => k.is_favorite === true);
    } else if (selectedCategoryId !== undefined) {
      result = result.filter((k) => k.category_id === selectedCategoryId);
    }

    // Filter by search text
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (k) =>
          (k.title && k.title.toLowerCase().includes(query)) ||
          k.url.toLowerCase().includes(query) ||
          (k.description && k.description.toLowerCase().includes(query))
      );
    }

    // Pinned items always float to the top regardless of sort order
    result.sort((a, b) => {
      const pinDiff = (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;

      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      const titleA = (a.title || a.url).toLowerCase();
      const titleB = (b.title || b.url).toLowerCase();
      if (sortBy === 'alphabetical-asc') {
        return titleA.localeCompare(titleB, 'tr-TR');
      }
      if (sortBy === 'alphabetical-desc') {
        return titleB.localeCompare(titleA, 'tr-TR');
      }
      return 0;
    });

    return result;
  }, [keeps, selectedCategoryId, searchQuery, sortBy]);

  const sortedCategories = useMemo(() => {
    const rootCats = categories.filter(c => !c.parent_id);
    const sorted: Category[] = [];
    for (const root of rootCats) {
      sorted.push(root);
      const subCats = categories.filter(sub => sub.parent_id === root.id);
      for (const sub of subCats) {
        sorted.push({ ...sub, name: `↳ ${sub.name}` });
      }
    }
    return sorted;
  }, [categories]);

  // Get active category header label
  const activeCategoryTitle = useMemo(() => {
    if (selectedCategoryId === undefined) return 'Tüm Bağlantılar';
    if (selectedCategoryId === null) return 'Kategorisiz (Genel)';
    if (selectedCategoryId === 'favorites') return 'Favorilerim';
    return categories.find((c) => c.id === selectedCategoryId)?.name || 'Kategori';
  }, [selectedCategoryId, categories]);

  // Compute local keep count badges
  const keepCounts = useMemo(() => {
    const counts: Record<number | string, number> = {
      all: 0,
      uncategorized: 0,
      favorites: 0,
    };
    keeps.forEach((k) => {
      counts.all += 1;
      if (k.is_favorite) {
        counts.favorites += 1;
      }
      if (k.category_id === null) {
        counts.uncategorized += 1;
      } else {
        counts[k.category_id] = (counts[k.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [keeps]);

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      
      {/* HEADER SECTION */}
      <View style={[styles.header, { borderColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <Text style={[styles.headerText, { color: colors.text, fontWeight: '900', letterSpacing: 0.8, fontSize: 13 }]}>KEEPR</Text>
             {user?.subscription_type === 'pro' && (
               <View style={{ marginLeft: 5, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                 <Text style={{ fontSize: 7, color: '#10b981', fontWeight: '900' }}>PRO</Text>
               </View>
             )}
             {user?.subscription_type === 'team' && (
               <View style={{ marginLeft: 5, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                 <Text style={{ fontSize: 7, color: '#8b5cf6', fontWeight: '900' }}>TEAM</Text>
               </View>
             )}
            <View style={{ width: 1, height: 10, backgroundColor: colors.border, marginHorizontal: 6 }} />
            <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '700' }}>Dijital Havuz</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setIsSettingsOpen(true)} style={styles.logoutBtn} activeOpacity={0.6}>
          <Settings size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* CATEGORY SWITCHER BAR (Horizontal scroll) */}
      <View style={[styles.categoryBar, { borderColor: colors.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { id: undefined, name: 'Tümü' },
            { id: null, name: 'Genel' },
            { id: 'favorites', name: 'Favoriler' },
            ...sortedCategories,
            { id: -999, name: 'Yönet' },
          ]}
          keyExtractor={(item) => (item.id === undefined ? 'all' : item.id === null ? 'uncat' : item.id === 'favorites' ? 'fav' : item.id === -999 ? 'manage' : String(item.id))}
          contentContainerStyle={styles.categoryScroll}
          renderItem={({ item }) => {
            if (item.id === -999) {
              return (
                <TouchableOpacity
                  onPress={() => setIsManageCategoriesOpen(true)}
                  style={[
                    styles.categoryTab,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryTabText, { color: colors.textMuted }]}>{item.name}</Text>
                </TouchableOpacity>
              );
            }

            const isSelected = selectedCategoryId === item.id;
            const badgeCount = item.id === undefined 
              ? keepCounts.all 
              : item.id === null 
                ? keepCounts.uncategorized 
                : item.id === 'favorites' 
                  ? keepCounts.favorites 
                  : keepCounts[item.id] || 0;

            return (
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(item.id)}
                style={[
                  styles.categoryTab,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {'is_public' in item && item.is_public && (
                    <Globe size={10} color={isSelected ? '#fff' : '#10B981'} style={{ marginRight: 4 }} />
                  )}
                  {'collaborator_role' in item && item.collaborator_role && (
                    <Users size={10} color={isSelected ? '#fff' : '#8B5CF6'} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.categoryTabText, { color: isSelected ? '#fff' : colors.text }]}>
                    {item.name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: colors.background },
                    isSelected && { backgroundColor: 'rgba(255,255,255,0.2)' },
                  ]}
                >
                  <Text style={[styles.countText, { color: isSelected ? '#fff' : colors.textMuted }]}>
                    {badgeCount}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* SEARCH AND SORT TOOLBAR */}
      <View style={styles.toolbar}>
        <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={14} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchVal}
            onChangeText={setSearchVal}
            placeholder="Bağlantılarda ara..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          onPress={handleSortPress}
          style={[styles.sortBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <ArrowUpDown size={14} color={colors.textMuted} />
          <Text style={[styles.sortBtnText, { color: colors.text }]}>Sırala</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (isSelectionMode) {
              setSelectedKeepIds([]);
              setIsSelectionMode(false);
            } else {
              setIsSelectionMode(true);
            }
          }}
          style={[
            styles.sortBtn,
            { backgroundColor: isSelectionMode ? 'rgba(139, 92, 246, 0.08)' : colors.card, borderColor: isSelectionMode ? '#8B5CF6' : colors.border, marginLeft: 6 }
          ]}
          activeOpacity={0.7}
        >
          <Check size={14} color={isSelectionMode ? '#8B5CF6' : colors.textMuted} />
          <Text style={[styles.sortBtnText, { color: isSelectionMode ? '#8B5CF6' : colors.text }]}>Seç</Text>
        </TouchableOpacity>
      </View>

      {/* FEED FEED CONTAINER */}
      <View style={styles.listContainer}>
        <View style={styles.listHeaderRow}>
          <Text style={[styles.listHeaderTitle, { color: colors.text }]}>
            {activeCategoryTitle}
          </Text>
          <Text style={[styles.listHeaderCount, { color: colors.textMuted }]}>
            {processedKeeps.length} Adet
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : processedKeeps.length > 0 ? (
          <FlatList
            key={user?.view_layout === 'list' ? 'list' : 'grid'}
            numColumns={user?.view_layout === 'list' ? 1 : 2}
            data={processedKeeps}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <KeepCard
                keep={item}
                viewLayout={(user?.view_layout as 'grid' | 'list') || 'grid'}
                onSelect={setInspectKeep}
                onDelete={handleDeleteKeep}
                onToggleFavorite={handleToggleFavorite}
                onTogglePin={handleTogglePin}
                isSelectionMode={isSelectionMode}
                isSelected={selectedKeepIds.includes(item.id)}
                onToggleSelect={handleToggleSelect}
                onTriggerProModal={triggerProModal}
                readOnly={isKeepReadOnly(item)}
              />
            )}
            columnWrapperStyle={user?.view_layout === 'list' ? undefined : styles.gridRow}
            contentContainerStyle={user?.view_layout === 'list' ? styles.flatListContent : styles.gridContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          />
        ) : (
          /* Empty States display */
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.card }]}>
              <Bookmark size={20} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery ? 'Eşleşme Bulunamadı' : 'Burası Çok Sessiz...'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {searchQuery
                ? `"${searchQuery}" aramasıyla eşleşen başlık veya URL bulunamadı.`
                : 'Henüz bu kategoriye bir bağlantı kaydetmemişsiniz. Sayfanın altındaki butona basıp ilk bağlantınızı ekleyebilirsiniz.'}
            </Text>
          </View>
        )}
      </View>

      {/* FLOATING ACTION BUTTON (Add link) */}
      {!isSelectionMode && (
        <TouchableOpacity
          onPress={() => {
            if (isSelectedCategoryViewerOnly) {
              Alert.alert(
                'Salt Okunur Klasör',
                'Bu ortak klasörde salt okunur (viewer) yetkiniz bulunmaktadır. Yeni bağlantı eklenemez.'
              );
              return;
            }
            setIsAddOpen(true);
          }}
          style={[
            styles.fab,
            { backgroundColor: isSelectedCategoryViewerOnly ? '#8B5CF6' : colors.primary, bottom: 24 + insets.bottom }
          ]}
          activeOpacity={0.8}
        >
          {isSelectedCategoryViewerOnly ? (
            <Users size={20} color="#fff" />
          ) : (
            <Plus size={22} color="#fff" />
          )}
        </TouchableOpacity>
      )}

      {/* FLOATING BULK BAR (Mobile select menu) */}
      {isSelectionMode && (
        <View style={[styles.bulkBar, { backgroundColor: colors.card, borderColor: colors.border, bottom: 16 + insets.bottom }]}>
          <View style={styles.bulkHeader}>
            <View style={styles.bulkInfoRow}>
              <View style={[styles.bulkBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.bulkBadgeText}>{selectedKeepIds.length}</Text>
              </View>
              <Text style={[styles.bulkTitleText, { color: colors.text }]}>Seçildi</Text>
            </View>

            <View style={styles.bulkActionsRow}>
              <TouchableOpacity
                onPress={() => {
                  const writeableIds = processedKeeps.filter((k) => !isKeepReadOnly(k)).map((k) => k.id);
                  if (writeableIds.length === 0) {
                    Alert.alert('Bilgi', 'Seçilebilecek yazılabilir bağlantı bulunamadı.');
                    return;
                  }
                  setSelectedKeepIds(writeableIds);
                }}
                style={styles.bulkActionBtn}
              >
                <Text style={[styles.bulkActionBtnText, { color: colors.primary }]}>Tümünü Seç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedKeepIds([]);
                  setIsSelectionMode(false);
                }}
                style={styles.bulkActionBtn}
              >
                <Text style={[styles.bulkActionBtnText, { color: colors.textMuted }]}>Vazgeç</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bulkBtnScroll}
          >
            <TouchableOpacity
              onPress={() => {
                setBulkSelectedCategoryId(null);
                setIsBulkMoveOpen(true);
              }}
              style={[styles.bulkIconButton, { backgroundColor: colors.background }]}
            >
              <Folder size={13} color={colors.primary} />
              <Text style={[styles.bulkIconButtonText, { color: colors.text }]}>Taşı</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleBulkFavorite(true)}
              style={[styles.bulkIconButton, { backgroundColor: colors.background }]}
            >
              <Heart size={13} color="#f43f5e" fill="#f43f5e" />
              <Text style={[styles.bulkIconButtonText, { color: colors.text }]}>Favorile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleBulkFavorite(false)}
              style={[styles.bulkIconButton, { backgroundColor: colors.background }]}
            >
              <Heart size={13} color={colors.textMuted} />
              <Text style={[styles.bulkIconButtonText, { color: colors.text }]}>Favoriden Çıkar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleBulkPin(true)}
              style={[styles.bulkIconButton, { backgroundColor: colors.background }]}
            >
              <Pin size={13} color="#f59e0b" fill="#f59e0b" />
              <Text style={[styles.bulkIconButtonText, { color: colors.text }]}>Başa Sabitle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleBulkPin(false)}
              style={[styles.bulkIconButton, { backgroundColor: colors.background }]}
            >
              <Pin size={13} color={colors.textMuted} />
              <Text style={[styles.bulkIconButtonText, { color: colors.text }]}>Sabitlemeyi Kaldır</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBulkDelete}
              style={[styles.bulkIconButton, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
            >
              <Trash2 size={13} color="#ef4444" />
              <Text style={[styles.bulkIconButtonText, { color: '#ef4444' }]}>Toplu Sil</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* BINDED MODALS */}
      {/* 1. Add URL Modal */}
      <AddKeepModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setSharedInputUrl('');
        }}
        onAdd={async (url, categoryId, title, description) => {
          await handleAddKeep(url, categoryId, title, description);
          setIsAddOpen(false);
          setSharedInputUrl('');
        }}
        categories={categories}
        isLoading={false}
        defaultCategoryId={(selectedCategoryId === undefined || selectedCategoryId === 'favorites') ? null : (selectedCategoryId as number | null)}
        prefilledUrl={sharedInputUrl}
      />

      {/* 2. Inspector Sheet */}
      <InspectorSheet
        keep={inspectKeep}
        isOpen={inspectKeep !== null}
        onClose={() => setInspectKeep(null)}
        onUpdate={handleUpdateKeep}
        onDelete={handleDeleteKeep}
        categories={categories}
        onTriggerProModal={triggerProModal}
        onRefreshKeep={setInspectKeep}
      />

      {/* 3. Manage Categories Modal */}
      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        onCreate={handleCreateCategory}
        onDelete={handleDeleteCategory}
        onShare={handleShareCategory}
      />

      {/* 4. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onJoinWithToken={(token) => setManualInviteToken(token)}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={async () => {
          setShowOnboarding(false);
          await SecureStore.deleteItemAsync('keepr_onboarding_pending');
        }}
      />

      {/* Accept Invite Modal */}
      <AcceptInviteModal
        isOpen={(initialInviteToken !== null && initialInviteToken !== undefined) || manualInviteToken !== null}
        token={manualInviteToken || initialInviteToken || null}
        onClose={handleCloseAcceptInvite}
      />

      {/* 5. Bulk Move Category Selector Dialog */}
      <Modal
        visible={isBulkMoveOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBulkMoveOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Klasöre Taşı</Text>
              <TouchableOpacity onPress={() => setIsBulkMoveOpen(false)}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textMuted, marginBottom: 16 }}>
              Seçili {selectedKeepIds.length} bağlantıyı hangi klasöre taşımak istersiniz?
            </Text>
            
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {/* Uncategorized (Genel) */}
              <TouchableOpacity
                onPress={() => setBulkSelectedCategoryId(null)}
                style={[
                  styles.categoryPickerItem,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  bulkSelectedCategoryId === null && { borderColor: colors.primary, backgroundColor: colors.border }
                ]}
              >
                <Folder size={14} color={bulkSelectedCategoryId === null ? colors.primary : colors.textMuted} style={{ marginRight: 10 }} />
                <Text style={[styles.categoryPickerText, { color: colors.text }, bulkSelectedCategoryId === null && { color: colors.primary, fontWeight: '700' }]}>
                  Kategorisiz (Genel)
                </Text>
                {bulkSelectedCategoryId === null && <Check size={14} color={colors.primary} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>

              {/* Other categories */}
              {sortedCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setBulkSelectedCategoryId(cat.id)}
                  style={[
                    styles.categoryPickerItem,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    bulkSelectedCategoryId === cat.id && { borderColor: colors.primary, backgroundColor: colors.border }
                  ]}
                >
                  <Folder size={14} color={bulkSelectedCategoryId === cat.id ? colors.primary : colors.textMuted} style={{ marginRight: 10 }} />
                  <Text style={[styles.categoryPickerText, { color: colors.text }, bulkSelectedCategoryId === cat.id && { color: colors.primary, fontWeight: '700' }]}>
                    {cat.name}
                  </Text>
                  {bulkSelectedCategoryId === cat.id && <Check size={14} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setIsBulkMoveOpen(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await api.post('/api/keeps/bulk-move', { ids: selectedKeepIds, category_id: bulkSelectedCategoryId });
                    setIsBulkMoveOpen(false);
                    setSelectedKeepIds([]);
                    setIsSelectionMode(false);
                    fetchData(false);
                  } catch (err) {
                    Alert.alert('Hata', 'Taşıma işlemi sırasında hata oluştu.');
                  }
                }}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Taşı</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Toplu Sil"
        message={`Seçili ${selectedKeepIds.length} adet bağlantıyı silmek istediğinizden emin misiniz?`}
        confirmText="Sil"
        cancelText="Vazgeç"
        variant="danger"
        onConfirm={async () => {
          setIsDeleteConfirmOpen(false);
          try {
            await api.post('/api/keeps/bulk-delete', { ids: selectedKeepIds });
            setSelectedKeepIds([]);
            setIsSelectionMode(false);
            fetchData(false);
          } catch (err) {
            Alert.alert('Hata', 'Toplu silme işlemi başarısız.');
          }
        }}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
      
      <ProUpgradeModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        feature={lockedFeature}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 22,
    height: 22,
    borderRadius: Radius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginLeft: 8,
  },
  logoutBtn: {
    padding: 6,
  },
  categoryBar: {
    height: 48,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.small,
    marginLeft: 6,
  },
  countText: {
    fontSize: 8,
    fontWeight: '800',
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 10,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    height: '100%',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    height: 36,
    gap: 6,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  listHeaderCount: {
    fontSize: 10,
    fontWeight: '700',
  },
  flatListContent: {
    paddingBottom: 120,
  },
  gridContent: {
    paddingHorizontal: 8,
    paddingBottom: 120,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 52,
    height: 52,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  bulkBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 44 : 20,
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 10,
  },
  bulkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  bulkBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  bulkTitleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bulkActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  bulkActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  bulkBtnScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  bulkIconButton: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  bulkIconButtonText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  categoryPickerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtn: {
    flex: 2,
    height: 36,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
