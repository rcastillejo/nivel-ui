import { Trainer, Booking, TrainerSchedule } from '../types';
import { ITrainerRepository, IBookingRepository, IDataService } from './index';

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

export class LocalStorageDataService implements IDataService {
  trainers: ITrainerRepository;
  bookings: IBookingRepository;

  constructor() {
    this.trainers = new LocalStorageTrainerRepository();
    this.bookings = new LocalStorageBookingRepository();
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

  private async getAllSchedules(): Promise<any[]> {
    const data = localStorage.getItem('nivel-schedules');
    return data ? JSON.parse(data) : [];
  }

  async clear(): Promise<void> {
    localStorage.removeItem('nivel-trainers');
    localStorage.removeItem('nivel-bookings');
    localStorage.removeItem('nivel-schedules');
  }
}
