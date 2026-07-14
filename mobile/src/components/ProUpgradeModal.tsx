import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Crown, Check, Lock, Palette, Pin, Heart, FolderTree, Sparkles, Bell } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { SubscriptionService } from '../services/subscriptionService';

// Brand accent color — matches the web app's emerald green
const ACCENT = '#10b981';
const ACCENT_LIGHT = 'rgba(16, 185, 129, 0.10)';
const ACCENT_BORDER = 'rgba(16, 185, 129, 0.18)';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string | null;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose, feature }) => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [upgradedTier, setUpgradedTier] = useState<'pro' | 'team'>('pro');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const featureLabels: Record<string, string> = {
    theme: 'Özel Temalar & Koyu Mod',
    favorite: 'Favorilere Ekleme',
    pin: 'Bağlantıları Başa Sabitleme',
    folder: 'İç İçe Alt Klasörler',
    reminder: 'Akıllı Alarm & Hatırlatıcı',
  };

  const proFeatures = [
    {
      icon: <Palette size={14} color={ACCENT} />,
      title: 'Sınırsız Tema Özelleştirmesi',
      desc: 'Koyu mod ve 5 farklı renk paletini dilediğiniz gibi kullanın.',
    },
    {
      icon: <Pin size={14} color={ACCENT} />,
      title: 'Bağlantı Sabitleme (Pins)',
      desc: 'En kritik bağlantılarınızı listenin en üstüne sabitleyin.',
    },
    {
      icon: <Heart size={14} color={ACCENT} />,
      title: 'Sınırsız Favoriler',
      desc: 'Sık eriştiğiniz bağlantıları tek tıkla favorileyin.',
    },
    {
      icon: <Bell size={14} color={ACCENT} />,
      title: 'Akıllı Alarm & Hatırlatıcılar',
      desc: 'Linklerinize hatırlatma tarihi kurun, zamanı gelince bildirim alın.',
    },
    {
      icon: <FolderTree size={14} color={ACCENT} />,
      title: 'Akıllı Alt Klasörler & Ekip Paylaşımı',
      desc: 'İç içe geçmiş koleksiyonlar ve ekip arkadaşlarınızla ortak klasörler.',
    },
  ];

  const handleUpgradeMock = async (targetTier: 'pro' | 'team') => {
    setLoading(true);
    setInfoMessage(null);
    setUpgradedTier(targetTier);
    try {
      const res = await SubscriptionService.upgradeMock(targetTier);
      setUser(res.user);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2200);
    } catch (err: any) {
      console.error(err);
      setInfoMessage('Abonelik yükseltme işlemi başarısız oldu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleRealUpgradeClick = () => {
    setInfoMessage('Ödeme altyapısı (App Store / Google Play) yakında aktif olacaktır. Test için ücretsiz yükseltme butonlarını kullanabilirsiniz.');
  };

  const isAlreadyTeam = user?.subscription_type === 'team';
  const isAlreadyPro = user?.subscription_type === 'pro';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={loading || success ? undefined : onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to close */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={loading || success ? undefined : onClose}
        />

        {/* Modal Card */}
        <View style={styles.container}>
          {/* Top accent stripe */}
          <View style={[styles.accentStripe, isAlreadyPro && { backgroundColor: '#8b5cf6' }]} />

          {/* Close button */}
          {!(loading || success) && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={15} color="#94a3b8" />
            </TouchableOpacity>
          )}

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {success ? (
              /* ── SUCCESS STATE ── */
              <View style={styles.successContainer}>
                <View style={[styles.successBadge, upgradedTier === 'team' && { backgroundColor: '#8b5cf6' }]}>
                  <Check size={38} color="#ffffff" strokeWidth={3} />
                </View>
                <Text style={styles.successTitle}>Tebrikler! 🎉</Text>
                <Text style={styles.successSubtitle}>
                  Hesabınız başarıyla{' '}
                  <Text style={{ fontWeight: 'bold', color: upgradedTier === 'team' ? '#8b5cf6' : ACCENT }}>
                    Keepr {upgradedTier === 'team' ? 'Team' : 'Pro'}
                  </Text>{' '}
                  sürümüne yükseltildi. Tüm özellikler açıldı!
                </Text>
              </View>
            ) : isAlreadyTeam ? (
              /* ── ALREADY TEAM STATE ── */
              <View style={styles.successContainer}>
                <View style={[styles.successBadge, { backgroundColor: '#8b5cf6' }]}>
                  <Crown size={38} color="#ffffff" />
                </View>
                <Text style={styles.successTitle}>Keepr Team Aktif! 👑</Text>
                <Text style={styles.successSubtitle}>
                  Tebrikler, en üst pakettesiniz. Ekip paylaşım ve tüm pro özellikleriniz tam yetkiyle açık.
                </Text>
              </View>
            ) : (
              <>
                {/* Crown Badge */}
                <View style={[styles.crownBadge, isAlreadyPro && { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.18)' }]}>
                  <Crown size={26} color={isAlreadyPro ? '#8b5cf6' : ACCENT} fill={isAlreadyPro ? 'rgba(139, 92, 246, 0.1)' : ACCENT_LIGHT} />
                </View>

                {/* Title */}
                <Text style={styles.title}>
                  {isAlreadyPro ? "Keepr Team'e Geçiş Yapın" : "Keepr Sürümünüzü Yükseltin"}
                </Text>

                {/* Locked Feature Alert */}
                {feature && featureLabels[feature] && (
                  <View style={styles.alertBox}>
                    <Lock size={12} color={ACCENT} style={{ marginRight: 8, marginTop: 1 }} />
                    <Text style={styles.alertText}>
                      <Text style={{ fontWeight: '700', color: '#374151' }}>{featureLabels[feature]}</Text>
                      {' '}özelliğini kullanmak için aboneliğinizi yükseltmeniz gerekmektedir.
                    </Text>
                  </View>
                )}

                {/* Features List */}
                <View style={styles.featuresList}>
                  {proFeatures.map((f, i) => (
                    <View key={i} style={styles.featureItem}>
                      <View style={[styles.featureIconWrap, isAlreadyPro && { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.18)' }]}>
                        {isAlreadyPro ? <Crown size={14} color="#8b5cf6" /> : f.icon}
                      </View>
                      <View style={styles.featureTextWrapper}>
                        <View style={styles.featureTitleRow}>
                          <Text style={styles.featureTitle}>{f.title}</Text>
                        </View>
                        <Text style={styles.featureDesc}>{f.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Info Message */}
                {infoMessage && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>{infoMessage}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionsWrapper}>
                  {/* If user is free, show Pro upgrade button */}
                  {!isAlreadyPro && (
                    <TouchableOpacity
                      onPress={() => handleUpgradeMock('pro')}
                      disabled={loading}
                      style={styles.primaryBtn}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Sparkles size={13} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
                          <Text style={styles.primaryBtnText}>Test İçin Pro Sürümüne Yükselt</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Team Upgrade Button */}
                  <TouchableOpacity
                    onPress={() => handleUpgradeMock('team')}
                    disabled={loading}
                    style={styles.teamBtn}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Crown size={13} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
                        <Text style={styles.teamBtnText}>
                          {isAlreadyPro ? "Team Sürümüne Yükselt (Ortak Klasörler)" : "Test İçin Team Sürümüne Yükselt"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.footerText}>
                  Ödeme altyapısı test modundadır.{'\n'}Ücretsiz yükseltme butonları ile özellikleri test edebilirsiniz.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  container: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    // subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  accentStripe: {
    height: 3,
    width: '100%',
    backgroundColor: ACCENT,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    zIndex: 10,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  // ── SUCCESS STATE
  successContainer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  // ── CROWN BADGE
  crownBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: ACCENT_LIGHT,
    borderWidth: 1,
    borderColor: ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  // ── LOCKED FEATURE ALERT
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ACCENT_LIGHT,
    borderWidth: 1,
    borderColor: ACCENT_BORDER,
    padding: 12,
    borderRadius: 14,
    marginBottom: 18,
    width: '100%',
  },
  alertText: {
    fontSize: 11,
    color: '#374151',
    flex: 1,
    lineHeight: 16,
  },
  // ── FEATURES
  featuresList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 14,
  },
  featureIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: ACCENT_LIGHT,
    borderWidth: 1,
    borderColor: ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  soonBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  soonText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureDesc: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 14,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 18,
  },
  // ── INFO BOX
  infoBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    width: '100%',
  },
  infoText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 15,
  },
  // ── BUTTONS
  actionsWrapper: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 15,
    backgroundColor: ACCENT,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 13,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryBtnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
  teamBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  teamBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  footerText: {
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 13,
  },
});
