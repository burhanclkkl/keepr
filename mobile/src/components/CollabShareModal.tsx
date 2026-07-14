import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Share,
  Switch,
} from 'react-native';
import { X, Share2, Users, User, Trash2, Link as LinkIcon, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../theme';
import api from '../services/api';
import { API_URL } from '../config/api';

interface Collaborator {
  id: number;
  category_id: number;
  user_id: number;
  username: string;
  email: string;
  role: 'viewer' | 'editor';
  joined_at: string;
}

interface CollabShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: any;
  user: any;
  onPublicToggle: (id: number, isPublic: boolean) => Promise<any>;
}

export const CollabShareModal: React.FC<CollabShareModalProps> = ({
  isOpen,
  onClose,
  category,
  user,
  onPublicToggle,
}) => {
  const { colors } = useTheme();
  const [isPublic, setIsPublic] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    if (isOpen && category) {
      setIsPublic(!!category.is_public);
      setGeneratedLink('');
      setInviteRole('viewer');
      fetchCollaborators();
    }
  }, [isOpen, category]);

  const fetchCollaborators = async () => {
    if (!category) return;
    try {
      setLoadingCollabs(true);
      const response = await api.get(`/api/collaborators/category/${category.id}`);
      setCollaborators(response.data);
    } catch (err) {
      console.error('Error fetching collaborators:', err);
    } finally {
      setLoadingCollabs(false);
    }
  };

  const handlePublicSwitch = async (value: boolean) => {
    if (!category) return;
    try {
      setTogglingPublic(true);
      await onPublicToggle(category.id, value);
      setIsPublic(value);
    } catch (err) {
      Alert.alert('Hata', 'Paylaşım durumu güncellenemedi.');
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleCreateInviteLink = async () => {
    if (!category) return;
    try {
      setGeneratingLink(true);
      const response = await api.post('/api/invite', {
        category_id: category.id,
        role: inviteRole,
      });
      // Generate url: keepr://invite/<token>
      const inviteUrl = `keepr://invite/${response.data.token}`;
      setGeneratedLink(inviteUrl);
      
      // Prompt user to share instantly
      await Share.share({
        message: `Keepr Ortak Klasör Daveti!\n\n"${category.name}" klasörüne ${
          inviteRole === 'editor' ? 'Editör' : 'İzleyici'
        } olarak katılmak için bu davet kodunu uygulamada kullanın veya linke tıklayın:\n${inviteUrl}`,
        title: `${category.name} Davet`,
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Davet linki oluşturulamadı.';
      Alert.alert('Hata', errorMsg);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleRemoveCollaborator = async (collabId: number) => {
    Alert.alert(
      'Ortağı Çıkar',
      'Bu üyeyi klasör ortaklığından çıkarmak istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/collaborators/${collabId}`);
              setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
            } catch (err) {
              Alert.alert('Hata', 'Ortak klasörden çıkarılamadı.');
            }
          },
        },
      ]
    );
  };

  if (!category) return null;

  const isTeam = user?.subscription_type === 'team';

  // Public share link url
  const hostMatch = API_URL.match(/https?:\/\/([^:]+)/);
  const host = hostMatch ? hostMatch[1] : 'localhost';
  const shareUrl = API_URL.includes('keepr.example.com')
    ? `https://keepr.example.com/shared/${category.share_slug}`
    : `http://${host}:5173/shared/${category.share_slug}`;

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <Share2 size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Koleksiyonu Paylaş</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Scroll Content */}
          <FlatList
            data={[]}
            renderItem={null}
            ListEmptyComponent={
              <View style={styles.scrollBody}>
                {/* 1. Public Share Section */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>1. Herkese Açık Paylaşım</Text>
                  
                  <View style={[styles.rowBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.rowBoxInfo}>
                      <Text style={[styles.rowBoxTitle, { color: colors.text }]}>Bağlantıyı Paylaş</Text>
                      <Text style={styles.rowBoxSub}>Ziyaretçiler listeyi salt okunur görebilir</Text>
                    </View>
                    {togglingPublic ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Switch
                        value={isPublic}
                        onValueChange={handlePublicSwitch}
                        trackColor={{ false: '#d1d5db', true: colors.primary }}
                        thumbColor={isPublic ? '#fff' : '#f3f4f6'}
                      />
                    )}
                  </View>

                  {isPublic && category.share_slug && (
                    <TouchableOpacity
                      onPress={() => {
                        Share.share({
                          message: `Keepr Koleksiyonu: ${category.name}\n\nBağlantıyı görüntüleyin:\n${shareUrl}`,
                        });
                      }}
                      style={[styles.shareLinkBox, { backgroundColor: colors.background, borderColor: colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.shareLinkText, { color: colors.primary }]} numberOfLines={1}>
                        {shareUrl}
                      </Text>
                      <View style={[styles.shareBtn, { backgroundColor: colors.primary }]}>
                        <Text style={styles.shareBtnText}>Paylaş</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* 2. Team Collaborative Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Users size={14} color="#8B5CF6" style={{ marginRight: 6 }} />
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>2. Ortak Çalışma & Ekip (Team)</Text>
                  </View>

                  {!isTeam ? (
                    <View style={[styles.restrictedBox, { backgroundColor: 'rgba(139, 92, 246, 0.04)', borderColor: 'rgba(139, 92, 246, 0.15)' }]}>
                      <Users size={22} color="#8B5CF6" style={{ marginBottom: 6 }} />
                      <Text style={[styles.restrictedTitle, { color: colors.text }]}>Team Aboneliği Gerekli</Text>
                      <Text style={[styles.restrictedText, { color: colors.textMuted }]}>
                        Başkalarını bu klasöre davet edip birlikte düzenlemek (Viewer/Editor) için Team planına yükseltin.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.teamContainer}>
                      {/* Invite Generation Box */}
                      <View style={[styles.inviteGenBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.inviteRoleRow}>
                          <Text style={[styles.inviteGenTitle, { color: colors.text }]}>Yeni Ortak Davet Et</Text>
                          <View style={[styles.roleTabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <TouchableOpacity
                              onPress={() => setInviteRole('viewer')}
                              style={[styles.roleTab, inviteRole === 'viewer' && { backgroundColor: colors.primary }]}
                            >
                              <Text style={[styles.roleTabText, inviteRole === 'viewer' && { color: '#fff' }]}>İzleyici</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setInviteRole('editor')}
                              style={[styles.roleTab, inviteRole === 'editor' && { backgroundColor: colors.primary }]}
                            >
                              <Text style={[styles.roleTabText, inviteRole === 'editor' && { color: '#fff' }]}>Editör</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {generatedLink ? (
                          <View style={styles.generatedLinkRow}>
                            <Text style={[styles.generatedLinkText, { color: colors.textMuted }]} numberOfLines={1}>
                              {generatedLink}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                Share.share({
                                  message: `Keepr Ortak Klasör Daveti!\n\n"${category.name}" klasörüne katılım davetiyesi:\n${generatedLink}`,
                                });
                              }}
                              style={[styles.copyBtn, { backgroundColor: colors.primary }]}
                            >
                              <Text style={styles.copyBtnText}>Paylaş</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={handleCreateInviteLink}
                            disabled={generatingLink}
                            style={[styles.generateBtn, { backgroundColor: '#8B5CF6' }]}
                            activeOpacity={0.8}
                          >
                            {generatingLink ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <LinkIcon size={12} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={styles.generateBtnText}>Davet Linki Oluştur</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Current Collaborators */}
                      <View style={styles.collabsSection}>
                        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Aktif Ekip Üyeleri</Text>
                        {loadingCollabs ? (
                          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
                        ) : collaborators.length === 0 ? (
                          <Text style={[styles.emptyCollabsText, { color: colors.textMuted }]}>
                            Bu klasörde henüz başka bir ortak bulunmuyor.
                          </Text>
                        ) : (
                          <View style={styles.collabsList}>
                            {collaborators.map((collab) => (
                              <View
                                key={collab.id}
                                style={[styles.collabItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                              >
                                <View style={styles.collabUserRow}>
                                  <View style={[styles.avatar, { backgroundColor: colors.border }]}>
                                    <User size={10} color={colors.text} />
                                  </View>
                                  <View style={styles.collabUserInfo}>
                                    <Text style={[styles.collabUsername, { color: colors.text }]} numberOfLines={1}>
                                      @{collab.username}
                                    </Text>
                                    <Text style={[styles.collabEmail, { color: colors.textMuted }]} numberOfLines={1}>
                                      {collab.email}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.collabActions}>
                                  <View
                                    style={[
                                      styles.roleBadge,
                                      {
                                        backgroundColor:
                                          collab.role === 'editor'
                                            ? 'rgba(139, 92, 246, 0.1)'
                                            : 'rgba(99, 102, 241, 0.1)',
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.roleBadgeText,
                                        { color: collab.role === 'editor' ? '#8B5CF6' : '#6366F1' },
                                      ]}
                                    >
                                      {collab.role === 'editor' ? 'Editör' : 'İzleyici'}
                                    </Text>
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => handleRemoveCollaborator(collab.id)}
                                    style={styles.collabDeleteBtn}
                                  >
                                    <Trash2 size={12} color="#f43f5e" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: Radius.large * 1.5,
    borderTopRightRadius: Radius.large * 1.5,
    maxHeight: '85%',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  rowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: Radius.medium * 1.5,
    borderWidth: 1,
  },
  rowBoxInfo: {
    flex: 1,
    paddingRight: 12,
  },
  rowBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowBoxSub: {
    fontSize: 9,
    color: '#94a3b8',
  },
  shareLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: Radius.medium * 1.5,
    borderWidth: 1,
    marginTop: 8,
  },
  shareLinkText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '500',
    paddingHorizontal: 8,
  },
  shareBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.small * 1.5,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  restrictedBox: {
    padding: 20,
    borderRadius: Radius.medium * 1.5,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictedTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  restrictedText: {
    fontSize: 9.5,
    textAlign: 'center',
    lineHeight: 14,
  },
  teamContainer: {
    marginTop: 2,
  },
  inviteGenBox: {
    padding: 14,
    borderRadius: Radius.medium * 1.5,
    borderWidth: 1,
    marginBottom: 16,
  },
  inviteRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inviteGenTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  roleTabs: {
    flexDirection: 'row',
    borderRadius: Radius.small * 1.5,
    borderWidth: 1,
    padding: 2,
  },
  roleTab: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.small,
  },
  roleTabText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
  },
  generatedLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: Radius.small * 1.5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  generatedLinkText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  copyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.small * 1.5,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.small * 1.5,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  collabsSection: {
    marginTop: 4,
  },
  sectionSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyCollabsText: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  collabsList: {
    marginTop: 2,
  },
  collabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: Radius.small * 1.5,
    borderWidth: 1,
    marginBottom: 6,
  },
  collabUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  collabUserInfo: {
    flex: 1,
  },
  collabUsername: {
    fontSize: 10,
    fontWeight: '700',
  },
  collabEmail: {
    fontSize: 9,
  },
  collabActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.small,
    marginRight: 8,
  },
  roleBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  collabDeleteBtn: {
    padding: 6,
    borderRadius: Radius.small,
  },
});
