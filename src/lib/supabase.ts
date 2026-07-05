import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!client) {
    // PKCE keeps the OAuth callback in `?code=` form (see auth/callback/page.tsx).
    // Without it Supabase falls back to the implicit flow and returns tokens in
    // the URL hash instead, which the callback page never handles, leaving
    // Google sign-in stuck on the "Autenticando…" screen.
    client = createClient(url, key, { auth: { flowType: 'pkce' } });
  }
  return client;
}
