import React, { useRef, useEffect } from 'react';
import CustomAlert, { CustomAlertRef } from './CustomAlert';
import { customAlert } from '../services/customAlertService';

interface GlobalAlertProviderProps {
  children: React.ReactNode;
}

const GlobalAlertProvider: React.FC<GlobalAlertProviderProps> = ({ children }) => {
  const alertRef = useRef<CustomAlertRef>(null);

  useEffect(() => {
    // Set the alert ref in the service
    customAlert.setAlertRef(alertRef);
  }, []);

  return (
    <>
      {children}
      <CustomAlert ref={alertRef} visible={false} title="" message="" />
    </>
  );
};

export default GlobalAlertProvider;
