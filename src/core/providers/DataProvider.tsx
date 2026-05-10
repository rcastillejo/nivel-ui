'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IDataService } from '../repositories';
import { LocalStorageDataService } from '../repositories/localStorage';
import { SupabaseDataService } from '../services/SupabaseDataService';
import { getSupabaseBrowserClient } from '@/lib/supabase';

// Internal context — only for use by ViewModelProvider to access the service layer
const DataServiceContext = createContext<IDataService | null>(null);

export function useDataService(): IDataService {
  const context = useContext(DataServiceContext);
  if (!context) {
    throw new Error('useDataService must be used within a DataProvider');
  }
  return context;
}

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [service] = useState<IDataService>(() => {
    const supabase = getSupabaseBrowserClient();
    return supabase ? new SupabaseDataService(supabase) : new LocalStorageDataService();
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
      {children}
    </DataServiceContext.Provider>
  );
}
