import { ZoneType, ZONE_CONFIG } from './index';

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingValidationError';
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