'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IDataService } from '../repositories';
import { LocalStorageDataService } from '../repositories/localStorage';
import { SupabaseDataService } from '../services/SupabaseDataService';
import { getSupabaseBrowserClient } from '@/lib/supabase';

// Internal context — only for use by ViewModelProvider to access the service layer
const DataServiceContext = createContext<IDataService | null>(null);

// Lets the UI warn when Supabase isn't configured and data is only stored in this browser
const IsLocalStorageFallbackContext = createContext<boolean>(false);

export function useDataService(): IDataService {
  const context = useContext(DataServiceContext);
  if (!context) {
    throw new Error('useDataService must be used within a DataProvider');
  }
  return context;
}

export function useIsLocalStorageFallback(): boolean {
  return useContext(IsLocalStorageFallbackContext);
}

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [{ service, isLocalStorageFallback }] = useState<{ service: IDataService; isLocalStorageFallback: boolean }>(() => {
    const supabase = getSupabaseBrowserClient();
    return supabase
      ? { service: new SupabaseDataService(supabase), isLocalStorageFallback: false }
      : { service: new LocalStorageDataService(), isLocalStorageFallback: true };
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    service.initialize().then(() => setIsReady(true));
  }, [service]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <DataServiceContext.Provider value={service}>
      <IsLocalStorageFallbackContext.Provider value={isLocalStorageFallback}>
        {children}
      </IsLocalStorageFallbackContext.Provider>
    </DataServiceContext.Provider>
  );
}
