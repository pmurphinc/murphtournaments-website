import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminControlState, loadAdminState, saveAdminState } from '@/lib/adminStore';

interface AdminStateContextType {
  state: AdminControlState;
  updateState: (updates: Partial<AdminControlState>) => void;
}

const AdminStateContext = createContext<AdminStateContextType | undefined>(undefined);

export function AdminStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminControlState>(loadAdminState());

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dd-admin-control-state' && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Failed to parse admin state from storage:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateState = (updates: Partial<AdminControlState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    saveAdminState(newState);
  };

  return (
    <AdminStateContext.Provider value={{ state, updateState }}>
      {children}
    </AdminStateContext.Provider>
  );
}

export function useAdminState() {
  const context = useContext(AdminStateContext);
  if (!context) {
    throw new Error('useAdminState must be used within AdminStateProvider');
  }
  return context;
}
