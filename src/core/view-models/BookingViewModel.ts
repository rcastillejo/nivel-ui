import { makeAutoObservable, runInAction } from 'mobx';
import { BookingModel } from '../models/BookingModel';
import { Booking, Trainer } from '../types';

export class BookingViewModel {
  // Estado observable
  trainers: Trainer[] = [];
  availableSlots: string[] = [];
  isLoading = false;
  error: string | null = null;
  
  // Estado del formulario
  selectedDate: Date | null = null;
  selectedTrainer: Trainer | null = null;
  selectedTime: string | null = null;
  clientName = 'Cliente Demo'; // En una app real vendría de un formulario
  
  // Estado de modales
  showSuccessModal = false;
  confirmedBooking: Booking | null = null;

  constructor(private model: BookingModel) {
    makeAutoObservable(this);
    // No cargar automáticamente en constructor para evitar hydration issues
  }

  initialize() {
    if (this.trainers.length === 0) {
      this.loadTrainers();
    }
  }

  // Acciones
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

  async loadAvailableSlots(trainerId: string, date: Date) {
    this.setLoading(true);
    try {
      const slots = await this.model.getAvailableSlots(trainerId, date);
      runInAction(() => {
        this.availableSlots = slots;
        this.error = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error cargando disponibilidad';
      });
    } finally {
      this.setLoading(false);
    }
  }

  async createBooking(): Promise<boolean> {
    if (!this.canCreateBooking) {
      this.setError('Faltan datos para crear la reserva');
      return false;
    }

    this.setLoading(true);
    try {
      const bookingData: Omit<Booking, 'id'> = {
        clientName: this.clientName,
        trainerId: this.selectedTrainer!.id,
        trainerName: `Entrenador ${this.selectedTrainer!.name}`,
        date: this.selectedDate!,
        time: this.selectedTime!,
        duration: 60,
        status: 'confirmed'
      };

      const createdBooking = await this.model.createBooking(bookingData);
      
      runInAction(() => {
        this.error = null;
        // Mostrar modal de éxito con los datos de la reserva confirmada
        this.openSuccessModal(createdBooking);
      });
      
      return true;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error creando reserva';
      });
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  openSuccessModal(booking: Booking) {
    this.confirmedBooking = booking;
    this.showSuccessModal = true;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.confirmedBooking = null;
    // Reset form después de cerrar el modal
    this.resetForm();
  }

  setDate(date: Date) {
    this.selectedDate = date;
    this.selectedTime = null; // Reset time when date changes
    
    if (this.selectedTrainer) {
      this.loadAvailableSlots(this.selectedTrainer.id, date);
    }
  }

  setTrainer(trainerId: string) {
    const trainer = this.trainers.find(t => t.id === trainerId);
    this.selectedTrainer = trainer || null;
    this.selectedTime = null; // Reset time when trainer changes
    
    if (trainer && this.selectedDate) {
      this.loadAvailableSlots(trainer.id, this.selectedDate);
    }
  }

  setTime(time: string) {
    this.selectedTime = time;
  }

  setClientName(name: string) {
    this.clientName = name;
  }

  resetForm() {
    this.selectedDate = null;
    this.selectedTrainer = null;
    this.selectedTime = null;
    this.availableSlots = [];
  }

  clearError() {
    this.error = null;
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  private setError(error: string) {
    this.error = error;
  }

  // Computed values
  get canCreateBooking() {
    return !!(
      this.selectedDate &&
      this.selectedTrainer &&
      this.selectedTime &&
      this.clientName.trim()
    );
  }

  get selectedTrainerName() {
    return this.selectedTrainer ? `Entrenador ${this.selectedTrainer.name}` : null;
  }

  get formattedSelectedDate() {
    return this.selectedDate ? this.selectedDate.toLocaleDateString('es-ES') : null;
  }

  get hasAvailableSlots() {
    return this.availableSlots.length > 0;
  }
}
