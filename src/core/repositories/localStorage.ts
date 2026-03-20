import { Trainer, Booking, TrainerSchedule, Program, ProgramRenewal, ProgramStatus } from '../types';
import { ITrainerRepository, IBookingRepository, IProgramRepository, IProgramRenewalRepository, IDataService } from './index';

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
  trainers: [
    {
      id: 'trainer1',
      name: 'Diego Lamas',
      // Horarios dinámicos basados en el calendario del entrenador
      availableSlots: ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00']
    },
    {
      id: 'trainer2', 
      name: 'Jeanpierre Casas',
      // Horarios dinámicos basados en el calendario del entrenador
      availableSlots: ['08:00', '09:00', '15:00', '16:00', '19:00', '20:00']
    }
  ],
  bookings: [
    {
      id: 'booking1',
      clientName: 'María González',
      trainerId: 'trainer1',
      trainerName: 'Entrenador Diego Lamas',
      date: new Date(2026, 0, 22), // 22 enero 2026
      time: '09:00',
      duration: 60,
      status: 'confirmed' as const
    },
    {
      id: 'booking2',
      clientName: 'Carlos Ruiz', 
      trainerId: 'trainer2',
      trainerName: 'Entrenador Jeanpierre Casas',
      date: new Date(2026, 0, 23), // 23 enero 2026
      time: '16:00',
      duration: 60,
      status: 'confirmed' as const
    },
    {
      id: 'booking3',
      clientName: 'Ana Martín',
      trainerId: 'trainer1',
      trainerName: 'Entrenador Diego Lamas', 
      date: new Date(2026, 0, 24), // 24 enero 2026
      time: '10:00',
      duration: 60,
      status: 'cancelled' as const
    },
    {
      id: 'booking4',
      clientName: 'Luis Torres',
      trainerId: 'trainer1',
      trainerName: 'Entrenador Diego Lamas',
      date: new Date(2026, 0, 22), // 22 enero 2026 - mismo día y hora que booking1
      time: '09:00',
      duration: 60,
      status: 'confirmed' as const
    },
    {
      id: 'booking5',
      clientName: 'Patricia Vega',
      trainerId: 'trainer1',
      trainerName: 'Entrenador Diego Lamas',
      date: new Date(2026, 0, 22), // 22 enero 2026 - mismo día y hora que booking1
      time: '09:00',
      duration: 60,
      status: 'confirmed' as const
    },
    {
      id: 'booking6',
      clientName: 'Roberto Silva',
      trainerId: 'trainer1',
      trainerName: 'Entrenador Diego Lamas',
      date: new Date(2026, 0, 22), // 22 enero 2026 - mismo día y hora que booking1
      time: '09:00',
      duration: 60,
      status: 'confirmed' as const
    },
    {
      id: 'booking7',
      clientName: 'Laura Mendoza',
      trainerId: 'trainer2',
      trainerName: 'Entrenador Jeanpierre Casas',
      date: new Date(2026, 0, 23), // 23 enero 2026 - mismo día y hora que booking2
      time: '16:00',
      duration: 60,
      status: 'confirmed' as const
    },
    {
      id: 'booking8',
      clientName: 'Diego Castro',
      trainerId: 'trainer2',
      trainerName: 'Entrenador Jeanpierre Casas',
      date: new Date(2026, 0, 23), // 23 enero 2026 - mismo día y hora que booking2
      time: '16:00',
      duration: 60,
      status: 'confirmed' as const
    },
    {
      id: 'booking9',
      clientName: 'Luis Castillejo',
      trainerId: 'trainer2',
      trainerName: 'Entrenador Jeanpierre Casas',
      date: new Date(2026, 1, 23), // 23 febrero 2026 - mismo día y hora que booking2
      time: '16:00',
      duration: 60,
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
    const parsed = JSON.parse(data);
    return parsed.map((b: any) => ({
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
    if (!data) {
      // Inicializar con datos de demo la primera vez
      await this.initializeData();
      return this.parsePrograms(JSON.stringify([]));
    }
    return this.parsePrograms(data);
  }

  async getById(id: string): Promise<Program | null> {
    const programs = await this.getAll();
    return programs.find(p => p.id === id) || null;
  }

  async getByClientId(clientId: string): Promise<Program[]> {
    const programs = await this.getAll();
    return programs.filter(p => p.clientId === clientId);
  }

  async getByTrainerId(trainerId: string): Promise<Program[]> {
    const programs = await this.getAll();
    return programs.filter(p => p.trainerId === trainerId);
  }

  async getActivePrograms(): Promise<Program[]> {
    const programs = await this.getAll();
    return programs.filter(p => p.status === 'active');
  }

  async getExpiringPrograms(days: number): Promise<Program[]> {
    const programs = await this.getAll();
    const today = new Date();
    const expiryDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
    
    return programs.filter(p => {
      if (p.status !== 'active') return false;
      const endDate = new Date(p.endDate);
      return endDate <= expiryDate && endDate >= today;
    });
  }

  async getByStatus(status: string): Promise<Program[]> {
    const programs = await this.getAll();
    return programs.filter(p => p.status === status);
  }

  async save(program: Program): Promise<void> {
    const programs = await this.getAll();
    const index = programs.findIndex(p => p.id === program.id);
    
    if (index >= 0) {
      programs[index] = { ...programs[index], ...program, updatedAt: new Date().toISOString() };
    } else {
      programs.push({
        ...program,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    localStorage.setItem(this.key, JSON.stringify(programs));
  }

  async update(id: string, program: Partial<Program>): Promise<void> {
    const programs = await this.getAll();
    const index = programs.findIndex(p => p.id === id);
    
    if (index >= 0) {
      programs[index] = { 
        ...programs[index], 
        ...program, 
        updatedAt: new Date().toISOString() 
      };
      localStorage.setItem(this.key, JSON.stringify(programs));
    }
  }

  async delete(id: string): Promise<void> {
    const programs = await this.getAll();
    const filtered = programs.filter(p => p.id !== id);
    localStorage.setItem(this.key, JSON.stringify(filtered));
  }

  private parsePrograms(data: string): Program[] {
    const parsed = JSON.parse(data);
    return parsed.map((p: { createdAt: string | Date; updatedAt: string | Date; startDate: string | Date; endDate: string | Date }) => ({
      ...p,
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString(),
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : p.updatedAt.toISOString(),
      startDate: typeof p.startDate === 'string' ? p.startDate : p.startDate.toISOString().split('T')[0],
      endDate: typeof p.endDate === 'string' ? p.endDate : p.endDate.toISOString().split('T')[0]
    }));
  }

  private async initializeData(): Promise<void> {
    // Inicializar con array vacío por ahora
    localStorage.setItem(this.key, JSON.stringify([]));
  }
}

class LocalStorageRenewalRepository implements IProgramRenewalRepository {
  private readonly key = 'nivel-renewals';

  async getAll(): Promise<ProgramRenewal[]> {
    const data = localStorage.getItem(this.key);
    if (!data) {
      // Inicializar con datos de demo la primera vez
      await this.initializeData();
      return this.parseRenewals(JSON.stringify([]));
    }
    return this.parseRenewals(data);
  }

  async getById(id: string): Promise<ProgramRenewal | null> {
    const renewals = await this.getAll();
    return renewals.find(r => r.id === id) || null;
  }

  async getByProgramId(programId: string): Promise<ProgramRenewal[]> {
    const renewals = await this.getAll();
    return renewals.filter(r => r.programId === programId);
  }

  async getByClientId(clientId: string): Promise<ProgramRenewal[]> {
    const renewals = await this.getAll();
    // Necesitamos obtener el clientId a través del programa
    const result: ProgramRenewal[] = [];
    for (const renewal of renewals) {
      // Aquí necesitaríamos acceder al programa para obtener el clientId
      // Por ahora retornamos vacío hasta que implementemos la lógica correcta
      // o delegamos este método a un servicio de más alto nivel
    }
    return result;
  }

  async getByType(renewalType: string): Promise<ProgramRenewal[]> {
    const renewals = await this.getAll();
    return renewals.filter(r => r.renewalType === renewalType);
  }

  async save(renewal: ProgramRenewal): Promise<void> {
    const renewals = await this.getAll();
    const index = renewals.findIndex(r => r.id === renewal.id);
    
    if (index >= 0) {
      renewals[index] = renewal;
    } else {
      renewals.push(renewal);
    }
    
    localStorage.setItem(this.key, JSON.stringify(renewals));
  }

  async delete(id: string): Promise<void> {
    const renewals = await this.getAll();
    const filtered = renewals.filter(r => r.id !== id);
    localStorage.setItem(this.key, JSON.stringify(filtered));
  }

  private parseRenewals(data: string): ProgramRenewal[] {
    const parsed = JSON.parse(data);
    return parsed.map((r: { renewalDate: string | Date; newEndDate: string | Date }) => ({
      ...r,
      renewalDate: typeof r.renewalDate === 'string' ? new Date(r.renewalDate) : r.renewalDate,
      newEndDate: typeof r.newEndDate === 'string' ? new Date(r.newEndDate) : r.newEndDate
    }));
  }

  private async initializeData(): Promise<void> {
    // Inicializar con array vacío por ahora
    localStorage.setItem(this.key, JSON.stringify([]));
  }
}

export class LocalStorageDataService implements IDataService {
  trainers: ITrainerRepository;
  bookings: IBookingRepository;
  programs: IProgramRepository;
  renewals: IProgramRenewalRepository;

  constructor() {
    this.trainers = new LocalStorageTrainerRepository();
    this.bookings = new LocalStorageBookingRepository();
    this.programs = new LocalStorageProgramRepository();
    this.renewals = new LocalStorageRenewalRepository();
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
    localStorage.removeItem('nivel-trainers');
    localStorage.removeItem('nivel-bookings');
    localStorage.removeItem('nivel-schedules');
  }
}