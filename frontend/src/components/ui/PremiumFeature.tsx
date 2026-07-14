import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProModal } from '../../context/ProModalContext';
import { Lock } from 'lucide-react';

interface PremiumFeatureProps {
  feature: string;
  children: React.ReactElement<any>;
  showLockIcon?: boolean;
  className?: string;
}

export const PremiumFeature: React.FC<PremiumFeatureProps> = ({ 
  feature, 
  children, 
  showLockIcon = true,
  className = ''
}) => {
  const { user } = useAuth();
  const { openProModal } = useProModal();

  const isPro = !!user?.is_pro;

  if (isPro) {
    return children;
  }

  // Intercept the click event
  const handleIntercept = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openProModal(feature);
  };

  // Clone the child element to override the onClick handler
  const clonedChild = React.cloneElement(children, {
    onClick: handleIntercept,
    className: `${children.props.className || ''} opacity-75 cursor-pointer hover:opacity-90 transition-opacity`,
    title: `${children.props.title || ''} (Keepr Pro)`
  });

  return (
    <div className={`relative inline-block ${className}`}>
      {clonedChild}
      {showLockIcon && (
        <div 
          className="absolute -top-1.5 -right-1.5 bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-900 rounded-full p-0.5 pointer-events-none shadow-md z-20 border border-amber-300 flex items-center justify-center"
          style={{ width: '15px', height: '15px' }}
        >
          <Lock size={8} strokeWidth={3} fill="currentColor" />
        </div>
      )}
    </div>
  );
};
