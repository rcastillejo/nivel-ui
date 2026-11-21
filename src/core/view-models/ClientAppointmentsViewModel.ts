import { makeAutoObservable, runInAction } from 'mobx';
import { Booking, CANCELLATION_NOTICE_MINUTES, ZONE_CONFIG } from '../types';
import { BookingModel } from '../models/BookingModel';
import { IBookingCommands } from '../repositories';

export class ClientAppointmentsViewModel {
  upcoming: Booking[] = [];
  past: Booking[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  // Cancelación: cita pendiente de confirmar, cita en proceso y error propio
  // (no reemplaza las listas: el cliente sigue viendo sus citas si falla).
  cancelTarget: Booking | null = null;
  cancellingId: string | null = null;
  cancelError: string | null = null;

  private clientId: string = '';

  constructor(
    private bookingModel: BookingModel,
    private commands: IBookingCommands,
    private now: () => Date = () => new Date()
  ) {
    makeAutoObservable(this);
  }

  get hasUpcoming(): boolean {
    return this.upcoming.length > 0;
  }

  get hasPast(): boolean {
    return this.past.length > 0;
  }

  get isEmpty(): boolean {
    return !this.hasUpcoming && !this.hasPast;
  }

  async load(clientId: string): Promise<void> {
    this.clientId = clientId;
    this.isLoading = true;
    this.error = null;

    try {
      await this.fetchAppointments();
    } catch (error) {
      runInAction(() => {
        this.upcoming = [];
        this.past = [];
        this.error = error instanceof Error ? error.message : 'No se pudieron cargar tus citas';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  canCancel(booking: Booking): boolean {
    return this.bookingModel.canCancel(booking, this.now());
  }

  cancellationNotice(booking: Booking): string {
    const hours = CANCELLATION_NOTICE_MINUTES[booking.zone] / 60;
    const label = hours === 1 ? '1 hora' : `${hours} horas`;
    return `Solo se puede cancelar con al menos ${label} de anticipación (${ZONE_CONFIG[booking.zone].name})`;
  }

  requestCancel(booking: Booking): void {
    this.cancelTarget = booking;
    this.cancelError = null;
  }

  dismissCancel(): void {
    if (this.cancellingId) return;
    this.cancelTarget = null;
    this.cancelError = null;
  }

  async confirmCancel(): Promise<boolean> {
    const target = this.cancelTarget;
    if (!target || this.cancellingId) {
      return false;
    }

    this.cancellingId = target.id;
    this.cancelError = null;

    try {
      await this.commands.cancel(target.id);
    } catch (error) {
      runInAction(() => {
        this.cancelError = error instanceof Error ? error.message : 'No se pudo cancelar la cita';
        this.cancellingId = null;
      });
      return false;
    }

    // La cancelación ya se hizo; si falla el refresco, las listas quedan como estaban
    try {
      await this.fetchAppointments();
    } catch {
      // Se mantiene la lista anterior; el cliente puede recargar la página
    }

    runInAction(() => {
      this.cancelTarget = null;
      this.cancellingId = null;
    });
    return true;
  }

  clearError(): void {
    this.error = null;
  }

  private async fetchAppointments(): Promise<void> {
    const appointments = await this.bookingModel.getClientAppointments(this.clientId, this.now());
    runInAction(() => {
      this.upcoming = appointments.upcoming;
      this.past = appointments.past;
    });
  }
}
