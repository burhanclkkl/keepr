import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Users, AlertTriangle, Check, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../theme';
import api from '../services/api';

interface InviteDetails {
  id: number;
  category_id: number;
  category_name: string;
  inviter_id: number;
  inviter_username: string;
  token: string;
  role: 'viewer' | 'editor';
  expires_at: string;
  is_used: boolean;
  is_expired: boolean;
}

interface AcceptInviteModalProps {
  isOpen: boolean;
  token: string | null;
  onClose: (success: boolean) => void;
}

export const AcceptInviteModal: React.FC<AcceptInviteModalProps> = ({
  isOpen,
  token,
  onClose,
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      fetchInviteDetails();
    }
  }, [isOpen, token]);

  const fetchInviteDetails = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      setDetails(null);
      setSuccess(false);
      const response = await api.get(`/api/invite/${token}`);
      setDetails(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Davetiye bilgileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    try {
      setAccepting(true);
      await api.post(`/api/invite/${token}/accept`);
      setSuccess(true);
      setTimeout(() => {
        onClose(true);
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Davet kabul edilemedi.';
      Alert.alert('Hata', errorMsg);
    } finally {
      setAccepting(false);
    }
  };

  if (!isOpen || !token) return null;

  return (
    <Modal visible={isOpen} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Top colored strip */}
          <View style={styles.headerIndicator} />

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.textMuted, marginTop: 12 }]}>
                Davetiye yükleniyor...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <AlertTriangle size={28} color="#ef4444" />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Davet Geçersiz</Text>
              <Text style={[styles.description, { color: colors.textMuted }]}>{error}</Text>
              
              <TouchableOpacity
                onPress={() => onClose(false)}
                style={[styles.actionBtn, { backgroundColor: colors.border, marginTop: 16 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: colors.text }]}>Kapat</Text>
              </TouchableOpacity>
            </View>
          ) : success ? (
            <View style={styles.centerContainer}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Check size={28} color="#10b981" />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Katıldınız!</Text>
              <Text style={[styles.description, { color: colors.textMuted }]}>
                Ortak klasöre başarıyla katıldınız.
              </Text>
            </View>
          ) : details ? (
            <View style={styles.contentContainer}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Users size={28} color={colors.primary} />
              </View>
              
              <Text style={[styles.title, { color: colors.text }]}>Ortak Klasör Daveti</Text>
              
              <Text style={[styles.description, { color: colors.textMuted }]}>
                <Text style={{ fontWeight: '800', color: colors.primary }}>@{details.inviter_username}</Text> sizi{' '}
                <Text style={{ fontWeight: '800', color: colors.text }}>"{details.category_name}"</Text> adlı ortak klasöre katılmaya davet ediyor.
              </Text>

              {/* Role detail badge */}
              <View style={[styles.roleBadgeContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.roleBadgeLabel, { color: colors.textMuted }]}>Erişim Rolünüz</Text>
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor:
                        details.role === 'editor'
                          ? 'rgba(139, 92, 246, 0.1)'
                          : 'rgba(99, 102, 241, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      { color: details.role === 'editor' ? '#8B5CF6' : '#6366F1' },
                    ]}
                  >
                    {details.role === 'editor' ? 'Editör (Düzenleyebilir)' : 'İzleyici (Salt Okunur)'}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  onPress={() => onClose(false)}
                  disabled={accepting}
                  style={[styles.sideBtn, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sideBtnText, { color: colors.text }]}>Vazgeç</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAccept}
                  disabled={accepting}
                  style={[styles.mainBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  {accepting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.mainBtnText}>Kabul Et</Text>
                      <ArrowRight size={14} color="#fff" style={{ marginLeft: 4 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.large * 1.25,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerIndicator: {
    height: 4,
    backgroundColor: '#8B5CF6',
  },
  centerContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: Radius.medium,
    borderWidth: 1,
    width: '100%',
    marginBottom: 24,
  },
  roleBadgeLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.small,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  sideBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mainBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
