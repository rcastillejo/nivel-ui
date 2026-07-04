import { Trainer, TrainerSchedule, AVAILABLE_TIME_SLOTS } from '../types';
import { IDataService } from '../repositories';
import { TrainerValidationError } from '../types/errors';

export class TrainerModel {
  constructor(private dataService: IDataService) {}

  async saveSchedule(trainerId: string, schedule: TrainerSchedule): Promise<void> {
    this.validateSchedule(schedule);
    await this.dataService.trainers.saveSchedule(schedule);
  }

  async getSchedule(trainerId: string): Promise<TrainerSchedule | null> {
    return this.dataService.trainers.getSchedule(trainerId);
  }

  async getTrainerByAuthUser(authUserId: string): Promise<Trainer | null> {
    return this.dataService.trainers.getByAuthUserId(authUserId);
  }

  generateDefaultSchedule(trainerId: string, trainerName: string): TrainerSchedule {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return {
      trainerId,
      trainerName,
      weeklySchedule: days.map(day => ({
        day,
        slots: [...AVAILABLE_TIME_SLOTS].map(time => ({ time, available: true }))
      }))
    };
  }

  isTimeSlotValid(time: string): boolean {
    return (AVAILABLE_TIME_SLOTS as readonly string[]).includes(time);
  }

  async cancelBooking(bookingId: string): Promise<void> {
    const booking = await this.dataService.bookings.getById(bookingId);
    if (!booking) {
      throw new TrainerValidationError('bookingId', `La reserva '${bookingId}' no existe`);
    }
    await this.dataService.bookings.update(bookingId, { status: 'cancelled' });
  }

  private validateSchedule(schedule: TrainerSchedule): void {
    if (!schedule.trainerId?.trim()) {
      throw new TrainerValidationError('trainerId', 'El ID del entrenador es requerido');
    }
    if (!schedule.trainerName?.trim()) {
      throw new TrainerValidationError('trainerName', 'El nombre del entrenador es requerido');
    }
    if (!schedule.weeklySchedule || schedule.weeklySchedule.length === 0) {
      throw new TrainerValidationError('weeklySchedule', 'El horario semanal no puede estar vacío');
    }
    for (const day of schedule.weeklySchedule) {
      for (const slot of day.slots) {
        if (!this.isTimeSlotValid(slot.time)) {
          throw new TrainerValidationError('time', `El horario '${slot.time}' no es válido`);
        }
      }
    }
  }
}
