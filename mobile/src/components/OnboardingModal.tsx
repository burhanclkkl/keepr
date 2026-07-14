import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../theme';
import { Link2, FolderOpen, Heart, ArrowRight, X, Check, Pin } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const slides = [
  {
    icon: Link2,
    color: '#10b981', // emerald
    bgLight: 'rgba(16, 185, 129, 0.08)',
    title: 'Bağlantıyı yapıştırın, gerisi bizde',
    desc: 'Uygulamadaki ekleme butonuna basın ve herhangi bir URL yapıştırın. Keepr başlığı, açıklamayı arka planda saniyeler içinde sizin için derler.',
    hint: 'Örn: github.com, youtube.com, trendyol.com...',
  },
  {
    icon: FolderOpen,
    color: '#3b82f6', // blue
    bgLight: 'rgba(59, 130, 246, 0.08)',
    title: 'Kategorilerle düzeninizi kurun',
    desc: 'İçeriklerinizi Okuma Listesi, Alışveriş, İzleme gibi klasörlere yerleştirin. Önemlileri sabitleyerek listenin en üstünde tutun.',
    hint: 'Klasörleri alt menüden dilediğiniz gibi yönetebilirsiniz.',
  },
  {
    icon: Heart,
    color: '#f43f5e', // rose
    bgLight: 'rgba(244, 63, 94, 0.08)',
    title: 'Favorilerle hızlıca ulaşın',
    desc: 'Sık kullandığınız bağlantıları tek dokunuşla favorileyin. "Favoriler" filtresinden ya da seçim moduyla toplu işlemler yapın.',
    hint: 'Toplu seçim barıyla birden fazla bağlantıyı taşıyabilirsiniz.',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { colors } = useTheme();
  const [step, setStep] = useState(0);

  // Typewriting state for step 0
  const [typedUrl, setTypedUrl] = useState('');

  useEffect(() => {
    if (step === 0 && isOpen) {
      setTypedUrl('');
      const target = 'github.com/trending';
      let i = 0;
      const interval = setInterval(() => {
        setTypedUrl((prev) => prev + target.charAt(i));
        i++;
        if (i >= target.length) clearInterval(interval);
      }, 80);
      return () => clearInterval(interval);
    }
  }, [step, isOpen]);

  const isLast = step === slides.length - 1;
  const slide = slides[step];
  const Icon = slide.icon;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <View style={styles.backdrop} />

        {/* Modal Card */}
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Skip button */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.skipBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Visual Interactive Mockups Box */}
          <View style={[styles.visualArea, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {step === 0 && (
              <View style={styles.mockContainer}>
                {/* Mock Input Bar */}
                <View style={[styles.mockInputBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Link2 size={10} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.mockInputText, { color: colors.text }]}>
                    {typedUrl || ' '}
                    <Text style={{ color: colors.primary, opacity: 0.8 }}>|</Text>
                  </Text>
                </View>

                {/* Mock Card Result */}
                {typedUrl.length >= 10 && (
                  <View style={[styles.mockResultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.mockIcon, { backgroundColor: '#10b981' }]}>
                      <Text style={styles.mockIconText}>G</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mockTitleText, { color: colors.text }]} numberOfLines={1}>GitHub: Let's build...</Text>
                      <Text style={[styles.mockSubText, { color: colors.textMuted }]}>github.com</Text>
                    </View>
                    <Check size={12} color="#10b981" />
                  </View>
                )}
              </View>
            )}

            {step === 1 && (
              <View style={styles.mockContainer}>
                {/* Mock Pinned Row */}
                <View style={[styles.mockResultCard, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <View style={[styles.mockIcon, { backgroundColor: '#3b82f6' }]}>
                    <FolderOpen size={10} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mockTitleText, { color: colors.text }]} numberOfLines={1}>React Native Belgeleri</Text>
                  </View>
                  <Pin size={10} color="#f59e0b" style={{ transform: [{ rotate: '45deg' }] }} />
                </View>

                {/* Mock Category List */}
                <View style={[styles.mockInputBar, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }]}>
                  <Text style={[styles.mockTitleText, { color: '#3b82f6', fontWeight: 'bold' }]}>📚 Okuma Listesi</Text>
                  <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 6, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, color: '#3b82f6', fontWeight: 'bold' }}>3</Text>
                  </View>
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={styles.mockContainerAlign}>
                <View style={[styles.favCircle, { backgroundColor: 'rgba(244, 63, 94, 0.08)' }]}>
                  <Heart size={24} color="#f43f5e" fill="#f43f5e" />
                </View>
                <Text style={[styles.favLabel, { color: colors.text }]}>Favorilere Eklendi</Text>
              </View>
            )}
          </View>

          {/* Slide Content Text */}
          <View style={styles.content}>
            {/* Slide Header Icon */}
            <View style={[styles.iconContainer, { backgroundColor: slide.bgLight }]}>
              <Icon size={26} color={slide.color} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>
              {slide.title}
            </Text>

            {/* Description */}
            <Text style={[styles.desc, { color: colors.textMuted }]}>
              {slide.desc}
            </Text>

            {/* Hint Box */}
            <View style={[styles.hintContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.hintText, { color: colors.text }]}>
                💡 {slide.hint}
              </Text>
            </View>
          </View>

          {/* Footer Controls */}
          <View style={styles.footer}>
            {/* Dots */}
            <View style={styles.dotsContainer}>
              {slides.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setStep(i)}
                  style={[
                    styles.dot,
                    i === step
                      ? [styles.activeDot, { backgroundColor: colors.primary }]
                      : { backgroundColor: colors.borderActive }
                  ]}
                />
              ))}
            </View>

            {/* Action Button */}
            <TouchableOpacity
              onPress={handleNext}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              {isLast ? (
                <>
                  <Check size={14} color="#fff" style={styles.btnIcon} />
                  <Text style={styles.btnText}>Başla!</Text>
                </>
              ) : (
                <>
                  <Text style={styles.btnText}>İleri</Text>
                  <ArrowRight size={14} color="#fff" style={styles.btnIconLeft} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  skipBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
    padding: 4,
  },
  visualArea: {
    width: '100%',
    height: 100,
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  mockContainer: {
    width: '100%',
    gap: 8,
  },
  mockContainerAlign: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mockInputBar: {
    height: 28,
    borderRadius: Radius.small,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  mockInputText: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: 'bold',
  },
  mockResultCard: {
    height: 32,
    borderRadius: Radius.small,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  mockIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockIconText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
  },
  mockTitleText: {
    fontSize: 9,
    fontWeight: '700',
  },
  mockSubText: {
    fontSize: 7,
  },
  favCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favLabel: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    ...Typography.titleMedium,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  desc: {
    ...Typography.bodyMedium,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  hintContainer: {
    width: '100%',
    padding: 10,
    borderRadius: Radius.medium,
    borderWidth: 1,
    marginBottom: 20,
  },
  hintText: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  activeDot: {
    width: 14,
  },
  actionBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 4,
  },
  btnIconLeft: {
    marginLeft: 4,
  },
});
