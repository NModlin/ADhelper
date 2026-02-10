import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { electronAPI } from '../electronAPI';

export interface ADConnectionStatus {
  connected: boolean;
  domain?: string;
  domainController?: string;
  responseTime?: number;
  error?: string;
  timestamp: string;
  checking: boolean;
}

interface ADConnectionContextType {
  status: ADConnectionStatus;
  checkConnection: () => Promise<void>;
  lastCheck: Date | null;
}

const ADConnectionContext = createContext<ADConnectionContextType | undefined>(undefined);

export const useADConnection = () => {
  const context = useContext(ADConnectionContext);
  if (!context) {
    throw new Error('useADConnection must be used within ADConnectionProvider');
  }
  return context;
};

interface ADConnectionProviderProps {
  children: ReactNode;
}

export const ADConnectionProvider: React.FC<ADConnectionProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<ADConnectionStatus>({
    connected: false,
    checking: true,
    timestamp: new Date().toISOString(),
  });
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async () => {
    setStatus(prev => ({ ...prev, checking: true }));

    try {
      const result = await electronAPI.testADConnection();
      
      setStatus({
        connected: result.connected,
        domain: result.domain,
        domainController: result.domainController,
        responseTime: result.responseTime,
        error: result.error,
        timestamp: result.timestamp,
        checking: false,
      });
      
      setLastCheck(new Date());
    } catch (error: any) {
      setStatus({
        connected: false,
        error: error.message || 'Failed to check AD connection',
        timestamp: new Date().toISOString(),
        checking: false,
      });
      
      setLastCheck(new Date());
    }
  };

  // Initial connection check on mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Periodic connection checks every 45 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkConnection();
    }, 45000); // 45 seconds

    return () => clearInterval(interval);
  }, []);

  const value: ADConnectionContextType = {
    status,
    checkConnection,
    lastCheck,
  };

  return (
    <ADConnectionContext.Provider value={value}>
      {children}
    </ADConnectionContext.Provider>
  );
};

