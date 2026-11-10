import type { SupabaseClient } from '@supabase/supabase-js';
import { HandlerUser } from './bookingsHandler';

/**
 * Valida el JWT contra Supabase Auth y lee el rol desde user_profiles.
 * Devuelve null si el token no es válido o el usuario no tiene un rol conocido.
 */
export function createSupabaseAuthenticator(admin: SupabaseClient) {
  return async (accessToken: string): Promise<HandlerUser | null> => {
    const { data, error } = await admin.auth.getUser(accessToken);
    if (error || !data.user) {
      return null;
    }

    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError) {
      throw new Error(profileError.message);
    }

    if (profile?.role === 'client' || profile?.role === 'trainer') {
      return { id: data.user.id, role: profile.role };
    }
    return null;
  };
}
