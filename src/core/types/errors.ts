import { ZoneType, ZONE_CONFIG } from './index';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingValidationError';
  }
}

export class BookingNotFoundError extends Error {
  constructor(public bookingId: string) {
    super('La cita no fue encontrada');
    this.name = 'BookingNotFoundError';
  }
}

export class BookingAlreadyCancelledError extends Error {
  constructor(public bookingId: string) {
    super('La cita ya está cancelada');
    this.name = 'BookingAlreadyCancelledError';
  }
}

export class BookingCancellationNoticeError extends Error {
  constructor(
    public zone: ZoneType,
    public minNoticeMinutes: number
  ) {
    const hours = minNoticeMinutes / 60;
    const label = hours === 1 ? '1 hora' : `${hours} horas`;
    super(`Solo puedes cancelar una cita del ${ZONE_CONFIG[zone].name} con al menos ${label} de anticipación`);
    this.name = 'BookingCancellationNoticeError';
  }
}

export class InvalidTimeZoneError extends Error {
  constructor(public timeZone: string) {
    super(`Zona horaria inválida: ${timeZone}`);
    this.name = 'InvalidTimeZoneError';
  }
}

export class BookingCapacityError extends Error {
  constructor(
    public zone: ZoneType,
    public current: number,
    public max: number
  ) {
    super(`El ${ZONE_CONFIG[zone].name} está lleno (${current}/${max})`);
    this.name = 'BookingCapacityError';
  }
}

export class ProgramNotFoundError extends Error {
  constructor(public programId: string) {
    super(`El programa con id '${programId}' no fue encontrado`);
    this.name = 'ProgramNotFoundError';
  }
}

export class ProgramExpiredError extends Error {
  constructor(public programId: string) {
    super(`El programa con id '${programId}' ha expirado`);
    this.name = 'ProgramExpiredError';
  }
}

export class ActiveProgramAlreadyExistsError extends Error {
  constructor(public clientId: string) {
    super(`El cliente '${clientId}' ya tiene un programa activo. Debe expirar el anterior antes de crear uno nuevo`);
    this.name = 'ActiveProgramAlreadyExistsError';
  }
}

export class ProgramValidationError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message);
    this.name = 'ProgramValidationError';
  }
}

export class InvalidSessionCountError extends Error {
  constructor(
    public usedSessions: number,
    public totalSessions: number
  ) {
    super(`Las sesiones usadas (${usedSessions}) no pueden exceder el total (${totalSessions})`);
    this.name = 'InvalidSessionCountError';
  }
}

export class TrainerValidationError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message);
    this.name = 'TrainerValidationError';
  }
}

export class ClientNotFoundError extends Error {
  constructor(public clientId: string) {
    super(`Cliente no encontrado: ${clientId}`);
    this.name = 'ClientNotFoundError';
  }
}