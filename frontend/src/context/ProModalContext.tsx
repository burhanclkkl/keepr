import React, { createContext, useContext, useState } from 'react';
import { ProUpgradeModal } from '../components/ui/ProUpgradeModal';

interface ProModalContextProps {
  isOpen: boolean;
  lockedFeature: string | null;
  openProModal: (feature: string) => void;
  closeProModal: () => void;
}

const ProModalContext = createContext<ProModalContextProps | undefined>(undefined);

export const ProModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<string | null>(null);

  const openProModal = (feature: string) => {
    setLockedFeature(feature);
    setIsOpen(true);
  };

  const closeProModal = () => {
    setIsOpen(false);
    setLockedFeature(null);
  };

  return (
    <ProModalContext.Provider value={{ isOpen, lockedFeature, openProModal, closeProModal }}>
      {children}
      <ProUpgradeModal isOpen={isOpen} onClose={closeProModal} feature={lockedFeature} />
    </ProModalContext.Provider>
  );
};

export const useProModal = () => {
  const context = useContext(ProModalContext);
  if (!context) {
    throw new Error('useProModal must be used within a ProModalProvider');
  }
  return context;
};
