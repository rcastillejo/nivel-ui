import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Captura el 10% de trazas en producción; 100% en desarrollo
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Graba sesiones solo cuando hay un error
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  integrations: [Sentry.replayIntegration()],

  // Sin DSN → SDK es un no-op, sin errores ni advertencias
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
