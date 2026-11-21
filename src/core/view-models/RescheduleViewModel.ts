import { makeAutoObservable, runInAction } from 'mobx';
import { format, isSameDay } from 'date-fns';
import { BookingModel } from '../models/BookingModel';
import { IBookingCommands } from '../repositories';
import { getBrowserTimeZone } from '../utils/timezone';
import { Booking, Trainer, ZoneType } from '../types';

/**
 * Estado de la pantalla "Reprogramar cita": cita que se mueve, destino elegido
 * (fecha, entrenador, horario y zona), horarios disponibles y envío al backend.
 * La regla de negocio vive en el backend (Edge Function) y en BookingModel.
 */
export class RescheduleViewModel {
  target: Booking | null = null;
  trainers: Trainer[] = [];
  availableSlotsByTrainer: Record<string, string[]> = {};
  // Reservas de la fecha elegida, sin la que se mueve (no debe contar contra sí misma)
  bookings: Booking[] = [];
  selectedDate: Date | null = null;
  selectedTrainer: Trainer | null = null;
  selectedTime: string | null = null;
  selectedZone: ZoneType | null = null;
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;

  constructor(
    private model: BookingModel,
    private commands: IBookingCommands,
    private getTimeZone: () => string = getBrowserTimeZone,
    private now: () => Date = () => new Date()
  ) {
    makeAutoObservable(this);
  }

  get isOpen(): boolean {
    return this.target !== null;
  }

  get selectedTrainerName(): string | null {
    return this.selectedTrainer ? `Entrenador ${this.selectedTrainer.name}` : null;
  }

  get canConfirm(): boolean {
    return (
      this.target !== null &&
      this.selectedDate !== null &&
      this.selectedTrainer !== null &&
      this.selectedTime !== null &&
      this.selectedZone !== null &&
      !this.isCurrentSlot
    );
  }

  // Elegir exactamente el hueco en el que ya está la cita no es un cambio
  private get isCurrentSlot(): boolean {
    const target = this.target;
    if (!target || !this.selectedDate || !this.selectedTrainer) return false;
    return (
      target.trainerId === this.selectedTrainer.id &&
      target.zone === this.selectedZone &&
      target.time === this.selectedTime &&
      isSameDay(target.date, this.selectedDate)
    );
  }

  async start(booking: Booking): Promise<void> {
    this.resetSelection();
    this.target = booking;

    if (this.trainers.length > 0) return;
    try {
      const trainers = await this.model.getTrainers();
      runInAction(() => {
        this.trainers = trainers;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error cargando entrenadores';
      });
    }
  }

  close(): void {
    if (this.isSubmitting) return;
    this.target = null;
    this.resetSelection();
  }

  async setDate(date: Date): Promise<void> {
    const target = this.target;
    if (!target) return;

    this.selectedDate = date;
    this.clearSlot();
    this.error = null;
    this.isLoading = true;

    try {
      // Los horarios y el aforo no cuentan la reserva que se está moviendo
      const [entries, bookings] = await Promise.all([
        Promise.all(
          this.trainers.map(async (trainer) => {
            const slots = await this.model.getAvailableSlots(trainer.id, date, this.now(), target.id);
            return [trainer.id, slots] as const;
          })
        ),
        this.model.getBookingsByDate(date),
      ]);

      runInAction(() => {
        // Si el cliente cambió de fecha mientras cargaba, esta respuesta ya no sirve
        if (this.selectedDate !== date) return;
        this.availableSlotsByTrainer = Object.fromEntries(entries);
        this.bookings = bookings.filter((b) => b.id !== target.id);
      });
    } catch (err) {
      runInAction(() => {
        if (this.selectedDate !== date) return;
        this.error = err instanceof Error ? err.message : 'Error cargando disponibilidad';
      });
    } finally {
      runInAction(() => {
        if (this.selectedDate === date) this.isLoading = false;
      });
    }
  }

  selectSlot(trainerId: string, time: string): void {
    const trainer = this.trainers.find((t) => t.id === trainerId);
    if (!trainer) return;
    this.selectedTrainer = trainer;
    this.selectedTime = time;
  }

  setZone(zone: ZoneType): void {
    this.selectedZone = zone;
  }

  // Vuelve a elegir horario sin perder la fecha ni sus horarios
  clearSlot(): void {
    this.selectedTrainer = null;
    this.selectedTime = null;
    this.selectedZone = null;
  }

  async confirm(): Promise<boolean> {
    // Evita enviar dos veces por clics repetidos mientras la petición sigue en curso
    if (this.isSubmitting) return false;

    const target = this.target;
    if (!target || !this.selectedDate || !this.selectedTrainer || !this.selectedTime || !this.selectedZone) {
      this.error = 'Faltan datos para reprogramar la cita';
      return false;
    }

    this.isSubmitting = true;
    this.error = null;
    try {
      await this.commands.reschedule({
        bookingId: target.id,
        trainerId: this.selectedTrainer.id,
        date: format(this.selectedDate, 'yyyy-MM-dd'),
        time: this.selectedTime,
        zone: this.selectedZone,
        timeZone: this.getTimeZone(),
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'No se pudo reprogramar la cita';
        this.isSubmitting = false;
      });
      return false;
    }

    runInAction(() => {
      this.isSubmitting = false;
      this.target = null;
      this.resetSelection();
    });
    return true;
  }

  clearError(): void {
    this.error = null;
  }

  private resetSelection(): void {
    this.selectedDate = null;
    this.selectedTrainer = null;
    this.selectedTime = null;
    this.selectedZone = null;
    this.availableSlotsByTrainer = {};
    this.bookings = [];
    this.error = null;
  }
}
