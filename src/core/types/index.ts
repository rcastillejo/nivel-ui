// Interfaces base del dominio
export interface Trainer {
  id: string;
  name: string;
  availableSlots: string[];
}

export interface Booking {
  id: string;
  clientName: string;
  trainerId: string;
  trainerName: string;
  date: Date;
  time: string;
  duration: number; // minutos
  status: 'confirmed' | 'cancelled' | 'pending';
}

export interface TrainerSchedule {
  trainerId: string;
  trainerName: string;
  weeklySchedule: DaySchedule[];
}

export interface DaySchedule {
  day: string;
  slots: TimeSlot[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface AppState {
  trainers: Trainer[];
  bookings: Booking[];
  trainerSchedules: TrainerSchedule[];
}
