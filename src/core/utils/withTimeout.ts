/**
 * Races a promise against a timeout so callers always settle within a
 * bounded time. Without this, a hung network request (e.g. a Supabase
 * backend that never responds) leaves the original promise pending
 * forever, and any .then()/.catch()/.finally() attached to it never runs -
 * which is what caused the app to get stuck on "Cargando..." indefinitely
 * (see issue #159).
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
    ]);
}
