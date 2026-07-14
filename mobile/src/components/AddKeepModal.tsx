import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Typography, Radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { Plus, X, AlignLeft, Type } from 'lucide-react-native';

interface Category {
  id: number;
  name: string;
  parent_id?: number | null;
  collaborator_role?: 'viewer' | 'editor' | null;
}

interface AddKeepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string, categoryId: number | null, title?: string, description?: string) => Promise<void>;
  categories: Category[];
  isLoading: boolean;
  defaultCategoryId: number | null;
  prefilledUrl?: string;
}

export const AddKeepModal: React.FC<AddKeepModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  categories,
  isLoading,
  defaultCategoryId,
  prefilledUrl,
}) => {
  const { colors } = useTheme();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

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

  useEffect(() => {
    if (isOpen) {
      setUrl(prefilledUrl || '');
      setTitle('');
      setDescription('');
      setSelectedCategoryId(defaultCategoryId);
    }
  }, [isOpen, prefilledUrl, defaultCategoryId]);

  const handleAdd = async () => {
    if (!url.trim()) return;

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    await onAdd(formattedUrl, selectedCategoryId, title.trim() || undefined, description.trim() || undefined);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        {/* Backdrop */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdrop}
        />

        {/* Modal Card */}
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Yeni Bağlantı Ekle</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* URL Input */}
          <Text style={[styles.label, { color: colors.textMuted }]}>Bağlantı Adresi (URL)</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="example.com/page"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            }]}
          />

          {/* Title Input */}
          <Text style={[styles.label, { color: colors.textMuted }]}>Başlık <Text style={{ fontWeight: '400', opacity: 0.6 }}>(opsiyonel)</Text></Text>
          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Type size={13} color={colors.textMuted} />
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Otomatik çekilir, düzenleyebilirsin"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.inputWithIcon, {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              }]}
            />
          </View>

          {/* Description Input */}
          <View style={styles.descLabelRow}>
            <AlignLeft size={11} color={colors.textMuted} />
            <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0, marginLeft: 4 }]}>
              Açıklama <Text style={{ fontWeight: '400', opacity: 0.6 }}>(opsiyonel)</Text>
            </Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Bu linki neden kaydediyorsun?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
            style={[styles.descInput, {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            }]}
          />

          {/* Category Selector */}
          <Text style={[styles.label, { color: colors.textMuted, marginTop: 14, marginBottom: 8 }]}>
            Kategori Seçin
          </Text>
          <View style={styles.categoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(null)}
                style={[
                  styles.categoryBadge,
                  { backgroundColor: selectedCategoryId === null ? colors.primary : colors.background },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryText, {
                  color: selectedCategoryId === null ? '#fff' : colors.textMuted,
                }]}>
                  Genel
                </Text>
              </TouchableOpacity>

              {sortedCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: isSelected ? colors.primary : colors.background },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryText, {
                      color: isSelected ? '#fff' : colors.textMuted,
                    }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            onPress={handleAdd}
            disabled={isLoading || !url.trim()}
            style={[styles.addBtn, {
              backgroundColor: colors.primary,
              opacity: !url.trim() ? 0.5 : 1,
            }]}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Plus size={16} color="#fff" style={styles.btnIcon} />
                <Text style={styles.addBtnText}>Bağlantıyı Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  container: {
    width: '100%',
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
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
  descLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 36,
  },
  descInput: {
    minHeight: 60,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 12,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  categoriesContainer: {
    height: 36,
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
    borderRadius: Radius.medium,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addBtn: {
    height: 46,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  btnIcon: {
    marginRight: 6,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
