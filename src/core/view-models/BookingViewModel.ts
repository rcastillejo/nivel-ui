import { makeAutoObservable, runInAction } from 'mobx';
import { BookingModel } from '../models/BookingModel';
import { ProgramModel } from '../models/ProgramModel';
import { Booking, Program, Trainer, ZoneType, ZONE_CONFIG } from '../types';
import { BookingCapacityError } from '../types/errors';

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
  activeProgram: Program | null = null;
  isLoading = false;
  error: string | null = null;
  
  // Cache para capacidades (para acceso síncrono desde UI)
  private capacityCache = new Map<string, ZonesCapacity>();
  
  // Estado del formulario
  selectedDate: Date | null = null;
  selectedTrainer: Trainer | null = null;
  selectedTime: string | null = null;
  selectedZone: ZoneType | null = null;
  clientId = 'client1'; // En una app real vendría de un selector de clientes
  
  // Estado de modales
  showSuccessModal = false;
  confirmedBooking: Booking | null = null;

  constructor(private model: BookingModel, private programModel: ProgramModel) {
    makeAutoObservable(this);
    // No cargar automáticamente en constructor para evitar hydration issues
  }

  initialize() {
    if (this.trainers.length === 0) {
      this.loadTrainers();
    }
    this.loadActiveProgram(this.clientId);
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

  async loadActiveProgram(clientId: string): Promise<void> {
    try {
      const program = await this.programModel.getActiveProgram(clientId);
      runInAction(() => {
        this.activeProgram = program;
      });
    } catch {
      // El programa es opcional — ignorar errores silenciosamente
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

    this.setLoading(true);
    try {
      const bookingData: Omit<Booking, 'id'> = {
        clientId: this.clientId,
        trainerId: this.selectedTrainer!.id,
        trainerName: `Entrenador ${this.selectedTrainer!.name}`,
        date: this.selectedDate!,
        time: this.selectedTime!,
        duration: 60,
        zone: this.selectedZone!,
        status: 'confirmed',
      };

      const createdBooking = await this.model.createBooking(bookingData);

      // Coordinar con ProgramModel: delegar el consumo de sesión completamente al Model
      await this.programModel.consumeSessionForClient(this.clientId);

      // Recargar el programa activo para reflejar la sesión descontada
      await this.loadActiveProgram(this.clientId);

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

  setClientId(id: string) {
    this.clientId = id;
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
      this.clientId.trim()
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

  get hasActiveProgram(): boolean {
    return this.activeProgram !== null && this.activeProgram.status === 'active';
  }

  get pendingSessions(): number | null {
    if (!this.activeProgram) return null;
    return this.activeProgram.totalSessions - this.activeProgram.usedSessions;
  }

  get activeProgramProgress(): number | null {
    if (!this.activeProgram) return null;
    return (this.activeProgram.usedSessions / this.activeProgram.totalSessions) * 100;
  }

  get hasLowSessions(): boolean {
    const pending = this.pendingSessions;
    return pending !== null && pending > 0 && pending < 3;
  }
}