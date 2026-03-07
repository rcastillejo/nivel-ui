import { makeAutoObservable, runInAction } from 'mobx';
import { BookingModel } from '../models/BookingModel';
import { Booking, Trainer, ZoneType, ZONE_CONFIG } from '../types';
import { BookingCapacityError } from '../types/errors';
import { isSameDay } from 'date-fns';

interface ZoneCapacity {
  current: number;
  max: number;
  available: boolean;
}

interface ZonesCapacity {
  gym: ZoneCapacity;
  gabinete: ZoneCapacity;
}

export class BookingViewModel {
  // Estado observable
  trainers: Trainer[] = [];
  availableSlots: string[] = [];
  bookings: Booking[] = [];
  isLoading = false;
  error: string | null = null;
  
  // Cache para capacidades (para acceso síncrono desde UI)
  private capacityCache = new Map<string, ZonesCapacity>();
  
  // Estado del formulario
  selectedDate: Date | null = null;
  selectedTrainer: Trainer | null = null;
  selectedTime: string | null = null;
  selectedZone: ZoneType | null = null;
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
      // Pre-cargar capacidades para los slots disponibles
      const slots = await this.model.getAvailableSlots(trainerId, date);
      
      // Pre-cachear capacidades para todos los slots
      await this.preloadCapacities(trainerId, date, slots);
      
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

    // Validación de capacidad en tiempo real
    if (!this.validateCapacity()) {
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
        zone: this.selectedZone!,
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
        if (err instanceof BookingCapacityError) {
          this.error = err.message;
        } else {
          this.error = err instanceof Error ? err.message : 'Error creando reserva';
        }
      });
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  // Métodos unificados para obtener capacidades
  async getZoneOccupancy(zone: ZoneType, date: Date, time: string, trainerId?: string): Promise<number> {
    return await this.model.getZoneOccupancy(zone, date, time, trainerId);
  }

  async getAllZonesOccupancy(date: Date, time: string, trainerId?: string): Promise<ZonesCapacity> {
    const cacheKey = `${date.toISOString()}-${time}-${trainerId || 'global'}`;
    
    // Verificar cache primero
    if (this.capacityCache.has(cacheKey)) {
      return this.capacityCache.get(cacheKey)!;
    }

    // Obtener del modelo
    const occupancies = await this.model.getAllZonesOccupancy(date, time, trainerId);
    
    const capacities: ZonesCapacity = {
      gym: {
        current: occupancies.gym,
        max: ZONE_CONFIG.gym.maxCapacity,
        available: occupancies.gym < ZONE_CONFIG.gym.maxCapacity
      },
      gabinete: {
        current: occupancies.gabinete,
        max: ZONE_CONFIG.gabinete.maxCapacity,
        available: occupancies.gabinete < ZONE_CONFIG.gabinete.maxCapacity
      }
    };

    // Guardar en cache
    runInAction(() => {
      this.capacityCache.set(cacheKey, capacities);
    });

    return capacities;
  }

  // Versión síncrona para uso en componentes (usa cache)
  getZonesCapacitySync(date: Date, time: string, trainerId?: string): ZonesCapacity | null {
    const cacheKey = `${date.toISOString()}-${time}-${trainerId || 'global'}`;
    return this.capacityCache.get(cacheKey) || null;
  }

  // Pre-cargar capacidades para múltiples slots
  private async preloadCapacities(trainerId: string, date: Date, slots: string[]) {
    const promises = slots.map(async (time) => {
      await this.getAllZonesOccupancy(date, time, trainerId);
    });
    
    await Promise.all(promises);
  }

  // Limpiar cache cuando cambian los bookings
  clearCapacityCache() {
    runInAction(() => {
      this.capacityCache.clear();
    });
  }

  private validateCapacity(): boolean {
    const currentCount = this.getCurrentBookingCount();
    const maxCapacity = ZONE_CONFIG[this.selectedZone!].maxCapacity;
    
    if (currentCount >= maxCapacity) {
      this.setError(`El ${ZONE_CONFIG[this.selectedZone!].name} está lleno para este horario. Aforo actual: ${currentCount}/${maxCapacity}`);
      return false;
    }
    
    return true;
  }

  private getCurrentBookingCount(): number {
    return this.bookings.filter(booking => 
      booking.zone === this.selectedZone &&
      isSameDay(booking.date, this.selectedDate!) &&
      booking.time === this.selectedTime &&
      booking.status === 'confirmed' &&
      // Para gym: filtrar por trainer, para gabinete: capacidad global
      (this.selectedZone === 'gym' ? booking.trainerId === this.selectedTrainer!.id : true)
    ).length;
  }

  setBookings(bookings: Booking[]) {
    this.bookings = bookings;
    // Limpiar cache cuando cambian los bookings
    this.clearCapacityCache();
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
    this.clearCapacityCache(); // Limpiar cache al cambiar fecha
    
    if (this.selectedTrainer) {
      this.loadAvailableSlots(this.selectedTrainer.id, date);
    }
  }

  setTrainer(trainerId: string) {
    const trainer = this.trainers.find(t => t.id === trainerId);
    this.selectedTrainer = trainer || null;
    this.selectedTime = null; // Reset time when trainer changes
    this.clearCapacityCache(); // Limpiar cache al cambiar trainer
    
    if (trainer && this.selectedDate) {
      this.loadAvailableSlots(trainer.id, this.selectedDate);
    }
  }

  setTime(time: string) {
    this.selectedTime = time;
  }

  setZone(zone: ZoneType) {
    this.selectedZone = zone;
  }

  setClientName(name: string) {
    this.clientName = name;
  }

  resetForm() {
    this.selectedDate = null;
    this.selectedTrainer = null;
    this.selectedTime = null;
    this.selectedZone = null;
    this.availableSlots = [];
    this.clearCapacityCache();
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
      this.selectedZone &&
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