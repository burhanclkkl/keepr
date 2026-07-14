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
  Alert,
  Linking,
} from 'react-native';
import { Typography, Radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { X, Save, Trash2, ExternalLink, Calendar, Bell, Check, Users } from 'lucide-react-native';
import { Keep } from './KeepCard';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface Category {
  id: number;
  name: string;
  parent_id?: number | null;
  collaborator_role?: 'viewer' | 'editor' | null;
}

interface InspectorSheetProps {
  keep: Keep | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: number, data: { title: string; description: string; category_id: number | null }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  categories: Category[];
  onTriggerProModal?: (feature: string) => void;
  onRefreshKeep?: (keep: Keep) => void;
}

export const InspectorSheet: React.FC<InspectorSheetProps> = ({
  keep,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  categories,
  onTriggerProModal,
  onRefreshKeep,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();

  const isReadOnly = useMemo(() => {
    if (!keep) return false;
    if (keep.user_id === user?.id) return false;
    if (!keep.category_id) return false;
    const cat = categories.find(c => c.id === keep.category_id);
    return cat?.collaborator_role === 'viewer';
  }, [keep, categories, user]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [isUpdatingReminder, setIsUpdatingReminder] = useState(false);
  const [showCustomReminder, setShowCustomReminder] = useState(false);

  useEffect(() => {
    if (keep) {
      setTitle(keep.title || '');
      setDescription(keep.description || '');
      setSelectedCategoryId(keep.category_id);
      
      if (keep.reminder_at) {
        try {
          const d = new Date(keep.reminder_at);
          const pad = (n: number) => String(n).padStart(2, '0');
          setCustomDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          setCustomTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
        } catch (e) {
          setCustomDate('');
          setCustomTime('');
        }
      } else {
        setCustomDate('');
        setCustomTime('');
        setShowCustomReminder(false);
      }
    }
  }, [keep, isOpen]);

  const getTodayEvening = () => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    if (d.getTime() < Date.now()) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  };

  const getTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const getTomorrowEvening = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    return d;
  };

  const getThreeDaysLater = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const getOneWeekLater = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const handleSetQuickReminder = async (getDate: () => Date) => {
    if (!keep) return;
    setIsUpdatingReminder(true);
    try {
      const date = getDate();
      const response = await api.post(`/api/keeps/${keep.id}/reminder`, {
        reminder_at: date.toISOString(),
      });
      Alert.alert('Başarılı', 'Alarm başarıyla kuruldu.');
      if (response.data.keep) {
        onRefreshKeep?.(response.data.keep);
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || 'Alarm kurulurken hata oluştu.';
      Alert.alert('Hata', errMsg);
    } finally {
      setIsUpdatingReminder(false);
    }
  };

  const handleSetCustomReminder = async () => {
    if (!keep) return;
    if (!customDate || !customTime) {
      Alert.alert('Hata', 'Lütfen geçerli tarih ve saat girin.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    if (!dateRegex.test(customDate) || !timeRegex.test(customTime)) {
      Alert.alert('Hata', 'Tarih formatı YYYY-MM-DD ve Saat formatı HH:MM olmalıdır.');
      return;
    }

    setIsUpdatingReminder(true);
    try {
      const dt = new Date(`${customDate}T${customTime}:00`);
      if (isNaN(dt.getTime())) {
        Alert.alert('Hata', 'Geçersiz tarih veya saat değeri.');
        setIsUpdatingReminder(false);
        return;
      }

      const response = await api.post(`/api/keeps/${keep.id}/reminder`, {
        reminder_at: dt.toISOString(),
      });
      Alert.alert('Başarılı', 'Alarm başarıyla kuruldu.');
      if (response.data.keep) {
        onRefreshKeep?.(response.data.keep);
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || 'Alarm kurulurken hata oluştu.';
      Alert.alert('Hata', errMsg);
    } finally {
      setIsUpdatingReminder(false);
    }
  };

  const handleClearReminder = async () => {
    if (!keep) return;
    setIsUpdatingReminder(true);
    try {
      const response = await api.post(`/api/keeps/${keep.id}/reminder`, {
        reminder_at: null,
      });
      Alert.alert('Başarılı', 'Alarm kaldırıldı.');
      setCustomDate('');
      setCustomTime('');
      setShowCustomReminder(false);
      if (response.data.keep) {
        onRefreshKeep?.(response.data.keep);
      }
    } catch (e) {
      Alert.alert('Hata', 'Alarm kaldırılırken hata oluştu.');
    } finally {
      setIsUpdatingReminder(false);
    }
  };

  if (!keep) return null;

  const handleSave = async () => {
    // Use URL domain as fallback title if user cleared the field
    const finalTitle = title.trim() || (keep.url ? new URL(keep.url.startsWith('http') ? keep.url : 'https://' + keep.url).hostname : keep.url);
    setIsSaving(true);
    try {
      await onUpdate(keep.id, {
        title: finalTitle,
        description: description.trim(),
        category_id: selectedCategoryId
      });
      onClose();
    } catch (e) {
      Alert.alert('Hata', 'Güncelleme sırasında hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
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

        {/* Bottom Sheet Card */}
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Detayları İncele</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {isReadOnly && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: 'rgba(99, 102, 241, 0.08)', borderRadius: Radius.medium, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)' }}>
                <Users size={12} color="#6366f1" />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#6366f1', flex: 1 }}>
                  Bu bağlantı paylaşılan bir klasörde bulunmaktadır ve sadece görüntüleme (İzleyici) yetkiniz vardır.
                </Text>
              </View>
            )}

            {/* Clickable URL — opens in system browser */}
            <TouchableOpacity
              onPress={async () => {
                if (!keep?.url) return;
                const url = keep.url.startsWith('http') ? keep.url : 'https://' + keep.url;
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('Hata', 'Bu bağlantı açılamıyor: ' + url);
                }
              }}
              activeOpacity={0.7}
              style={[styles.urlBar, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.urlText, { color: colors.textMuted }]} numberOfLines={1}>
                {keep.url}
              </Text>
              <ExternalLink size={14} color={colors.primary} />
            </TouchableOpacity>

            {/* Editable Title */}
            <Text style={[styles.label, { color: colors.textMuted, marginTop: 12 }]}>Başlık</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Başlık girin..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, opacity: isReadOnly ? 0.7 : 1 }]}
              editable={!isReadOnly}
            />

            {/* Editable Description */}
            <Text style={[styles.label, { color: colors.textMuted, marginTop: 12 }]}>Açıklama</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Açıklama girin..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, height: 60, paddingTop: 8, textAlignVertical: 'top', opacity: isReadOnly ? 0.7 : 1 }]}
              editable={!isReadOnly}
            />

            {/* Category selection */}
            <Text style={[styles.label, { color: colors.textMuted, marginTop: 16, marginBottom: 8 }]}>
              Kategori Taşı
            </Text>
            <View style={styles.categoriesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {/* Uncategorized */}
                <TouchableOpacity
                  onPress={() => setSelectedCategoryId(null)}
                  disabled={isReadOnly}
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: selectedCategoryId === null ? colors.primary : colors.background,
                      opacity: isReadOnly ? 0.6 : 1,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: selectedCategoryId === null ? '#fff' : colors.textMuted,
                      },
                    ]}
                  >
                    Genel
                  </Text>
                </TouchableOpacity>

                {/* Categories */}
                {sortedCategories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      disabled={isReadOnly}
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          opacity: isReadOnly ? 0.6 : 1,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          {
                            color: isSelected ? '#fff' : colors.textMuted,
                          },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ALARM / REMINDER SECTION */}
            <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 16, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Bell size={14} color={colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Akıllı Hatırlatıcı & Alarm
                </Text>
              </View>

              {!user?.is_pro ? (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onTriggerProModal?.('reminder');
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.2)',
                    borderRadius: Radius.medium,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#d97706' }}>Pro & Team Özelliği</Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>Okuma alarmları kurmak için dokunun.</Text>
                  </View>
                  <View style={{ backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff' }}>YÜKSELT</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={{ marginBottom: 16 }}>
                  {keep.reminder_at ? (
                    <View style={{ padding: 12, backgroundColor: colors.background, borderRadius: Radius.medium, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>Planlanan Alarm</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                          {formatDate(keep.reminder_at)} - {new Date(keep.reminder_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {keep.is_reminder_sent && (
                          <Text style={{ fontSize: 9, color: '#10b981', fontWeight: '700', marginTop: 4 }}>✓ Gönderildi (E-posta)</Text>
                        )}
                      </View>
                      {!isReadOnly && (
                        <TouchableOpacity
                          onPress={handleClearReminder}
                          disabled={isUpdatingReminder}
                          style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 8 }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#ef4444' }}>Kaldır</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : isReadOnly ? (
                    <View style={{ padding: 12, backgroundColor: colors.background, borderRadius: Radius.medium, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>Planlanmış bir alarm bulunmamaktadır.</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '700', marginBottom: 2 }}>Hızlı Alarm Kur:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                        <TouchableOpacity
                          onPress={() => handleSetQuickReminder(getTodayEvening)}
                          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>Bugün Akşam (20:00)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleSetQuickReminder(getTomorrowMorning)}
                          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>Yarın Sabah (09:00)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleSetQuickReminder(getTomorrowEvening)}
                          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>Yarın Akşam (20:00)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleSetQuickReminder(getThreeDaysLater)}
                          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>3 Gün Sonra</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleSetQuickReminder(getOneWeekLater)}
                          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>1 Hafta Sonra</Text>
                        </TouchableOpacity>
                      </ScrollView>

                      {!showCustomReminder ? (
                        <TouchableOpacity
                          onPress={() => {
                            const now = new Date();
                            const pad = (n: number) => String(n).padStart(2, '0');
                            setCustomDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
                            setCustomTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
                            setShowCustomReminder(true);
                          }}
                          style={{ alignSelf: 'flex-start', marginTop: 4 }}
                        >
                          <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '800' }}>+ Özel Tarih ve Saat Seç</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ gap: 8, padding: 10, backgroundColor: colors.background, borderRadius: Radius.medium, borderWidth: 1, borderColor: colors.border, marginTop: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>Özel Alarm Detayı:</Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 4 }}>Tarih (YYYY-MM-DD)</Text>
                              <TextInput
                                value={customDate}
                                onChangeText={setCustomDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.textMuted}
                                style={[styles.input, { height: 36, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 4 }}>Saat (HH:MM)</Text>
                              <TextInput
                                value={customTime}
                                onChangeText={setCustomTime}
                                placeholder="HH:MM"
                                placeholderTextColor={colors.textMuted}
                                style={[styles.input, { height: 36, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                              />
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                            <TouchableOpacity
                              onPress={handleSetCustomReminder}
                              disabled={isUpdatingReminder}
                              style={{ flex: 1, height: 34, backgroundColor: colors.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>Alarmı Kur</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setShowCustomReminder(false)}
                              style={{ flex: 1, height: 34, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted }}>Vazgeç</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Date info */}
            <View style={[styles.infoRow, { borderColor: colors.border }]}>
              <Calendar size={12} color={colors.textMuted} />
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Kayıt Tarihi</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(keep.created_at)}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              {isReadOnly ? (
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.saveBtnText, { color: colors.text }]}>Kapat</Text>
                </TouchableOpacity>
              ) : (
                <>
                  {/* Save changes */}
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving || (title.trim() === (keep.title || '') && description.trim() === (keep.description || '') && selectedCategoryId === keep.category_id)}
                    style={[
                      styles.saveBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: isSaving || (title.trim() === (keep.title || '') && description.trim() === (keep.description || '') && selectedCategoryId === keep.category_id) ? 0.6 : 1,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Save size={16} color="#fff" style={styles.btnIcon} />
                        <Text style={styles.saveBtnText}>Değişiklikleri Kaydet</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Delete button */}
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={isDeleting}
                    style={[styles.deleteBtn, { borderColor: colors.error }]}
                    activeOpacity={0.7}
                  >
                    {isDeleting ? (
                      <ActivityIndicator color={colors.error} size="small" />
                    ) : (
                      <>
                        <Trash2 size={16} color={colors.error} style={styles.btnIcon} />
                        <Text style={styles.deleteBtnText}>Bağlantıyı Sil</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {keep && (
        <ConfirmModal
          isOpen={deleteConfirmOpen}
          title="Bağlantıyı Sil"
          message="Bu bağlantıyı silmek istediğinizden emin misiniz?"
          confirmText="Sil"
          cancelText="Vazgeç"
          variant="danger"
          onConfirm={async () => {
            setDeleteConfirmOpen(false);
            setIsDeleting(true);
            try {
              await onDelete(keep.id);
              onClose();
            } catch (e) {
              Alert.alert('Hata', 'Silme işlemi başarısız oldu.');
            } finally {
              setIsDeleting(false);
            }
          }}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}
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
    maxHeight: '80%',
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
    marginBottom: 16,
  },
  title: {
    ...Typography.titleMedium,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  urlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.medium,
    marginBottom: 16,
  },
  urlText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  label: {
    ...Typography.caption,
    marginBottom: 6,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  categoriesContainer: {
    height: 36,
    marginBottom: 16,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  actionsContainer: {
    marginTop: 24,
    gap: 12,
  },
  saveBtn: {
    height: 44,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    height: 44,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  btnIcon: {
    marginRight: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
