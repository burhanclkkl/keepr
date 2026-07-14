import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../theme';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'primary';
  countdownSeconds?: number;
}

const { width } = Dimensions.get('window');

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Evet',
  cancelText = 'Vazgeç',
  onConfirm,
  onCancel,
  variant = 'primary',
  countdownSeconds = 0,
}) => {
  const { colors } = useTheme();
  const [countdown, setCountdown] = useState(countdownSeconds);

  useEffect(() => {
    let timer: any;
    if (isOpen && countdownSeconds > 0) {
      setCountdown(countdownSeconds);
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      setCountdown(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, countdownSeconds]);

  const getConfirmButtonColor = () => {
    switch (variant) {
      case 'danger':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return colors.primary;
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        {/* Backdrop close */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onCancel}
          style={styles.backdrop}
        />

        {/* Dialog container */}
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
          </View>

          {/* Buttons Row */}
          <View style={[styles.btnRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.btn, styles.cancelBtn]}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>{cancelText}</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              onPress={onConfirm}
              disabled={countdown > 0}
              style={[styles.btn, styles.confirmBtn, countdown > 0 && { opacity: 0.4 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.confirmText, { color: getConfirmButtonColor() }]}>
                {countdown > 0 ? `${confirmText} (${countdown}s)` : confirmText}
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 36,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  container: {
    width: '100%',
    maxWidth: 290,
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    ...Typography.titleMedium,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    ...Typography.bodySmall,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },
  btnRow: {
    flexDirection: 'row',
    height: 44,
    borderTopWidth: 1,
  },
  btn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: '100%',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
  },
  confirmBtn: {
    backgroundColor: 'transparent',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
