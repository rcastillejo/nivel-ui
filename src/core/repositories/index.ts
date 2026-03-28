import { Trainer, Booking, TrainerSchedule, Client } from '../types';

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

export interface IDataService {
  clients: IClientRepository;
  trainers: ITrainerRepository;
  bookings: IBookingRepository;
  initialize(): Promise<void>;
  clear(): Promise<void>;
}
