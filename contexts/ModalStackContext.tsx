import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { BackHandler, Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ModalStackItem {
  id: string;
  onClose: () => void;
  priority: number; // Higher priority means it should be closed first
}

interface ModalStackContextType {
  registerModal: (id: string, onClose: () => void, priority?: number) => void;
  unregisterModal: (id: string) => void;
  hasOpenModals: () => boolean;
  getModalCount: () => number;
  closeTopModal: () => boolean; // Returns true if a modal was closed
}

// Helper function for cross-platform back navigation haptic feedback
const triggerBackHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else if (Platform.OS === 'android') {
    Vibration.vibrate(30); // Short vibration for back navigation
  }
};

const ModalStackContext = createContext<ModalStackContextType | undefined>(undefined);

export const useModalStack = () => {
  const context = useContext(ModalStackContext);
  if (!context) {
    throw new Error('useModalStack must be used within a ModalStackProvider');
  }
  return context;
};

export const ModalStackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);
  const backHandlerRef = useRef<any>(null);

  const registerModal = useCallback((id: string, onClose: () => void, priority: number = 0) => {
    console.log(`📱 Registering modal: ${id} with priority ${priority}`);
    
    setModalStack(prev => {
      // Remove any existing modal with the same id first
      const filtered = prev.filter(item => item.id !== id);
      // Add the new modal and sort by priority (highest first)
      const newStack = [...filtered, { id, onClose, priority }].sort((a, b) => b.priority - a.priority);
      console.log(`📱 Modal stack updated:`, newStack.map(item => item.id));
      return newStack;
    });
  }, []);

  const unregisterModal = useCallback((id: string) => {
    console.log(`📱 Unregistering modal: ${id}`);
    
    setModalStack(prev => {
      const newStack = prev.filter(item => item.id !== id);
      console.log(`📱 Modal stack updated:`, newStack.map(item => item.id));
      return newStack;
    });
  }, []);

  const hasOpenModals = useCallback(() => {
    return modalStack.length > 0;
  }, [modalStack.length]);

  const getModalCount = useCallback(() => {
    return modalStack.length;
  }, [modalStack.length]);

  const closeTopModal = useCallback(() => {
    if (modalStack.length > 0) {
      const topModal = modalStack[0]; // Highest priority modal
      console.log(`📱 Closing top modal: ${topModal.id}`);
      
      // Trigger haptic feedback for modal closing
      triggerBackHaptic();
      
      topModal.onClose();
      return true;
    }
    return false;
  }, [modalStack]);

  const handleBackPress = useCallback(() => {
    console.log('📱 Hardware back button pressed, modal stack length:', modalStack.length);
    
    if (modalStack.length > 0) {
      const topModal = modalStack[0];
      console.log(`📱 Closing modal: ${topModal.id}`);
      
      // Trigger haptic feedback for back navigation
      triggerBackHaptic();
      
      topModal.onClose();
      return true; // Prevent default back behavior
    }
    
    return false; // Allow default back behavior (exit app)
  }, [modalStack]);

  // Manage BackHandler based on modal stack changes
  useEffect(() => {
    if (modalStack.length > 0 && !backHandlerRef.current) {
      console.log('📱 Setting up BackHandler for modals');
      backHandlerRef.current = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    } else if (modalStack.length === 0 && backHandlerRef.current) {
      console.log('📱 Removing BackHandler - no modals open');
      backHandlerRef.current.remove();
      backHandlerRef.current = null;
    } else if (modalStack.length > 0 && backHandlerRef.current) {
      // Update the handler if modalStack has changed
      backHandlerRef.current.remove();
      backHandlerRef.current = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    }
  }, [modalStack, handleBackPress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (backHandlerRef.current) {
        backHandlerRef.current.remove();
        backHandlerRef.current = null;
      }
    };
  }, []);

  const value: ModalStackContextType = {
    registerModal,
    unregisterModal,
    hasOpenModals,
    getModalCount,
    closeTopModal
  };

  return (
    <ModalStackContext.Provider value={value}>
      {children}
    </ModalStackContext.Provider>
  );
};
