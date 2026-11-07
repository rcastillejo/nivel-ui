import { makeAutoObservable, runInAction } from 'mobx';
import { Booking } from '../types';
import { BookingModel } from '../models/BookingModel';

export class ClientAppointmentsViewModel {
  upcoming: Booking[] = [];
  past: Booking[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private bookingModel: BookingModel,
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
    this.isLoading = true;
    this.error = null;

    try {
      const appointments = await this.bookingModel.getClientAppointments(clientId, this.now());
      runInAction(() => {
        this.upcoming = appointments.upcoming;
        this.past = appointments.past;
      });
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

  clearError(): void {
    this.error = null;
  }
}
