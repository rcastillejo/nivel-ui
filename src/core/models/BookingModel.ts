import { Booking, Trainer, ZoneType, ZONE_CONFIG } from '../types';
import { BookingCapacityError, BookingValidationError } from '../types/errors';
import { IDataService } from '../repositories';
import { isSameDay } from 'date-fns';

export class BookingModel {
  constructor(private dataService: IDataService) {}

  async createBooking(booking: Omit<Booking, 'id'>): Promise<Booking> {
    // Validaciones de negocio
    this.validateBooking(booking);
    
    // Verificar disponibilidad
    await this.checkAvailability(booking.trainerId, booking.date, booking.time);
    
    // Validar capacidad en tiempo real
    await this.validateCapacity(booking);
    
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
      const maxCapacity = 10;
      
      return trainer.availableSlots.filter(slot => {
        const bookingsForSlot = existingBookings.filter(
          b => b.trainerId === trainerId && 
               b.time === slot && 
               b.status === 'confirmed'
        );
        return bookingsForSlot.length < maxCapacity;
      });
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

    // Filtrar los que ya están llenos (capacidad máxima = 10)
    const existingBookings = await this.getBookingsByDate(date);
    const maxCapacity = 10;
    
    return availableSlots.filter(slot => {
      const bookingsForSlot = existingBookings.filter(
        b => b.trainerId === trainerId && 
             b.time === slot && 
             b.status === 'confirmed'
      );
      return bookingsForSlot.length < maxCapacity; // Disponible si hay menos de 10 reservas
    });
  }

  private validateBooking(booking: Omit<Booking, 'id'>): void {
    if (!booking.clientId.trim()) {
      throw new BookingValidationError('El cliente es requerido');
    }

    if (booking.duration < 30) {
      throw new BookingValidationError('La duración mínima es 30 minutos');
    }

    if (booking.duration > 180) {
      throw new BookingValidationError('La duración máxima es 180 minutos');
    }

    if (booking.date < new Date()) {
      throw new BookingValidationError('No se pueden hacer reservas en el pasado');
    }
  }

  private async checkAvailability(trainerId: string, date: Date, time: string): Promise<void> {
    const availableSlots = await this.getAvailableSlots(trainerId, date);
    if (!availableSlots.includes(time)) {
      throw new Error('El horario seleccionado no está disponible');
    }
  }

  private async validateCapacity(booking: Omit<Booking, 'id'>): Promise<void> {
    const existingBookings = await this.getBookingsByDate(booking.date);
    
    // Filtrar reservas para la misma zona y horario
    const sameZoneBookings = existingBookings.filter(
      b => b.date === booking.date &&
           b.time === booking.time &&
           b.zone === booking.zone &&
           b.status === 'confirmed'
    );
    
    // Obtener la capacidad máxima de la zona
    const maxCapacity = ZONE_CONFIG[booking.zone].maxCapacity;
    const currentOccupancy = sameZoneBookings.length;
    
    // Si la reserva excede la capacidad, lanzar error específico
    if (currentOccupancy >= maxCapacity) {
      throw new BookingCapacityError(booking.zone, currentOccupancy, maxCapacity);
    }
  }

  async getZoneOccupancy(zone: ZoneType, date: Date, time: string, trainerId?: string): Promise<number> {
    const existingBookings = await this.getBookingsByDate(date);
    
    // Para GYM: capacidad por zona y horario (filtrar por trainer si se especifica)
    if (zone === 'gym') {
      const gymBookings = existingBookings.filter(
        b => isSameDay(b.date, date) &&
             b.time === time &&
             b.zone === 'gym' &&
             b.status === 'confirmed' &&
             // Filtrar por trainer SOLO si se especifica
             (!trainerId || b.trainerId === trainerId)
      );
      return gymBookings.length;
    }

    // Para GABINETE: capacidad global por horario (ignora trainerId)
    const gabineteBookings = existingBookings.filter(
      b => isSameDay(b.date, date) &&
           b.time === time &&
           b.zone === 'gabinete' &&
           b.status === 'confirmed'
    );
    return gabineteBookings.length;
  }

  async getAllZonesOccupancy(date: Date, time: string, trainerId?: string): Promise<Record<ZoneType, number>> {
    return {
      gym: await this.getZoneOccupancy('gym', date, time, trainerId),
      gabinete: await this.getZoneOccupancy('gabinete', date, time)
    };
  }
}