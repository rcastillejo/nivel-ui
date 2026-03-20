import { Trainer, Booking, TrainerSchedule, Program, ProgramRenewal } from '../types';

// Interfaces de repositorios para abstracción de datos
export interface ITrainerRepository {
  getAll(): Promise<Trainer[]>;
  getById(id: string): Promise<Trainer | null>;
  save(trainer: Trainer): Promise<void>;
  saveSchedule(schedule: TrainerSchedule): Promise<void>;
  getSchedule(trainerId: string): Promise<TrainerSchedule | null>;
}

export interface IBookingRepository {
  getAll(): Promise<Booking[]>;
  getById(id: string): Promise<Booking | null>;
  getByDate(date: Date): Promise<Booking[]>;
  getByTrainer(trainerId: string): Promise<Booking[]>;
  save(booking: Booking): Promise<void>;
  update(id: string, booking: Partial<Booking>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IProgramRepository {
  getAll(): Promise<Program[]>;
  getById(id: string): Promise<Program | null>;
  getByClientId(clientId: string): Promise<Program[]>;
  getByTrainerId(trainerId: string): Promise<Program[]>;
  getActivePrograms(): Promise<Program[]>;
  getExpiringPrograms(days: number): Promise<Program[]>;
  getByStatus(status: string): Promise<Program[]>;
  save(program: Program): Promise<void>;
  update(id: string, program: Partial<Program>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IProgramRenewalRepository {
  getAll(): Promise<ProgramRenewal[]>;
  getById(id: string): Promise<ProgramRenewal | null>;
  getByProgramId(programId: string): Promise<ProgramRenewal[]>;
  getByClientId(clientId: string): Promise<ProgramRenewal[]>;
  getByType(renewalType: string): Promise<ProgramRenewal[]>;
  save(renewal: ProgramRenewal): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IDataService {
  trainers: ITrainerRepository;
  bookings: IBookingRepository;
  programs: IProgramRepository;
  renewals: IProgramRenewalRepository;
  initialize(): Promise<void>;
  clear(): Promise<void>;
}
