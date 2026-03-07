import { makeAutoObservable, runInAction } from 'mobx';
import { BookingModel } from '../models/BookingModel';
import { Booking, Trainer, ZoneType, DaySchedule, TrainerSchedule } from '../types';
import { BookingCapacityError } from '../types/errors';
import { isSameDay } from 'date-fns';

export class TrainerViewModel {
  trainers: Trainer[] = [];
  bookings: Booking[] = [];
  isLoading = false;
  error: string | null = null;
  
  selectedDate: Date = new Date();
  selectedTrainerId: string | null = null;
  selectedDayIndex: number = new Date().getDay() === 0 ? -1 : new Date().getDay() - 1;

  constructor(private model: BookingModel) {
    makeAutoObservable(this);
  }

  // Acciones para trainers
  async loadTrainers() {
    this.setLoading(true);
    try {
      const trainers = await this.model.getTrainers();
      runInAction(() => {
        this.trainers = trainers;
        this.error = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error cargando entrenadores';
      });
    } finally {
      this.setLoading(false);
    }
  }

  async loadBookings(date: Date) {
    this.setLoading(true);
    try {
      const bookings = await this.model.getBookingsByDate(date);
      runInAction(() => {
        this.bookings = bookings;
        this.error = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error cargando reservas';
      });
    } finally {
      this.setLoading(false);
    }
  }

  // Acciones de configuración de horarios
  async saveSchedule(scheduleData: TrainerSchedule): Promise<boolean> {
    try {
      // Aquí iría la lógica para guardar el horario en el backend
      // Por ahora simulamos éxito
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      runInAction(() => {
        this.error = null;
      });
      
      return true;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error guardando horario';
      });
      return false;
    }
  }

  // Métodos unificados para obtener capacidades (reutilizados de BookingViewModel)
  async getZoneOccupancy(zone: ZoneType, date: Date, time: string, trainerId?: string): Promise<number> {
    return await this.model.getZoneOccupancy(zone, date, time, trainerId);
  }

  async getAllZonesOccupancy(date: Date, time: string, trainerId?: string): Promise<Record<ZoneType, number>> {
    return await this.model.getAllZonesOccupancy(date, time, trainerId);
  }

  // Métodos de utilidad para la vista
  async deleteBooking(bookingId: string): Promise<boolean> {
    try {
      // Aquí iría la lógica para eliminar la reserva del backend
      // Por ahora simulamos éxito y actualizamos el estado local
      runInAction(() => {
        this.bookings = this.bookings.filter(b => b.id !== bookingId);
        this.error = null;
      });
      
      return true;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error eliminando reserva';
      });
      return false;
    }
  }

  // Getters computed
  get selectedTrainer(): Trainer | undefined {
    return this.trainers.find(t => t.id === this.selectedTrainerId);
  }

  get trainerBookings(): Booking[] {
    if (!this.selectedTrainerId) return [];
    return this.bookings.filter(booking => 
      booking.trainerId === this.selectedTrainerId &&
      booking.status === 'confirmed'
    );
  }

  get trainerSchedule(): TrainerSchedule | undefined {
    // Aquí iría la lógica para obtener el horario del trainer del backend
    // Por ahora retornamos undefined para usar el horario por defecto
    return undefined;
  }

  get dailySlots(): DaySchedule {
    const schedule = this.trainerSchedule;
    if (!schedule || this.selectedDayIndex === -1) {
      // Si no hay horario configurado o es domingo, usar disponibilidad general
      const trainer = this.selectedTrainer;
      if (trainer) {
        return {
          day: this.getDayName(this.selectedDayIndex),
          slots: trainer.availableSlots.map(time => ({ time, available: true }))
        };
      }
      return { day: this.getDayName(this.selectedDayIndex), slots: [] };
    }

    return schedule.weeklySchedule[this.selectedDayIndex] || { 
      day: this.getDayName(this.selectedDayIndex), 
      slots: [] 
    };
  }

  // Métodos para actualizar estado
  setSelectedDate(date: Date) {
    this.selectedDate = date;
    // Actualizar el día seleccionado basado en la nueva fecha
    const dayOfWeek = date.getDay();
    this.selectedDayIndex = dayOfWeek === 0 ? -1 : dayOfWeek - 1;
    this.loadBookings(date);
  }

  setSelectedTrainer(trainerId: string) {
    this.selectedTrainerId = trainerId;
  }

  generateDefaultSchedule(): TrainerSchedule {
    const defaultSchedule: TrainerSchedule = {
      trainerId: this.selectedTrainerId!,
      trainerName: `Entrenador ${this.selectedTrainer?.name || ''}`,
      weeklySchedule: []
    };

    // Generar horario por defecto para cada día laborable (Lunes a Sábado)
    const allSlots = [
      '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
      '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
      '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'
    ];

    for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
      defaultSchedule.weeklySchedule[dayIndex] = {
        day: this.getDayName(dayIndex),
        slots: allSlots.map(time => ({ time, available: true }))
      };
    }

    return defaultSchedule;
  }

  // Métodos para validación
  isTimeSlotValid(time: string): boolean {
    const allSlots = [
      '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
      '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
      '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'
    ];
    return allSlots.includes(time);
  }

  hasBookingsAtTime(time: string): boolean {
    return this.trainerBookings.some(booking => booking.time === time);
  }

  async validateBookingLimit(time: string): Promise<boolean> {
    try {
      const occupancy = await this.getZoneOccupancy('gym', this.selectedDate, time, this.selectedTrainerId!);
      return occupancy < 10;
    } catch (error) {
      console.error('Error validating booking limit:', error);
      return false;
    }
  }

  // Método para limpiar errores
  clearError() {
    this.error = null;
  }

  // Método auxiliar para obtener nombre del día
  private getDayName(dayIndex: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dayIndex >= 0 && dayIndex < days.length ? days[dayIndex] : 'Día no válido';
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading;
  }
}