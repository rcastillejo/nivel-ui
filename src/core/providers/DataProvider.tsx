'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IDataService } from '../repositories';
import { LocalStorageDataService } from '../repositories/localStorage';
import { SupabaseDataService } from '../services/SupabaseDataService';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { isProductionEnvironment } from '@/lib/env';

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

type ServiceSelection =
  | { service: IDataService; isLocalStorageFallback: boolean }
  | { service: null; isLocalStorageFallback: false };

function selectDataService(): ServiceSelection {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    return { service: new SupabaseDataService(supabase), isLocalStorageFallback: false };
  }
  if (isProductionEnvironment()) {
    return { service: null, isLocalStorageFallback: false };
  }
  return { service: new LocalStorageDataService(), isLocalStorageFallback: true };
}

export function DataProvider({ children }: DataProviderProps) {
  const [{ service, isLocalStorageFallback }] = useState<ServiceSelection>(selectDataService);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!service) return;
    service.initialize().then(() => setIsReady(true));
  }, [service]);

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div data-testid="data-service-config-error" className="text-center max-w-md px-4">
          <p className="text-red-700 font-semibold mb-2">Error de configuración</p>
          <p className="text-gray-600">
            No se pudo conectar a Supabase. Verifica las variables de entorno
            NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        </div>
      </div>
    );
  }

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
