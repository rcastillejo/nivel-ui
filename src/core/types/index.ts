export type UserRole = 'client' | 'trainer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export const AVAILABLE_TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30',
] as const;

// Interfaces base del dominio
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface Trainer {
  id: string;
  userId: string;
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
  clientId: string;
  trainerId: string;
  trainerName: string;
  date: Date;
  time: string;
  duration: number; // minutos
  zone: ZoneType;
  // TODO: 'pending' is never assigned — bookings are always created as 'confirmed'. Keep for future pre-confirmation flow.
  status: 'confirmed' | 'cancelled' | 'pending';
  startsAt?: Date; // instante UTC de inicio, calculado en el servidor al reservar
  clientTimezone?: string; // zona IANA del cliente usada al reservar
  programId?: string | null; // programa del que se consumió la sesión (si hubo)
}

// Anticipación mínima (en minutos) para cancelar una cita, por zona
export const CANCELLATION_NOTICE_MINUTES: Record<ZoneType, number> = {
  gym: 60,
  gabinete: 24 * 60,
};

export interface ClientAppointments {
  upcoming: Booking[]; // no canceladas, aún no terminadas; orden ascendente
  past: Booking[]; // terminadas o canceladas; orden descendente
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

export interface Program {
  id: string;
  name: string;
  description: string;
  trainerId: string;
  clientIds: string[];
  startDate: Date;
  endDate: Date;
  totalSessions: number;
  usedSessions: number;
  // TODO: 'inactive' is never assigned — programs transition from 'active' to 'expired' only. Keep for future manual deactivation feature.
  status: 'active' | 'inactive' | 'expired';
  previousProgramId?: string; // Referencia al programa anterior en caso de renovación
}
// Comandos de reserva ejecutados en el backend (Edge Function `bookings`)
export interface CreateBookingCommand {
  action: 'create';
  trainerId: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  zone: ZoneType;
  timeZone: string; // zona IANA del cliente
}

export interface CancelBookingCommand {
  action: 'cancel';
  bookingId: string;
}

export type BookingCommand = CreateBookingCommand | CancelBookingCommand;

// Representación serializable de una reserva (respuesta de la Edge Function)
export interface BookingDto {
  id: string;
  clientId: string;
  trainerId: string;
  trainerName: string;
  date: string; // yyyy-MM-dd
  time: string;
  duration: number;
  zone: ZoneType;
  status: Booking['status'];
  startsAt: string | null; // ISO 8601 UTC
  clientTimezone: string | null;
  programId: string | null;
}
