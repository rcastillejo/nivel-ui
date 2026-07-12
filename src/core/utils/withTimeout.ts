/**
 * Races a promise against a timeout so callers always settle within a
 * bounded time. Without this, a hung network request (e.g. a Supabase
 * backend that never responds) leaves the original promise pending
 * forever, and any .then()/.catch()/.finally() attached to it never runs -
 * which is what caused the app to get stuck on "Cargando..." indefinitely
 * (see issue #159).
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      console.warn(`[withTimeout] "${message}" timed out after ${ms}ms`);
      reject(new Error(message));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
