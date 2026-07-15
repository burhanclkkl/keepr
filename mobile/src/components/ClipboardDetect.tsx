import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Clipboard,
  AppState,
} from 'react-native';
import { Link, X, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Radius } from '../theme';

const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

interface ClipboardDetectProps {
  onSave: (url: string) => Promise<void>;
}

export const ClipboardDetect: React.FC<ClipboardDetectProps> = ({ onSave }) => {
  const { colors } = useTheme();
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [lastClip, setLastClip] = useState<string>('');

  const checkClipboard = useCallback(async () => {
    try {
      const text = (await Clipboard.getString()).trim();
      if (!text) return;
      if (!URL_REGEX.test(text)) return;
      if (lastClip === text) return;
      
      setDetectedUrl(text);
    } catch {
      // Silent fail
    }
  }, [lastClip]);

  useEffect(() => {
    // Check on mount
    checkClipboard();

    // Check on app focus change
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkClipboard();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkClipboard]);

  const dismiss = async (save: boolean) => {
    if (detectedUrl) {
      setLastClip(detectedUrl);
      if (save) {
        await onSave(detectedUrl);
      }
    }
    setDetectedUrl(null);
  };

  if (!detectedUrl) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: '#000',
        },
      ]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
        <Link size={14} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textMuted }]}>Panoda link bulundu</Text>
        <Text style={[styles.urlText, { color: colors.text }]} numberOfLines={1}>
          {detectedUrl}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => dismiss(true)}
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
      >
        <Text style={styles.saveBtnText}>Kaydet</Text>
        <ArrowRight size={10} color="#fff" style={{ marginLeft: 2 }} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => dismiss(false)}
        style={styles.closeBtn}
        activeOpacity={0.6}
      >
        <X size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 84,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.large,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: Radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  title: {
    fontSize: 9.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  urlText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.small,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
    marginLeft: 4,
  },
});
