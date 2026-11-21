/**
 * Punto de entrada de la Edge Function `bookings` (runtime Deno de Supabase).
 * Se empaqueta con esbuild (npm run build:functions) junto con src/core, de modo
 * que la lógica de negocio es la misma que usa la app. No importar nada de React/Next aquí.
 */
import { createClient } from '@supabase/supabase-js';
import { BookingCommandsModel } from '../../core/models/BookingCommandsModel';
import { BookingModel } from '../../core/models/BookingModel';
import { ProgramModel } from '../../core/models/ProgramModel';
import { SupabaseDataService } from '../../core/services/SupabaseDataService';
import { handleBookingsRequest } from '../bookingsHandler';
import { createSupabaseAuthenticator } from '../supabaseAuthenticator';

interface DenoRuntime {
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
  env: { get(name: string): string | undefined };
}
declare const Deno: DenoRuntime;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

function getServiceKey(): string {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (direct) return direct;

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    const parsed: unknown = JSON.parse(secretKeys);
    if (typeof parsed === 'object' && parsed !== null) {
      const value = (parsed as Record<string, unknown>)['default'];
      if (typeof value === 'string') return value;
    }
  }
  throw new Error('Falta la clave de servicio de Supabase (SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEYS)');
}

const admin = createClient(requiredEnv('SUPABASE_URL'), getServiceKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const dataService = new SupabaseDataService(admin);
const commands = new BookingCommandsModel(new BookingModel(dataService), new ProgramModel(dataService));
const authenticate = createSupabaseAuthenticator(admin);

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Cuerpo ausente o inválido: el handler responde 422
  }

  const response = await handleBookingsRequest(
    { method: request.method, authorization: request.headers.get('Authorization'), body },
    { authenticate, commands, now: () => new Date() }
  );
  return json(response.status, response.body);
});
