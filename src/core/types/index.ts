// Interfaces base del dominio
export interface Trainer {
  id: string;
  name: string;
  availableSlots: string[];
}

// Configuración de zonas
export const ZONE_CONFIG = {
  gym: {
    id: 'gym' as const,
    name: 'Gym',
    label: 'Entrenamiento en el gym',
    icon: '🏋️',
    maxCapacity: 10 // Capacidad por entrenador
  },
  gabinete: {
    id: 'gabinete' as const,
    name: 'Gabinete',
    label: 'Sesión en gabinete',
    icon: '🏢',
    maxCapacity: 1 // Capacidad global
  }
} as const;

export type ZoneType = keyof typeof ZONE_CONFIG;

export interface ZoneConfig {
  id: string;
  name: string;
  label: string;
  icon: string;
  maxCapacity: number;
}

export interface Booking {
  id: string;
  clientName: string;
  trainerId: string;
  trainerName: string;
  date: Date;
  time: string;
  duration: number; // minutos
  zone: ZoneType;
  status: 'confirmed' | 'cancelled' | 'pending';
  programId?: string;
  clientId?: string;
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

export interface TimeSlotWithCapacity {
  time: string;
  count: number;
  totalCapacity: number;
  gymOccupancy?: number;
  gabineteOccupancy?: number;
  bookings: Booking[];
}

export interface AppState {
  trainers: Trainer[];
  bookings: Booking[];
  trainerSchedules: TrainerSchedule[];
  programs: Program[];
}

// Program Types
export type ProgramStatus = 'active' | 'expired' | 'completed' | 'suspended' | 'renewed';

export interface Program {
  id: string;
  clientId: string;
  clientName: string;
  trainerId: string;
  trainerName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  minimumSessions: number;
  frequencyPerWeek: number;
  startDate: string;
  endDate: string;
  status: ProgramStatus;
  createdAt: string;
  updatedAt: string;
  renewalDecision?: 'trainer' | 'expiration' | 'session_completion';
}

export interface ProgramStats {
  totalPrograms: number;
  activePrograms: number;
  expiredPrograms: number;
  completedPrograms: number;
  totalSessionsThisWeek: number;
  clientsNeedingRenewal: number;
}

export interface ProgramRenewal {
  programId: string;
  newTotalSessions: number;
  newEndDate: string;
  reason: string;
  renewedBy: string;
  renewedAt: string;
}
