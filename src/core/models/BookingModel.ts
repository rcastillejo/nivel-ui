import { Booking, Trainer } from '../types';
import { IDataService } from '../repositories';

export class BookingModel {
  constructor(private dataService: IDataService) {}

  async createBooking(booking: Omit<Booking, 'id'>): Promise<Booking> {
    // Validaciones de negocio
    this.validateBooking(booking);
    
    // Verificar disponibilidad
    await this.checkAvailability(booking.trainerId, booking.date, booking.time);
    
    const newBooking: Booking = {
      ...booking,
      id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    await this.dataService.bookings.save(newBooking);
    return newBooking;
  }

  async getTrainers(): Promise<Trainer[]> {
    return this.dataService.trainers.getAll();
  }

  async getTrainerById(id: string): Promise<Trainer | null> {
    return this.dataService.trainers.getById(id);
  }

  async getBookingsByDate(date: Date): Promise<Booking[]> {
    return this.dataService.bookings.getByDate(date);
  }

  async getAvailableSlots(trainerId: string, date: Date): Promise<string[]> {
    const trainer = await this.getTrainerById(trainerId);
    if (!trainer) return [];

    // Obtener el horario configurado del entrenador
    const trainerSchedule = await this.dataService.trainers.getSchedule(trainerId);
    if (!trainerSchedule) {
      // Si no hay horario configurado, usar los slots por defecto del entrenador
      const existingBookings = await this.getBookingsByDate(date);
      const bookedSlots = existingBookings
        .filter(b => b.trainerId === trainerId && b.status !== 'cancelled')
        .map(b => b.time);

      return trainer.availableSlots.filter(slot => !bookedSlots.includes(slot));
    }

    // Determinar qué día de la semana es
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const dayIndex = dayOfWeek === 0 ? -1 : dayOfWeek - 1; // Convertir a índice de días laborables (Lun=0, Sáb=5)
    
    // Si es domingo, no hay horarios disponibles
    if (dayIndex < 0 || dayIndex > 5) {
      return [];
    }

    const daySchedule = trainerSchedule.weeklySchedule[dayIndex];
    if (!daySchedule) return [];

    // Obtener solo los slots marcados como disponibles
    const availableSlots = daySchedule.slots
      .filter(slot => slot.available)
      .map(slot => slot.time);

    // Filtrar los que ya están reservados
    const existingBookings = await this.getBookingsByDate(date);
    const bookedSlots = existingBookings
      .filter(b => b.trainerId === trainerId && b.status !== 'cancelled')
      .map(b => b.time);

    return availableSlots.filter(slot => !bookedSlots.includes(slot));
  }

  private validateBooking(booking: Omit<Booking, 'id'>): void {
    if (!booking.clientName.trim()) {
      throw new Error('El nombre del cliente es requerido');
    }
    
    if (booking.duration < 30) {
      throw new Error('La duración mínima es 30 minutos');
    }
    
    if (booking.duration > 180) {
      throw new Error('La duración máxima es 180 minutos');
    }
    
    if (booking.date < new Date()) {
      throw new Error('No se pueden hacer reservas en el pasado');
    }
  }

  private async checkAvailability(trainerId: string, date: Date, time: string): Promise<void> {
    const availableSlots = await this.getAvailableSlots(trainerId, date);
    if (!availableSlots.includes(time)) {
      throw new Error('El horario seleccionado no está disponible');
    }
  }
}
