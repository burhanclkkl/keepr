import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit2, Trash2, Check, Heart, Pin, Bell, Users, Lock, Folder } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../theme';
import { PremiumFeature } from './PremiumFeature';

export interface Keep {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  category_id: number | null;
  category_name?: string | null;
  user_id: number;
  is_favorite?: boolean;
  is_pinned?: boolean;
  created_at: string;
  reading_time_minutes?: number | null;
  reminder_at?: string | null;
  is_reminder_sent?: boolean;
}

interface KeepCardProps {
  keep: Keep;
  onSelect: (keep: Keep) => void;
  onDelete: (id: number) => void;
  onToggleFavorite?: (id: number, isFavorite: boolean) => void;
  onTogglePin?: (id: number, isPinned: boolean) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  viewLayout?: 'grid' | 'list';
  onTriggerProModal?: (feature: string) => void;
  readOnly?: boolean;
}

const getDomain = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
};

const getFallbackGradient = (domain: string) => {
  const gradients = [
    ['#ec4899', '#8b5cf6'],
    ['#a855f7', '#3b82f6'],
    ['#14b8a6', '#4f46e5'],
    ['#f59e0b', '#e11d48'],
    ['#10b981', '#059669'],
    ['#06b6d4', '#2563eb']
  ];
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

export const KeepCard = React.memo<KeepCardProps>(({
  keep,
  onSelect,
  onDelete,
  onToggleFavorite,
  onTogglePin,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  viewLayout = 'grid',
  onTriggerProModal = () => {},
  readOnly = false,
}) => {
  const { colors } = useTheme();

  const domain = getDomain(keep.url);
  const gradient = getFallbackGradient(domain);

  // Swipe logic for list mode
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const isSwiped = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isSelectionMode && !readOnly,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return !isSelectionMode && !readOnly && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        swipeAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 80;
        if (gestureState.dx < -threshold) {
          Animated.spring(swipeAnim, {
            toValue: -80,
            useNativeDriver: true,
            bounciness: 4,
          }).start(() => {
            isSwiped.current = true;
          });
        } else if (gestureState.dx > threshold) {
          Animated.spring(swipeAnim, {
            toValue: 80,
            useNativeDriver: true,
            bounciness: 4,
          }).start(() => {
            isSwiped.current = true;
            onSelect(keep);
            setTimeout(() => {
              handleCancelSwipe();
            }, 1000);
          });
        } else {
          handleCancelSwipe();
        }
      },
    })
  ).current;

  const handleCancelSwipe = () => {
    Animated.spring(swipeAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start(() => {
      isSwiped.current = false;
    });
  };

  const handleOpenLink = () => {
    Linking.openURL(keep.url).catch(() => {});
  };

  const handleDeletePress = () => {
    Animated.timing(swipeAnim, {
      toValue: -500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      isSwiped.current = false;
      onDelete(keep.id);
    });
  };

  const handleMovePress = () => {
    onSelect(keep);
    handleCancelSwipe();
  };

  const handlePress = () => {
    if (isSwiped.current) {
      handleCancelSwipe();
      return;
    }
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(keep.id);
      return;
    }
    handleOpenLink();
  };

  if (viewLayout === 'grid') {
    return (
      <View style={styles.gridContainerOuter}>
        {/* Background delete tray */}
        <View style={[styles.gridDeleteTray, { backgroundColor: '#fee2e2' }]}>
          <TouchableOpacity
            onPress={handleDeletePress}
            style={styles.gridDeleteTrayBtn}
            activeOpacity={0.8}
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Background move tray */}
        <View style={[styles.gridMoveTray, { backgroundColor: '#f5f3ff' }]}>
          <TouchableOpacity
            onPress={handleMovePress}
            style={styles.gridMoveTrayBtn}
            activeOpacity={0.8}
          >
            <Folder size={16} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.gridContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateX: swipeAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            onPress={handlePress}
            onLongPress={() => {
              if (onToggleSelect && !readOnly) {
                onToggleSelect(keep.id);
              }
            }}
            activeOpacity={0.9}
            style={styles.gridCardTouch}
          >
            {/* Top Gradient Banner with monogram */}
            <LinearGradient
              colors={gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gridBanner}
            >
              {readOnly ? (
                <View style={[
                  styles.checkbox,
                  { borderColor: 'rgba(255, 255, 255, 0.4)', position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' }
                ]}>
                  <Lock size={10} color="rgba(255, 255, 255, 0.8)" />
                </View>
              ) : isSelectionMode ? (
                <TouchableOpacity
                  onPress={() => onToggleSelect?.(keep.id)}
                  style={[
                    styles.checkbox,
                    { borderColor: '#fff', position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 14 },
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  activeOpacity={0.7}
                >
                  {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                </TouchableOpacity>
              ) : (
                <>
                  {keep.is_favorite && (
                    <View style={[styles.heartBadge, { backgroundColor: '#f43f5e', borderColor: colors.card, position: 'absolute', top: 8, right: 8 }]}>
                      <Heart size={7} color="#fff" fill="#fff" />
                    </View>
                  )}
                  {keep.is_pinned && (
                    <View style={[styles.pinBadge, { backgroundColor: '#f59e0b', borderColor: colors.card, position: 'absolute', top: 8, left: 8 }]}>
                      <Pin size={7} color="#fff" fill="#fff" />
                    </View>
                  )}
                </>
              )}
              <Text style={styles.gridMonogramText}>{domain.charAt(0).toUpperCase()}</Text>
            </LinearGradient>

            {/* Bottom Content Area */}
            <View style={styles.gridInfoContainer}>
              <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={2}>
                {keep.title || domain}
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' }}>
                <Text style={[styles.gridDomain, { color: colors.textMuted, flex: 1 }]} numberOfLines={1}>
                  {domain}
                </Text>
                {keep.reading_time_minutes !== undefined && keep.reading_time_minutes !== null && keep.reading_time_minutes > 0 && (
                  <Text style={{ fontSize: 8, color: colors.textMuted, fontWeight: '700', flexShrink: 0 }}>
                    {keep.reading_time_minutes} dk
                  </Text>
                )}
                {keep.reminder_at && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <Bell size={8} color={keep.is_reminder_sent ? colors.textMuted : '#10b981'} fill={keep.is_reminder_sent ? 'none' : '#10b981'} />
                    <Text style={{ fontSize: 8, color: keep.is_reminder_sent ? colors.textMuted : '#10b981', fontWeight: '800' }}>Alarm</Text>
                  </View>
                )}
              </View>

              <View style={styles.gridFooter}>
                {keep.category_name ? (
                  <View style={[styles.badge, { backgroundColor: colors.background, alignSelf: 'flex-start', maxWidth: 65 }]}>
                    <Text style={[styles.badgeText, { color: colors.textMuted }]} numberOfLines={1}>
                      {keep.category_name}
                    </Text>
                  </View>
                ) : <View />}

                {!isSelectionMode && (
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {!readOnly ? (
                      <>
                        {/* Pin button */}
                        <PremiumFeature feature="pin" onTriggerProModal={onTriggerProModal}>
                          <TouchableOpacity
                            onPress={() => onTogglePin?.(keep.id, !keep.is_pinned)}
                            style={[styles.gridActionBtn, { backgroundColor: colors.background }]}
                            activeOpacity={0.6}
                          >
                            <Pin
                              size={10}
                              color={keep.is_pinned ? '#f59e0b' : colors.textMuted}
                              fill={keep.is_pinned ? '#f59e0b' : 'none'}
                            />
                          </TouchableOpacity>
                        </PremiumFeature>

                        {/* Favorite button */}
                        <PremiumFeature feature="favorite" onTriggerProModal={onTriggerProModal}>
                          <TouchableOpacity
                            onPress={() => onToggleFavorite?.(keep.id, !keep.is_favorite)}
                            style={[styles.gridActionBtn, { backgroundColor: colors.background }]}
                            activeOpacity={0.6}
                          >
                            <Heart
                              size={10}
                              color={keep.is_favorite ? '#ef4444' : colors.textMuted}
                              fill={keep.is_favorite ? '#ef4444' : 'none'}
                            />
                          </TouchableOpacity>
                        </PremiumFeature>
                        <TouchableOpacity
                          onPress={() => onSelect(keep)}
                          style={[styles.gridActionBtn, { backgroundColor: colors.background }]}
                          activeOpacity={0.6}
                        >
                          <Edit2 size={10} color={colors.textMuted} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={[styles.gridActionBtn, { backgroundColor: 'rgba(139, 92, 246, 0.08)', width: 'auto', paddingHorizontal: 6 }]}>
                        <Users size={10} color="#8B5CF6" />
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // List Row Layout
  return (
    <View style={styles.container}>
      {/* Background delete tray */}
      <View style={[styles.deleteTray, { backgroundColor: '#fee2e2' }]}>
        <TouchableOpacity
          onPress={handleDeletePress}
          style={styles.deleteTrayBtn}
          activeOpacity={0.8}
        >
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Background move tray */}
      <View style={[styles.moveTray, { backgroundColor: '#f5f3ff' }]}>
        <TouchableOpacity
          onPress={handleMovePress}
          style={styles.moveTrayBtn}
          activeOpacity={0.8}
        >
          <Folder size={20} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {/* Main card body with swipe gesture */}
      <Animated.View
        style={[
          styles.cardBody,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ translateX: swipeAnim }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={() => {
            if (onToggleSelect && !readOnly) {
              onToggleSelect(keep.id);
            }
          }}
          style={styles.touchArea}
          activeOpacity={0.7}
        >
          {/* Site Monogram / Badge Wrapper */}
          {readOnly ? (
            <View style={[
              styles.checkbox,
              { borderColor: colors.border, width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }
            ]}>
              <Lock size={12} color={colors.textMuted} />
            </View>
          ) : isSelectionMode ? (
            <TouchableOpacity
              onPress={() => onToggleSelect?.(keep.id)}
              style={[
                styles.checkbox,
                { borderColor: colors.borderActive, width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              activeOpacity={0.7}
            >
              {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
            </TouchableOpacity>
          ) : (
            <View style={styles.badgeWrapper}>
              <LinearGradient
                colors={gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.monogram}
              >
                <Text style={styles.monogramText}>{domain.charAt(0).toUpperCase()}</Text>
              </LinearGradient>

              {/* Heart Overlay Badge */}
              {keep.is_favorite && (
                <View style={[styles.heartBadge, { backgroundColor: '#f43f5e', borderColor: colors.card }]}>
                  <Heart size={7} color="#fff" fill="#fff" />
                </View>
              )}

              {/* Pin Overlay Badge */}
              {keep.is_pinned && (
                <View style={[styles.pinBadge, { backgroundColor: '#f59e0b', borderColor: colors.card }]}>
                  <Pin size={7} color="#fff" fill="#fff" />
                </View>
              )}
            </View>
          )}

          {/* Info Details Section */}
          <View style={styles.infoContainer}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {keep.title || domain}
            </Text>
            <View style={styles.metaContainer}>
              <Text style={[styles.domain, { color: colors.textMuted }]} numberOfLines={1}>
                {domain}
              </Text>
              {keep.reading_time_minutes !== undefined && keep.reading_time_minutes !== null && keep.reading_time_minutes > 0 && (
                <>
                  <Text style={[styles.bullet, { color: colors.borderActive }]}>•</Text>
                  <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '700' }}>
                    {keep.reading_time_minutes} dk okuma
                  </Text>
                </>
              )}
              {keep.reminder_at && (
                <>
                  <Text style={[styles.bullet, { color: colors.borderActive }]}>•</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Bell size={8} color={keep.is_reminder_sent ? colors.textMuted : '#10b981'} fill={keep.is_reminder_sent ? 'none' : '#10b981'} />
                    <Text style={{ fontSize: 9, color: keep.is_reminder_sent ? colors.textMuted : '#10b981', fontWeight: '800' }}>
                      Alarm
                    </Text>
                  </View>
                </>
              )}
              {keep.category_name && (
                <>
                  <Text style={[styles.bullet, { color: colors.borderActive }]}>•</Text>
                  <View style={[styles.badge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                      {keep.category_name}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Action Buttons Row */}
          {!isSelectionMode && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {/* Toggle Pin Button */}
              <PremiumFeature feature="pin" onTriggerProModal={onTriggerProModal}>
                <TouchableOpacity
                  onPress={() => onTogglePin?.(keep.id, !keep.is_pinned)}
                  style={[styles.actionBtn, { backgroundColor: colors.background }]}
                  activeOpacity={0.6}
                >
                  <Pin
                    size={12}
                    color={keep.is_pinned ? '#f59e0b' : colors.textMuted}
                    fill={keep.is_pinned ? '#f59e0b' : 'none'}
                  />
                </TouchableOpacity>
              </PremiumFeature>

              {/* Toggle Favorite Button */}
              <PremiumFeature feature="favorite" onTriggerProModal={onTriggerProModal}>
                <TouchableOpacity
                  onPress={() => onToggleFavorite?.(keep.id, !keep.is_favorite)}
                  style={[styles.actionBtn, { backgroundColor: colors.background }]}
                  activeOpacity={0.6}
                >
                  <Heart
                    size={12}
                    color={keep.is_favorite ? '#ef4444' : colors.textMuted}
                    fill={keep.is_favorite ? '#ef4444' : 'none'}
                  />
                </TouchableOpacity>
              </PremiumFeature>

              {/* Edit Details Sheet Trigger */}
              <TouchableOpacity
                onPress={() => onSelect(keep)}
                style={[styles.actionBtn, { backgroundColor: colors.background }]}
                activeOpacity={0.6}
              >
                <Edit2 size={12} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 10,
  },
  deleteTray: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.large,
  },
  deleteTrayBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveTray: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.large,
  },
  moveTrayBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    borderRadius: Radius.large,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  touchArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeWrapper: {
    position: 'relative',
    width: 36,
    height: 36,
  },
  monogram: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monogramText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  heartBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  title: {
    ...Typography.bodyMedium,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  domain: {
    ...Typography.bodySmall,
    fontSize: 11,
    maxWidth: 120,
  },
  bullet: {
    marginHorizontal: 6,
    fontSize: 10,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
  },
  badgeText: {
    ...Typography.bodySmall,
    fontSize: 9,
    fontWeight: '700',
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Grid specific styles
  gridContainer: {
    flex: 1,
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridContainerOuter: {
    flex: 1,
    margin: 5,
    position: 'relative',
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  gridDeleteTray: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.large,
  },
  gridDeleteTrayBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridMoveTray: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.large,
  },
  gridMoveTrayBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardTouch: {
    flex: 1,
  },
  gridBanner: {
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridMonogramText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  gridInfoContainer: {
    padding: 10,
    flex: 1,
  },
  gridTitle: {
    ...Typography.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    marginBottom: 4,
  },
  gridDomain: {
    ...Typography.bodySmall,
    fontSize: 9,
    marginBottom: 8,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  gridActionBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
