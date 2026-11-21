import {
  Booking,
  CANCELLATION_NOTICE_MINUTES,
  ClientAppointments,
  Trainer,
  ZoneType,
  ZONE_CONFIG,
} from '../types';
import {
  BookingAlreadyCancelledError,
  BookingCancellationNoticeError,
  BookingCapacityError,
  BookingDuplicateError,
  BookingNotFoundError,
  BookingValidationError,
} from '../types/errors';
import { IDataService } from '../repositories';
import { zonedDateTimeToUtc } from '../utils/timezone';
import { addMinutes, format, isSameDay, startOfDay } from 'date-fns';

export class BookingModel {
  constructor(private dataService: IDataService) {}

  async createBooking(booking: Omit<Booking, 'id'>, now: Date = new Date()): Promise<Booking> {
    // Validaciones de negocio
    this.validateBooking(booking, now);
    
    // Verificar disponibilidad
    await this.checkAvailability(booking.trainerId, booking.date, booking.time);
    
    // Un cliente no puede tener dos reservas confirmadas en el mismo horario (con cualquier entrenador)
    await this.validateNoDuplicate(booking);

    // Validar capacidad en tiempo real
    await this.validateCapacity(booking);

    return this.dataService.bookings.create(booking);
  }

  async getTrainers(): Promise<Trainer[]> {
    return this.dataService.trainers.getAll();
  }

  async getTrainerById(id: string): Promise<Trainer | null> {
    return this.dataService.trainers.getById(id);
  }

  async getAllBookings(): Promise<Booking[]> {
    return this.dataService.bookings.getAll();
  }

  async getBookingsByDate(date: Date): Promise<Booking[]> {
    return this.dataService.bookings.getByDate(date);
  }

  async getClientAppointments(clientId: string, now: Date): Promise<ClientAppointments> {
    if (!clientId.trim()) {
      throw new BookingValidationError('El cliente es requerido');
    }

    const bookings = await this.dataService.bookings.getByClient(clientId);
    const upcoming: Booking[] = [];
    const past: Booking[] = [];

    for (const booking of bookings) {
      const isFinished = this.getBookingEnd(booking) <= now;
      if (booking.status === 'cancelled' || isFinished) {
        past.push(booking);
      } else {
        upcoming.push(booking);
      }
    }

    upcoming.sort((a, b) => this.getBookingStart(a).getTime() - this.getBookingStart(b).getTime());
    past.sort((a, b) => this.getBookingStart(b).getTime() - this.getBookingStart(a).getTime());

    return { upcoming, past };
  }

  async attachProgram(bookingId: string, programId: string): Promise<void> {
    await this.dataService.bookings.update(bookingId, { programId });
  }

  /** Indica si una cita puede cancelarse ahora (confirmada, no terminada y con la anticipación mínima). */
  canCancel(booking: Booking, now: Date): boolean {
    if (booking.status !== 'confirmed') return false;
    if (this.getBookingEnd(booking) <= now) return false;
    return this.hasEnoughNotice(booking, now);
  }

  async cancelBooking(bookingId: string, clientId: string, now: Date): Promise<Booking> {
    if (!clientId.trim()) {
      throw new BookingValidationError('El cliente es requerido');
    }

    const booking = await this.dataService.bookings.getById(bookingId);
    // Una cita ajena se trata igual que una inexistente para no revelar su existencia
    if (!booking || booking.clientId !== clientId) {
      throw new BookingNotFoundError(bookingId);
    }

    if (booking.status === 'cancelled') {
      throw new BookingAlreadyCancelledError(bookingId);
    }

    if (this.getBookingEnd(booking) <= now) {
      throw new BookingValidationError('La cita ya terminó y no se puede cancelar');
    }

    if (!this.hasEnoughNotice(booking, now)) {
      throw new BookingCancellationNoticeError(booking.zone, CANCELLATION_NOTICE_MINUTES[booking.zone]);
    }

    // Cancelación atómica: si otra petición ya la canceló, no se repite el efecto
    const changed = await this.dataService.bookings.cancelIfConfirmed(bookingId);
    if (!changed) {
      throw new BookingAlreadyCancelledError(bookingId);
    }

    return { ...booking, status: 'cancelled' };
  }

  /**
   * Horarios con cupo para un entrenador y una fecha. Si se indica `now`, se omiten los
   * horarios del día que ya empezaron (hora local), para no ofrecer lo que no se puede reservar.
   */
  async getAvailableSlots(trainerId: string, date: Date, now?: Date): Promise<string[]> {
    const slots = await this.listOpenSlots(trainerId, date);
    if (!now) {
      return slots;
    }
    return slots.filter(time => this.getBookingStart({ date, time }).getTime() > now.getTime());
  }

  private async listOpenSlots(trainerId: string, date: Date): Promise<string[]> {
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

  private hasEnoughNotice(booking: Booking, now: Date): boolean {
    const minNoticeMs = CANCELLATION_NOTICE_MINUTES[booking.zone] * 60_000;
    return this.getBookingStart(booking).getTime() - now.getTime() >= minNoticeMs;
  }

  private getBookingStart(booking: Pick<Booking, 'startsAt' | 'date' | 'time'>): Date {
    // Si el servidor ya calculó el instante UTC, ese es el inicio real
    if (booking.startsAt) {
      return booking.startsAt;
    }
    const [hours, minutes] = booking.time.split(':').map(Number);
    const start = startOfDay(booking.date);
    start.setHours(hours, minutes, 0, 0);
    return start;
  }

  private getBookingEnd(booking: Booking): Date {
    return addMinutes(this.getBookingStart(booking), booking.duration);
  }

  private validateBooking(booking: Omit<Booking, 'id'>, now: Date): void {
    if (!booking.clientId.trim()) {
      throw new BookingValidationError('El cliente es requerido');
    }

    if (booking.duration < 30) {
      throw new BookingValidationError('La duración mínima es 30 minutos');
    }

    if (booking.duration > 180) {
      throw new BookingValidationError('La duración máxima es 180 minutos');
    }

    // La reserva debe empezar después de "ahora": comparar solo el día dejaba reservar
    // hoy en un horario que ya pasó.
    if (this.resolveBookingStart(booking).getTime() <= now.getTime()) {
      throw new BookingValidationError('No se pueden hacer reservas en el pasado');
    }
  }

  /**
   * Instante en que empieza la reserva: el que ya calculó el servidor (startsAt), o bien
   * fecha + hora en la zona del cliente (el servidor corre en UTC), o en hora local.
   */
  private resolveBookingStart(booking: Pick<Booking, 'startsAt' | 'clientTimezone' | 'date' | 'time'>): Date {
    if (booking.startsAt) {
      return booking.startsAt;
    }
    if (booking.clientTimezone) {
      return zonedDateTimeToUtc(format(booking.date, 'yyyy-MM-dd'), booking.time, booking.clientTimezone);
    }
    return this.getBookingStart(booking);
  }

  private async checkAvailability(trainerId: string, date: Date, time: string): Promise<void> {
    const availableSlots = await this.getAvailableSlots(trainerId, date);
    if (!availableSlots.includes(time)) {
      throw new BookingValidationError('El horario seleccionado no está disponible');
    }
  }

  private async validateNoDuplicate(booking: Omit<Booking, 'id'>): Promise<void> {
    const clientBookings = await this.dataService.bookings.getByClient(booking.clientId);
    const hasSameSlot = clientBookings.some(
      b => b.status === 'confirmed' &&
           b.time === booking.time &&
           isSameDay(b.date, booking.date)
    );
    if (hasSameSlot) {
      throw new BookingDuplicateError();
    }
  }

  private async validateCapacity(booking: Omit<Booking, 'id'>): Promise<void> {
    const existingBookings = await this.getBookingsByDate(booking.date);
    
    // Filtrar reservas para la misma zona y horario
    const sameZoneBookings = existingBookings.filter(
      b => isSameDay(b.date, booking.date) &&
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