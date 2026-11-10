import { Trainer, Booking, TrainerSchedule, Client, Program, CreateBookingCommand } from '../types';

// Interfaces de repositorios para abstracción de datos
export interface IClientRepository {
  getAll(): Promise<Client[]>;
  getById(id: string): Promise<Client | null>;
  getByEmail(email: string): Promise<Client | null>;
  save(client: Client): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ITrainerRepository {
  getAll(): Promise<Trainer[]>;
  getById(id: string): Promise<Trainer | null>;
  getByAuthUserId(userId: string): Promise<Trainer | null>;
  save(trainer: Trainer): Promise<void>;
  saveSchedule(schedule: TrainerSchedule): Promise<void>;
  getSchedule(trainerId: string): Promise<TrainerSchedule | null>;
}

export interface IBookingRepository {
  getAll(): Promise<Booking[]>;
  getById(id: string): Promise<Booking | null>;
  getByDate(date: Date): Promise<Booking[]>;
  getByTrainer(trainerId: string): Promise<Booking[]>;
  getByClient(clientId: string): Promise<Booking[]>;
  create(booking: Omit<Booking, 'id'>): Promise<Booking>;
  save(booking: Booking): Promise<void>;
  update(id: string, booking: Partial<Booking>): Promise<void>;
  /** Cancela la reserva solo si sigue confirmada. Devuelve true si cambió una fila (operación atómica). */
  cancelIfConfirmed(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

// Comandos de reserva que deben ejecutarse donde se garantizan las reglas de negocio
// (backend). El cliente se identifica por su sesión, nunca por un parámetro.
export interface IBookingCommands {
  create(request: Omit<CreateBookingCommand, 'action'>): Promise<Booking>;
  cancel(bookingId: string): Promise<Booking>;
}

export interface IProgramRepository {
  getAll(): Promise<Program[]>;
  getById(id: string): Promise<Program | null>;
  getByTrainer(trainerId: string): Promise<Program[]>;
  getByClient(clientId: string): Promise<Program[]>;
  create(program: Omit<Program, 'id'>): Promise<Program>;
  save(program: Program): Promise<void>;
  /**
   * Consume una sesión en una sola operación atómica (used_sessions + 1).
   * Devuelve null si el programa no existe o no le quedan sesiones.
   */
  consumeSession(id: string): Promise<Program | null>;
  /**
   * Devuelve una sesión en una sola operación atómica (used_sessions - 1).
   * Devuelve null si el programa no existe, no está activo o no tiene sesiones consumidas.
   */
  restoreSession(id: string): Promise<Program | null>;
  delete(id: string): Promise<void>;
}

export interface IDataService {
  clients: IClientRepository;
  trainers: ITrainerRepository;
  bookings: IBookingRepository;
  programs: IProgramRepository;
  initialize(): Promise<void>;
  clear(): Promise<void>;
}
