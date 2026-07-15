import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { Radius } from '../theme';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastItemProps {
  toast: Toast;
  colors: any;
  onDismiss: (id: number) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, colors, onDismiss }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth spring entrance
    Animated.spring(anim, {
      toValue: 1,
      tension: 140,
      friction: 12,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss countdown
    const timer = setTimeout(() => {
      handleDismiss();
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss(toast.id);
    });
  };

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-35, 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: anim,
          transform: [{ translateY }, { scale }],
          backgroundColor: colors.card,
          borderColor:
            toast.type === 'error'
              ? 'rgba(239, 68, 68, 0.25)'
              : toast.type === 'info'
              ? colors.border
              : 'rgba(16, 185, 129, 0.25)',
          borderWidth: 1,
          shadowColor: '#000',
        },
      ]}
    >
      <View style={[
        styles.iconBadge,
        {
          backgroundColor:
            toast.type === 'error'
              ? 'rgba(239, 68, 68, 0.08)'
              : toast.type === 'info'
              ? 'rgba(99, 102, 241, 0.08)'
              : 'rgba(16, 185, 129, 0.08)',
        }
      ]}>
        <Text style={[styles.symbol, { color: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#6366f1' : '#10b981' }]}>
          {toast.type === 'error' ? '✕' : toast.type === 'info' ? 'ℹ' : '✓'}
        </Text>
      </View>
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
        {toast.message}
      </Text>
      <TouchableOpacity
        onPress={handleDismiss}
        style={styles.closeBtn}
      >
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: 'bold' }}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    // Cap to maximum 2 visible alerts at a time to prevent overlay clutter
    setToasts((prev) => [...prev.slice(-1), { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toasts Container */}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            colors={colors}
            onDismiss={dismissToast}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast, ToastProvider içerisinde kullanılmalıdır.');
  }
  return context;
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 99999,
    alignItems: 'center',
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: width - 40,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  symbol: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  text: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
  },
  closeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 8,
  },
});
