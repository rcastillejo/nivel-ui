import { makeAutoObservable, runInAction } from 'mobx';
import { BookingModel } from '../models/BookingModel';
import { TrainerModel } from '../models/TrainerModel';
import { Booking, Trainer, ZoneType, DaySchedule, TrainerSchedule } from '../types';

export class TrainerViewModel {
  trainers: Trainer[] = [];
  bookings: Booking[] = [];
  currentSchedule: TrainerSchedule | null = null;
  isLoading = false;
  error: string | null = null;

  selectedDate: Date = new Date();
  selectedTrainerId: string | null = null;
  selectedDayIndex: number = new Date().getDay() === 0 ? -1 : new Date().getDay() - 1;

  constructor(
    private bookingModel: BookingModel,
    private trainerModel: TrainerModel
  ) {
    makeAutoObservable(this);
  }

  async loadTrainers(): Promise<void> {
    this.setLoading(true);
    try {
      const trainers = await this.bookingModel.getTrainers();
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

  async loadBookings(date: Date): Promise<void> {
    this.setLoading(true);
    try {
      const bookings = await this.bookingModel.getBookingsByDate(date);
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

  async loadSchedule(trainerId: string): Promise<void> {
    this.setLoading(true);
    try {
      const schedule = await this.trainerModel.getSchedule(trainerId);
      runInAction(() => {
        this.currentSchedule = schedule;
        this.error = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error cargando horario';
      });
    } finally {
      this.setLoading(false);
    }
  }

  async saveSchedule(scheduleData: TrainerSchedule): Promise<boolean> {
    try {
      await this.trainerModel.saveSchedule(scheduleData.trainerId, scheduleData);
      runInAction(() => {
        this.currentSchedule = scheduleData;
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

  async getZoneOccupancy(zone: ZoneType, date: Date, time: string, trainerId?: string): Promise<number> {
    return await this.bookingModel.getZoneOccupancy(zone, date, time, trainerId);
  }

  async getAllZonesOccupancy(date: Date, time: string, trainerId?: string): Promise<Record<ZoneType, number>> {
    return await this.bookingModel.getAllZonesOccupancy(date, time, trainerId);
  }

  async deleteBooking(bookingId: string): Promise<boolean> {
    try {
      await this.trainerModel.cancelBooking(bookingId);
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

  get trainerSchedule(): TrainerSchedule | null {
    return this.currentSchedule;
  }

  get dailySlots(): DaySchedule {
    const schedule = this.trainerSchedule;
    if (!schedule || this.selectedDayIndex === -1) {
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

  setSelectedDate(date: Date): void {
    this.selectedDate = date;
    const dayOfWeek = date.getDay();
    this.selectedDayIndex = dayOfWeek === 0 ? -1 : dayOfWeek - 1;
    this.loadBookings(date);
  }

  setSelectedTrainer(trainerId: string): void {
    this.selectedTrainerId = trainerId;
    this.loadSchedule(trainerId);
  }

  generateDefaultSchedule(): TrainerSchedule {
    return this.trainerModel.generateDefaultSchedule(
      this.selectedTrainerId!,
      this.selectedTrainer?.name || ''
    );
  }

  isTimeSlotValid(time: string): boolean {
    return this.trainerModel.isTimeSlotValid(time);
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

  clearError(): void {
    this.error = null;
  }

  private getDayName(dayIndex: number): string {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dayIndex >= 0 && dayIndex < days.length ? days[dayIndex] : 'Día no válido';
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
  }
}
