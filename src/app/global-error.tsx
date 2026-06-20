'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center px-4">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Algo salió mal
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              El error ha sido reportado automáticamente.
            </p>
            <button
              onClick={reset}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
