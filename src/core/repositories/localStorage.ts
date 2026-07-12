import { Trainer, Booking, TrainerSchedule, Client, Program } from '../types';
import { IClientRepository, ITrainerRepository, IBookingRepository, IProgramRepository, IDataService } from './index';

// Horarios preestablecidos por día (Lunes a Sábado)
const getDefaultScheduleForDay = (dayIndex: number) => {
  if (dayIndex === 5) { // Sábado (índice 5)
    return ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00']; // Hasta 1pm
  }
  return ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']; // Lunes a Viernes hasta 8pm
};

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Datos iniciales para demo coherente
const initialData = {
  clients: [
    { id: 'client1', name: 'María González',  email: 'maria.gonzalez@email.com',   phone: '+34 611 000 001', status: 'active' as const, createdAt: new Date(2025, 0, 1) },
    { id: 'client2', name: 'Carlos Ruiz',     email: 'carlos.ruiz@email.com',      phone: '+34 611 000 002', status: 'active' as const, createdAt: new Date(2025, 0, 2) },
    { id: 'client3', name: 'Ana Martín',      email: 'ana.martin@email.com',       phone: '+34 611 000 003', status: 'active' as const, createdAt: new Date(2025, 0, 3) },
    { id: 'client4', name: 'Luis Torres',     email: 'luis.torres@email.com',      phone: '+34 611 000 004', status: 'active' as const, createdAt: new Date(2025, 0, 4) },
    { id: 'client5', name: 'Patricia Vega',   email: 'patricia.vega@email.com',    phone: '+34 611 000 005', status: 'active' as const, createdAt: new Date(2025, 0, 5) },
    { id: 'client6', name: 'Roberto Silva',   email: 'roberto.silva@email.com',    phone: '+34 611 000 006', status: 'active' as const, createdAt: new Date(2025, 0, 6) },
    { id: 'client7', name: 'Laura Mendoza',   email: 'laura.mendoza@email.com',    phone: '+34 611 000 007', status: 'active' as const, createdAt: new Date(2025, 0, 7) },
    { id: 'client8', name: 'Diego Castro',    email: 'diego.castro@email.com',     phone: '+34 611 000 008', status: 'active' as const, createdAt: new Date(2025, 0, 8) },
    { id: 'client9', name: 'Luis Castillejo', email: 'luis.castillejo@email.com',  phone: '+34 611 000 009', status: 'active' as const, createdAt: new Date(2025, 0, 9) },
  ] as Client[],
  trainers: [
    {
      id: 'trainer1',
      userId: 'trainer1',
      name: 'Diego Lamas',
      // Horarios dinámicos basados en el calendario del entrenador
      availableSlots: ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00']
    },
    {
      id: 'trainer2',
      userId: 'trainer2',
      name: 'Jeanpierre Casas',
      // Horarios dinámicos basados en el calendario del entrenador
      availableSlots: ['08:00', '09:00', '15:00', '16:00', '19:00', '20:00']
    }
  ],
  bookings: [
    {
      id: 'booking1',
      clientId: 'client1',
      trainerId: 'trainer1',
      trainerName: 'Entrenador Diego Lamas',
      date: new Date(2026, 0, 22), // 22 enero 2026
      time: '09:00',
      duration: 60,
      zone: 'gym' as const,
      status: 'confirmed' as const
    },
    {
      id: 'booking2',
      clientId: 'client2',
      trainerId: 'trainer2',
      trainerName: 'Entrenador Jeanpierre Casas',
      date: new Date(2026, 0, 23), // 23 enero 2026
      time: '16:00',
      duration: 60,
      zone: 'gym' as const,
      status: 'confirmed' as const
    },
    {
      id: 'booking3',
      clientId: 'client3',
      trainerId: 'trainer1',
      trainerName: 'Entrenador Diego Lamas',
      date: new Date(2026, 0, 24), // 24 enero 2026
      time: '10:00',
      duration: 60,
      zone: 'gym' as const,
      status: 'cancelled' as const
    },
    {
      id: 'booking4',
      clientId: 'client4',
      trainerId: 'trainer1',
      trainerName: 'Entrenador Diego Lamas',
      date: new Date(2026, 0, 22), // 22 enero 2026 - mismo día y hora que booking1
      time: '09:00',
      duration: 60,
      zone: 'gym' as const,
      status: 'confirmed' as const
    },
    {
      id: 'booking5',
      clientId: 'client5',
      trainerId: 'trainer1',
      trainerName: 'Entrenador Diego Lamas',
      date: new Date(2026, 0, 22), // 22 enero 2026 - mismo día y hora que booking1
      time: '09:00',
      duration: 60,
      zone: 'gym' as const,
      status: 'confirmed' as const
    },
    {
      id: 'booking6',
      clientId: 'client6',
      trainerId: 'trainer1',
      trainerName: 'Entrenador Diego Lamas',
      date: new Date(2026, 0, 22), // 22 enero 2026 - mismo día y hora que booking1
      time: '09:00',
      duration: 60,
      zone: 'gym' as const,
      status: 'confirmed' as const
    },
    {
      id: 'booking7',
      clientId: 'client7',
      trainerId: 'trainer2',
      trainerName: 'Entrenador Jeanpierre Casas',
      date: new Date(2026, 0, 23), // 23 enero 2026 - mismo día y hora que booking2
      time: '16:00',
      duration: 60,
      zone: 'gym' as const,
      status: 'confirmed' as const
    },
    {
      id: 'booking8',
      clientId: 'client8',
      trainerId: 'trainer2',
      trainerName: 'Entrenador Jeanpierre Casas',
      date: new Date(2026, 0, 23), // 23 enero 2026 - mismo día y hora que booking2
      time: '16:00',
      duration: 60,
      zone: 'gym' as const,
      status: 'confirmed' as const
    },
    {
      id: 'booking9',
      clientId: 'client9',
      trainerId: 'trainer2',
      trainerName: 'Entrenador Jeanpierre Casas',
      date: new Date(2026, 1, 23), // 23 febrero 2026 - mismo día y hora que booking2
      time: '16:00',
      duration: 60,
      zone: 'gym' as const,
      status: 'confirmed' as const
    }
  ],
  trainerSchedules: [
    // Horario predefinido para Diego Lamas
    {
      trainerId: 'trainer1',
      trainerName: 'Diego Lamas',
      weeklySchedule: daysOfWeek.map((day, dayIndex) => ({
        day,
        slots: getDefaultScheduleForDay(dayIndex).map(time => ({
          time,
          available: ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00'].includes(time)
        }))
      }))
    },
    // Horario predefinido para Jeanpierre Casas
    {
      trainerId: 'trainer2',
      trainerName: 'Jeanpierre Casas',
      weeklySchedule: daysOfWeek.map((day, dayIndex) => ({
        day,
        slots: getDefaultScheduleForDay(dayIndex).map(time => ({
          time,
          available: ['08:00', '09:00', '15:00', '16:00', '19:00', '20:00'].includes(time)
        }))
      }))
    }
  ]
};

class LocalStorageClientRepository implements IClientRepository {
  private readonly key = 'nivel-clients';

  async getAll(): Promise<Client[]> {
    const data = localStorage.getItem(this.key);
    if (!data) {
      await this.initializeData();
      return this.parseClients(JSON.stringify(initialData.clients));
    }
    return this.parseClients(data);
  }

  async getById(id: string): Promise<Client | null> {
    const clients = await this.getAll();
    return clients.find(c => c.id === id) || null;
  }

  async getByEmail(email: string): Promise<Client | null> {
    const clients = await this.getAll();
    return clients.find(c => c.email === email) || null;
  }

  async save(client: Client): Promise<void> {
    const clients = await this.getAll();
    const index = clients.findIndex(c => c.id === client.id);

    if (index >= 0) {
      clients[index] = client;
    } else {
      clients.push(client);
    }

    localStorage.setItem(this.key, JSON.stringify(clients));
  }

  async delete(id: string): Promise<void> {
    const clients = await this.getAll();
    const filtered = clients.filter(c => c.id !== id);
    localStorage.setItem(this.key, JSON.stringify(filtered));
  }

  private parseClients(data: string): Client[] {
    const parsed = JSON.parse(data);
    return parsed.map((c: Client) => ({
      ...c,
      createdAt: new Date(c.createdAt)
    }));
  }

  private async initializeData(): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(initialData.clients));
  }
}

class LocalStorageTrainerRepository implements ITrainerRepository {
  private readonly key = 'nivel-trainers';

  async getAll(): Promise<Trainer[]> {
    const data = localStorage.getItem(this.key);
    return data ? JSON.parse(data) : initialData.trainers;
  }

  async getById(id: string): Promise<Trainer | null> {
    const trainers = await this.getAll();
    return trainers.find(t => t.id === id) || null;
  }

  async getByAuthUserId(userId: string): Promise<Trainer | null> {
    const trainers = await this.getAll();
    return trainers.find(t => t.userId === userId) || null;
  }

  async save(trainer: Trainer): Promise<void> {
    const trainers = await this.getAll();
    const index = trainers.findIndex(t => t.id === trainer.id);
    
    if (index >= 0) {
      trainers[index] = trainer;
    } else {
      trainers.push(trainer);
    }
    
    localStorage.setItem(this.key, JSON.stringify(trainers));
  }

  async saveSchedule(schedule: TrainerSchedule): Promise<void> {
    const schedules = await this.getAllSchedules();
    const index = schedules.findIndex(s => s.trainerId === schedule.trainerId);
    
    if (index >= 0) {
      schedules[index] = schedule;
    } else {
      schedules.push(schedule);
    }
    
    localStorage.setItem('nivel-schedules', JSON.stringify(schedules));
  }

  async getSchedule(trainerId: string): Promise<TrainerSchedule | null> {
    const schedules = await this.getAllSchedules();
    return schedules.find(s => s.trainerId === trainerId) || null;
  }

  private async getAllSchedules(): Promise<TrainerSchedule[]> {
    const data = localStorage.getItem('nivel-schedules');
    return data ? JSON.parse(data) : [];
  }
}

class LocalStorageBookingRepository implements IBookingRepository {
  private readonly key = 'nivel-bookings';

  async getAll(): Promise<Booking[]> {
    const data = localStorage.getItem(this.key);
    if (!data) {
      // Inicializar con datos de demo la primera vez
      await this.initializeData();
      return this.parseBookings(JSON.stringify(initialData.bookings));
    }
    return this.parseBookings(data);
  }

  async getById(id: string): Promise<Booking | null> {
    const bookings = await this.getAll();
    return bookings.find(b => b.id === id) || null;
  }

  async getByDate(date: Date): Promise<Booking[]> {
    const bookings = await this.getAll();
    return bookings.filter(b => 
      b.date.toDateString() === date.toDateString()
    );
  }

  async getByTrainer(trainerId: string): Promise<Booking[]> {
    const bookings = await this.getAll();
    return bookings.filter(b => b.trainerId === trainerId);
  }

  async create(booking: Omit<Booking, 'id'>): Promise<Booking> {
    const newBooking: Booking = { ...booking, id: crypto.randomUUID() };
    await this.save(newBooking);
    return newBooking;
  }

  async save(booking: Booking): Promise<void> {
    const bookings = await this.getAll();
    const index = bookings.findIndex(b => b.id === booking.id);

    if (index >= 0) {
      bookings[index] = booking;
    } else {
      bookings.push(booking);
    }

    localStorage.setItem(this.key, JSON.stringify(bookings));
  }

  async update(id: string, booking: Partial<Booking>): Promise<void> {
    const bookings = await this.getAll();
    const index = bookings.findIndex(b => b.id === id);
    
    if (index >= 0) {
      bookings[index] = { ...bookings[index], ...booking };
      localStorage.setItem(this.key, JSON.stringify(bookings));
    }
  }

  async delete(id: string): Promise<void> {
    const bookings = await this.getAll();
    const filtered = bookings.filter(b => b.id !== id);
    localStorage.setItem(this.key, JSON.stringify(filtered));
  }

  private parseBookings(data: string): Booking[] {
    const parsed = JSON.parse(data) as Array<Omit<Booking, 'date'> & { date: string }>;
    return parsed.map((b) => ({
      ...b,
      date: new Date(b.date)
    }));
  }

  private async initializeData(): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(initialData.bookings));
  }
}

class LocalStorageProgramRepository implements IProgramRepository {
  private readonly key = 'nivel-programs';

  async getAll(): Promise<Program[]> {
    const data = localStorage.getItem(this.key);
    if (!data) return [];
    return this.parsePrograms(data);
  }

  async getById(id: string): Promise<Program | null> {
    const programs = await this.getAll();
    return programs.find(p => p.id === id) || null;
  }

  async getByTrainer(trainerId: string): Promise<Program[]> {
    const programs = await this.getAll();
    return programs.filter(p => p.trainerId === trainerId);
  }

  async getByClient(clientId: string): Promise<Program[]> {
    const programs = await this.getAll();
    return programs.filter(p => p.clientIds.includes(clientId));
  }

  async create(program: Omit<Program, 'id'>): Promise<Program> {
    const newProgram: Program = { ...program, id: crypto.randomUUID() };
    await this.save(newProgram);
    return newProgram;
  }

  async save(program: Program): Promise<void> {
    const programs = await this.getAll();
    const index = programs.findIndex(p => p.id === program.id);

    if (index >= 0) {
      programs[index] = program;
    } else {
      programs.push(program);
    }

    localStorage.setItem(this.key, JSON.stringify(programs));
  }

  async delete(id: string): Promise<void> {
    const programs = await this.getAll();
    const filtered = programs.filter(p => p.id !== id);
    localStorage.setItem(this.key, JSON.stringify(filtered));
  }

  private parsePrograms(data: string): Program[] {
    const parsed = JSON.parse(data) as Array<Omit<Program, 'startDate' | 'endDate'> & { startDate: string; endDate: string }>;
    return parsed.map(p => ({
      ...p,
      startDate: new Date(p.startDate),
      endDate: new Date(p.endDate),
    }));
  }
}

export class LocalStorageDataService implements IDataService {
  clients: IClientRepository;
  trainers: ITrainerRepository;
  bookings: IBookingRepository;
  programs: IProgramRepository;

  constructor() {
    this.clients = new LocalStorageClientRepository();
    this.trainers = new LocalStorageTrainerRepository();
    this.bookings = new LocalStorageBookingRepository();
    this.programs = new LocalStorageProgramRepository();
  }

  async initialize(): Promise<void> {
    // Inicializar datos de demo si no existen
    const trainers = await this.trainers.getAll();
    if (trainers.length === 0) {
      for (const trainer of initialData.trainers) {
        await this.trainers.save(trainer);
      }
    }

    // Inicializar horarios preestablecidos si no existen
    const schedules = await this.getAllSchedules();
    if (schedules.length === 0) {
      for (const schedule of initialData.trainerSchedules) {
        await this.trainers.saveSchedule(schedule);
      }
    }
  }

  private async getAllSchedules(): Promise<TrainerSchedule[]> {
    const data = localStorage.getItem('nivel-schedules');
    return data ? JSON.parse(data) : [];
  }

  async clear(): Promise<void> {
    localStorage.removeItem('nivel-clients');
    localStorage.removeItem('nivel-trainers');
    localStorage.removeItem('nivel-bookings');
    localStorage.removeItem('nivel-schedules');
    localStorage.removeItem('nivel-programs');
  }
}