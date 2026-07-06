'use client';

import { useIsLocalStorageFallback } from '@/core/providers/DataProvider';

export function LocalStorageFallbackBanner() {
  const isLocalStorageFallback = useIsLocalStorageFallback();

  if (!isLocalStorageFallback) return null;

  return (
    <div
      data-testid="local-storage-fallback-banner"
      className="bg-amber-100 text-amber-900 text-sm text-center px-4 py-2 border-b border-amber-300"
    >
      ⚠️ Supabase no está configurado — usando datos de demostración guardados solo en este navegador.
      Los programas y otros datos no se comparten entre dispositivos ni persisten en el servidor.
    </div>
  );
}
