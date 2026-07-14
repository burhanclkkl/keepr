import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react-native';

interface PremiumFeatureProps {
  feature: string;
  children: React.ReactNode;
  showLockIcon?: boolean;
  onTriggerProModal: (feature: string) => void;
}

export const PremiumFeature: React.FC<PremiumFeatureProps> = ({
  feature,
  children,
  showLockIcon = true,
  onTriggerProModal
}) => {
  const { user } = useAuth();
  const isPro = !!user?.is_pro;

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {children}
      {/* Click Interception Overlay */}
      <TouchableOpacity 
        style={StyleSheet.absoluteFill}
        onPress={() => onTriggerProModal(feature)}
        activeOpacity={0.6}
      />
      {/* Small Lock Badge in the corner */}
      {showLockIcon && (
        <View style={styles.lockBadge}>
          <Lock size={7} color="#0f172a" strokeWidth={3.5} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fbbf24',
    borderWidth: 1,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  }
});
