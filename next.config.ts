import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Vercel preview deployments inject a live-feedback widget from vercel.live.
// Allow it in non-production environments so CSP doesn't block the script.
const isProduction = process.env.VERCEL_ENV === 'production';
const vercelLiveHosts = isProduction ? [] : ['https://vercel.live', 'https://*.vercel.live'];

const securityHeaders = [
  { key: 'X-Frame-Options',        value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'${vercelLiveHosts.length ? ' ' + vercelLiveHosts.join(' ') : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io${vercelLiveHosts.length ? ' ' + vercelLiveHosts.join(' ') : ''}`,
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  // Sube source maps solo si SENTRY_AUTH_TOKEN está definido (opcional)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
