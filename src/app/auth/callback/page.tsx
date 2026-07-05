'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';

type Status = 'loading' | 'error';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  // PKCE codes are single-use; guard against the effect re-running (e.g. a
  // searchParams/router identity change) and exchanging the same code twice.
  const hasRunRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) { router.replace('/login'); return; }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) { router.replace('/login'); return; }

    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const fail = () => {
      setStatus('error');
      setTimeout(() => router.replace('/login'), 1500);
    };

    (async () => {
      try {
        // 1. Exchange the OAuth authorization code for an authenticated session.
        //    The returned user object contains the email from the Google account.
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.user) {
          fail();
          return;
        }

        const { id: userId, email } = data.user;

        // 2. Determine role: check whether this email is registered as an active trainer.
        //    The trainers table has public read, so no auth restriction applies here.
        let role: 'trainer' | 'client' = 'client';
        if (email) {
          const { data: trainer } = await supabase
            .from('trainers')
            .select('id')
            .eq('email', email)
            .eq('is_active', true)
            .maybeSingle();
          if (trainer) role = 'trainer';
        }

        // 3. Persist the correct role. The DB trigger may have defaulted to 'client';
        //    upserting on the primary key corrects it without overwriting full_name.
        await supabase
          .from('user_profiles')
          .upsert({ id: userId, role, email: email ?? null }, { onConflict: 'id' });

        // 4. Refresh the session so the global onAuthStateChange listener re-fires
        //    and AuthViewModel picks up the now-correct role from user_profiles.
        await supabase.auth.refreshSession();

        // 5. Navigate to the dashboard that matches the resolved role.
        router.replace(role === 'trainer' ? '/trainer' : '/client');
      } catch {
        // Any thrown error (e.g. network failure, missing PKCE code verifier)
        // must still resolve the loading state instead of hanging forever.
        fail();
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {status === 'error' ? (
        <p data-testid="callback-error" className="text-sm text-red-600">
          Error al autenticar. Redirigiendo…
        </p>
      ) : (
        <div className="animate-pulse text-gray-400 text-sm">Autenticando…</div>
      )}
    </div>
  );
}
