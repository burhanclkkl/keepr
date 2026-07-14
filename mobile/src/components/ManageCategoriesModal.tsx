import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  useColorScheme,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Typography, Radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { X, Plus, Folder, Trash2, Share2, Lock, Globe, Users } from 'lucide-react-native';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { CollabShareModal } from './CollabShareModal';

interface Category {
  id: number;
  name: string;
  is_public?: boolean;
  share_slug?: string | null;
  parent_id?: number | null;
  collaborator_role?: 'viewer' | 'editor' | null;
}

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreate: (name: string, parentId?: number | null) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onShare: (id: number, isPublic: boolean) => Promise<Category>;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCreate,
  onDelete,
  onShare,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [newCatName, setNewCatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [collabShareCat, setCollabShareCat] = useState<Category | null>(null);

  const handleShare = (cat: Category) => {
    if (user?.subscription_type !== 'team') {
      Alert.alert(
        'Yetersiz Abonelik',
        'Koleksiyon paylaşımı (Paylaşılan Klasör/Koleksiyon) özelliğini kullanabilmek için Team aboneliğine sahip olmanız gerekmektedir.',
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }
    setCollabShareCat(cat);
  };

  const handleCreate = async () => {
    if (!newCatName.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(newCatName.trim(), selectedParentId);
      setNewCatName('');
      setSelectedParentId(null);
    } catch (e) {
      Alert.alert('Hata', 'Kategori eklenirken bir hata oluştu.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Kategoriyi Sil',
      `"${name}" kategorisini silmek istediğinizden emin misiniz? Bu kategori altındaki bağlantılar silinmeyecek, "Genel" kategoriye taşınacaktır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await onDelete(id);
            } catch (e) {
              Alert.alert('Hata', 'Kategori silinirken bir hata oluştu.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdrop}
        />

        {/* Bottom Sheet Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%' }}
        >
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Kategorileri Yönet</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Section: Create Category */}
          <Text style={[styles.label, { color: colors.textMuted }]}>Yeni Kategori Adı</Text>
          <View style={styles.createRow}>
            <TextInput
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="Örn: Yemek Tarifleri, Tasarım..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={isCreating || !newCatName.trim()}
              style={[
                styles.addBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: !newCatName.trim() ? 0.6 : 1,
                },
              ]}
              activeOpacity={0.8}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Plus size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Section: Select Parent Category */}
          <Text style={[styles.label, { color: colors.textMuted, marginTop: 12 }]}>
            Üst Klasör (Opsiyonel) {user?.subscription_type !== 'team' && '🔑 Team'}
          </Text>
          <View style={{ height: 32, marginBottom: 4 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.parentScroll}
              contentContainerStyle={styles.parentContainer}
            >
              {/* Yok option */}
              <TouchableOpacity
                onPress={() => {
                  if (user?.subscription_type !== 'team') {
                    Alert.alert('Ekip Özelliği', 'Alt klasör oluşturma özelliği yalnızca Keepr Team üyelerine özeldir.');
                    return;
                  }
                  setSelectedParentId(null);
                }}
                style={[
                  styles.parentOption,
                  selectedParentId === null && styles.parentOptionSelected,
                  { borderColor: selectedParentId === null ? colors.primary : colors.border }
                ]}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.parentOptionText,
                  { color: selectedParentId === null ? colors.primary : colors.text }
                ]}>
                  Yok (Ana Klasör)
                </Text>
              </TouchableOpacity>

              {categories.filter(c => !c.parent_id).map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    if (user?.subscription_type !== 'team') {
                      Alert.alert('Ekip Özelliği', 'Alt klasör oluşturma özelliği yalnızca Keepr Team üyelerine özeldir.');
                      return;
                    }
                    setSelectedParentId(cat.id);
                  }}
                  style={[
                    styles.parentOption,
                    selectedParentId === cat.id && styles.parentOptionSelected,
                    { borderColor: selectedParentId === cat.id ? colors.primary : colors.border }
                  ]}
                  activeOpacity={0.7}
                >
                  {user?.subscription_type !== 'team' && <Lock size={9} color={colors.textMuted} style={{ marginRight: 4 }} />}
                  <Text style={[
                    styles.parentOptionText,
                    { color: selectedParentId === cat.id ? colors.primary : colors.text }
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Section: Categories List */}
          <Text style={[styles.label, { color: colors.textMuted, marginTop: 20, marginBottom: 8 }]}>
            Mevcut Kategoriler
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.listScroll}
            contentContainerStyle={styles.listContainer}
          >
            {categories.filter(c => !c.parent_id).length > 0 ? (
              categories.filter(c => !c.parent_id).map((cat) => {
                const subCats = categories.filter(sub => sub.parent_id === cat.id);
                return (
                  <View key={cat.id} style={{ marginBottom: 6 }}>
                    {/* Parent Category Row */}
                    <View style={[styles.categoryItem, { borderColor: colors.border }]}>
                      <View style={styles.categoryLeft}>
                        <Folder size={14} color={colors.primary} style={styles.folderIcon} />
                        <View style={styles.nameContainer}>
                          <Text style={[styles.categoryName, { color: colors.text }]}>
                            {cat.name}
                          </Text>
                          {cat.is_public && (
                            <View style={styles.sharedContainer}>
                              <Globe size={9} color="#10B981" />
                              <Text style={[styles.sharedBadge, { color: '#10B981' }]}>
                                AÇIK
                              </Text>
                            </View>
                          )}
                          {cat.collaborator_role && (
                            <View style={[styles.sharedContainer, { backgroundColor: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.15)', flexDirection: 'row', alignItems: 'center' }]}>
                              <Users size={8} color="#8B5CF6" style={{ marginRight: 2 }} />
                              <Text style={[styles.sharedBadge, { color: '#8B5CF6', fontSize: 7.5 }]}>
                                EKİP ({cat.collaborator_role === 'editor' ? 'EDİTÖR' : 'İZLEYİCİ'})
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryActions}>
                        {!cat.collaborator_role && (
                          <>
                            <TouchableOpacity
                              onPress={() => handleShare(cat)}
                              style={styles.actionBtn}
                              activeOpacity={0.6}
                            >
                              {user?.subscription_type !== 'team' && (
                                <Lock size={7} color="#F59E0B" style={{ position: 'absolute', top: 2, right: 2 }} />
                              )}
                              <Share2 size={13} color={cat.is_public ? colors.primary : colors.textMuted} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDelete(cat.id, cat.name)}
                              disabled={deletingId !== null}
                              style={styles.actionBtn}
                              activeOpacity={0.6}
                            >
                              {deletingId === cat.id ? (
                                <ActivityIndicator color={colors.error} size="small" />
                              ) : (
                                <Trash2 size={13} color={colors.error} />
                              )}
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>

                    {/* Subcategories (Indented) */}
                    {subCats.map((sub) => (
                      <View
                        key={sub.id}
                        style={[
                          styles.categoryItem,
                          {
                            borderColor: colors.border,
                            paddingLeft: 24,
                            borderBottomWidth: 0.5,
                            opacity: 0.9
                          }
                        ]}
                      >
                        <View style={styles.categoryLeft}>
                          <Folder size={12} color={colors.textMuted} style={[styles.folderIcon, { opacity: 0.6 }]} />
                          <View style={styles.nameContainer}>
                            <Text style={[styles.categoryName, { color: colors.text, fontSize: 12 }]}>
                              {sub.name}
                            </Text>
                            {sub.collaborator_role && (
                              <View style={[styles.sharedContainer, { backgroundColor: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.15)', flexDirection: 'row', alignItems: 'center' }]}>
                                <Users size={8} color="#8B5CF6" style={{ marginRight: 2 }} />
                                <Text style={[styles.sharedBadge, { color: '#8B5CF6', fontSize: 7.5 }]}>
                                  EKİP
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.categoryActions}>
                          {!sub.collaborator_role && (
                            <TouchableOpacity
                              onPress={() => handleDelete(sub.id, sub.name)}
                              disabled={deletingId !== null}
                              style={styles.actionBtn}
                              activeOpacity={0.6}
                            >
                              {deletingId === sub.id ? (
                                <ActivityIndicator color={colors.error} size="small" />
                              ) : (
                                <Trash2 size={12} color={colors.error} />
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Henüz özel bir kategori oluşturmamışsınız.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
      <CollabShareModal
        isOpen={collabShareCat !== null}
        category={collabShareCat}
        user={user}
        onClose={() => setCollabShareCat(null)}
        onPublicToggle={async (id, isPublic) => {
          const updated = await onShare(id, isPublic);
          if (collabShareCat && collabShareCat.id === id) {
            setCollabShareCat(updated);
          }
          return updated;
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...Typography.titleMedium,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  label: {
    ...Typography.caption,
    marginBottom: 6,
  },
  createRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listScroll: {
    maxHeight: 250,
  },
  listContainer: {
    paddingBottom: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIcon: {
    marginRight: 8,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sharedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 0.5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sharedBadge: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 6,
  },
  parentScroll: {
    height: 32,
  },
  parentContainer: {
    paddingRight: 10,
    gap: 8,
    alignItems: 'center',
  },
  parentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: Radius.medium,
    backgroundColor: 'transparent',
  },
  parentOptionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  parentOptionText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
