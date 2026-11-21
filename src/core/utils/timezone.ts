export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

function getZonedParts(instant: Date, timeZone: string): Record<string, number> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return parts;
}

// Desfase (en ms) de la zona respecto a UTC en un instante dado.
function getOffsetMs(instant: Date, timeZone: string): number {
  const p = getZonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Convierte una fecha ('yyyy-MM-dd') y hora ('HH:mm') locales de una zona IANA
 * al instante UTC equivalente.
 */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  if (!isValidTimeZone(timeZone)) {
    throw new Error(`Zona horaria inválida: ${timeZone}`);
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const naiveUtc = Date.UTC(year, month - 1, day, hours, minutes);

  // Primera aproximación y corrección por si el desfase cambia (horario de verano).
  const firstOffset = getOffsetMs(new Date(naiveUtc), timeZone);
  const candidate = naiveUtc - firstOffset;
  const secondOffset = getOffsetMs(new Date(candidate), timeZone);
  return new Date(naiveUtc - secondOffset);
}

/** Fecha calendario ('yyyy-MM-dd') que tiene un instante en la zona indicada. */
export function formatDateInTimeZone(instant: Date, timeZone: string): string {
  const p = getZonedParts(instant, timeZone);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Zona horaria IANA del navegador (p. ej. "America/Lima"). */
export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
