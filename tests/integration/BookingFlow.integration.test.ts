/**
 * Integration tests: BookingModel ↔ LocalStorageDataService
 *
 * Exercises the full booking flow from ViewModel/Model down to the real
 * LocalStorageDataService (backed by jsdom's localStorage), with no mocks of
 * the persistence layer.
 *
 * Checklist (CLAUDE.md §6):
 * - [x] Flujo completo ViewModel → Model → Repository con datos reales
 * - [x] Comportamiento de LocalStorageDataService con BookingModel
 * - [x] Estado de localStorage limpiado entre tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageDataService } from '@/core/repositories/localStorage';
import { BookingModel } from '@/core/models/BookingModel';
import { BookingViewModel } from '@/core/view-models/BookingViewModel';
import { ProgramModel } from '@/core/models/ProgramModel';
import { Booking, ZoneType } from '@/core/types';
import { BookingCapacityError, BookingValidationError } from '@/core/types/errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

function validBookingData(overrides: Partial<Omit<Booking, 'id'>> = {}): Omit<Booking, 'id'> {
  return {
    clientId: 'client1',
    trainerId: 'trainer1',
    trainerName: 'Entrenador Diego Lamas',
    date: tomorrow(),
    time: '09:00',
    duration: 60,
    zone: 'gym' as ZoneType,
    status: 'confirmed',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let service: LocalStorageDataService;
let model: BookingModel;

beforeEach(async () => {
  localStorage.clear();
  service = new LocalStorageDataService();
  await service.initialize();
  model = new BookingModel(service);
});

// ---------------------------------------------------------------------------
// BookingModel ↔ LocalStorageDataService
// ---------------------------------------------------------------------------

describe('BookingModel ↔ LocalStorageDataService', () => {
  describe('createBooking', () => {
    it('persiste una reserva nueva en localStorage', async () => {
      const booking = await model.createBooking(validBookingData());

      expect(booking.id).toBeDefined();
      const saved = await service.bookings.getById(booking.id);
      expect(saved).not.toBeNull();
      expect(saved!.clientId).toBe('client1');
      expect(saved!.zone).toBe('gym');
      expect(saved!.status).toBe('confirmed');
    });

    it('la reserva creada tiene id único', async () => {
      const b1 = await model.createBooking(validBookingData({ clientId: 'client1', zone: 'gym' }));
      const b2 = await model.createBooking(validBookingData({ clientId: 'client2', zone: 'gym' }));

      expect(b1.id).not.toBe(b2.id);
    });

    it('lanza BookingValidationError si el cliente está vacío', async () => {
      await expect(
        model.createBooking(validBookingData({ clientId: '' }))
      ).rejects.toThrow(BookingValidationError);
    });

    it('lanza BookingValidationError si la fecha es pasada', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await expect(
        model.createBooking(validBookingData({ date: yesterday }))
      ).rejects.toThrow(BookingValidationError);
    });

    it('lanza BookingValidationError si la duración es menor a 30 minutos', async () => {
      await expect(
        model.createBooking(validBookingData({ duration: 20 }))
      ).rejects.toThrow(BookingValidationError);
    });
  });

  describe('getBookingsByDate', () => {
    it('retorna solo las reservas del día indicado', async () => {
      const targetDate = tomorrow();
      await model.createBooking(validBookingData({ date: targetDate, clientId: 'client1', zone: 'gym' }));
      await model.createBooking(validBookingData({ date: targetDate, clientId: 'client2', zone: 'gym' }));

      const otherDate = new Date(targetDate);
      otherDate.setDate(otherDate.getDate() + 1);
      await model.createBooking(validBookingData({ date: otherDate, clientId: 'client3', zone: 'gym' }));

      const results = await model.getBookingsByDate(targetDate);
      // Las reservas devueltas son solo del targetDate (las de initialData pueden incluirse si coincide)
      const newOnes = results.filter(b => b.clientId === 'client1' || b.clientId === 'client2');
      expect(newOnes).toHaveLength(2);
      const wrongDate = results.filter(b => b.clientId === 'client3');
      expect(wrongDate).toHaveLength(0);
    });
  });

  describe('getAllBookings', () => {
    it('retorna todas las reservas incluyendo las de initialData', async () => {
      const before = (await model.getAllBookings()).length;
      await model.createBooking(validBookingData({ clientId: 'client1', zone: 'gym' }));
      const after = await model.getAllBookings();

      expect(after.length).toBe(before + 1);
    });
  });

  describe('getZoneOccupancy', () => {
    it('cuenta correctamente las reservas confirmadas en la zona gym', async () => {
      const date = tomorrow();
      const time = '09:00';

      await model.createBooking(validBookingData({ date, time, clientId: 'client1', zone: 'gym' }));
      await model.createBooking(validBookingData({ date, time, clientId: 'client2', zone: 'gym' }));

      const occupancy = await model.getZoneOccupancy('gym', date, time, 'trainer1');
      expect(occupancy).toBe(2);
    });

    it('no cuenta reservas canceladas en el aforo', async () => {
      const date = tomorrow();
      const time = '09:00';

      // Insertar directamente una reserva cancelada (sin pasar por createBooking)
      await service.bookings.create({
        clientId: 'client9',
        trainerId: 'trainer1',
        trainerName: 'Entrenador Diego Lamas',
        date,
        time,
        duration: 60,
        zone: 'gym',
        status: 'cancelled',
      });
      await model.createBooking(validBookingData({ date, time, clientId: 'client1', zone: 'gym' }));

      const occupancy = await model.getZoneOccupancy('gym', date, time, 'trainer1');
      expect(occupancy).toBe(1); // Solo la confirmada
    });

    it('gabinete tiene aforo global — no distingue por trainerId', async () => {
      const date = tomorrow();
      const time = '10:00';

      await model.createBooking(validBookingData({ date, time, trainerId: 'trainer1', clientId: 'client1', zone: 'gabinete' }));

      const occupancyWithTrainer = await model.getZoneOccupancy('gabinete', date, time, 'trainer1');
      const occupancyGlobal = await model.getZoneOccupancy('gabinete', date, time);
      expect(occupancyWithTrainer).toBe(occupancyGlobal);
    });
  });

  describe('validación de capacidad (BookingCapacityError)', () => {
    it('lanza BookingCapacityError cuando el gabinete está lleno (capacidad 1)', async () => {
      const date = tomorrow();
      const time = '10:00';

      // Llenar el gabinete (capacidad máxima = 1)
      await model.createBooking(validBookingData({ date, time, clientId: 'client1', zone: 'gabinete' }));

      // El segundo intento debe lanzar error de capacidad
      await expect(
        model.createBooking(validBookingData({ date, time, clientId: 'client2', zone: 'gabinete' }))
      ).rejects.toThrow(BookingCapacityError);
    });

    it('gym permite múltiples reservas hasta su capacidad máxima (10)', async () => {
      const date = tomorrow();
      const time = '11:00';

      // gym tiene capacidad 10 — deben caber 2 sin error
      await model.createBooking(validBookingData({ date, time, clientId: 'client1', zone: 'gym' }));
      const booking2 = await model.createBooking(
        validBookingData({ date, time, clientId: 'client2', zone: 'gym' })
      );
      expect(booking2.id).toBeDefined();
    });

    it('reservas en gym no bloquean el gabinete ni viceversa', async () => {
      const date = tomorrow();
      const time = '12:00';

      await model.createBooking(validBookingData({ date, time, clientId: 'client1', zone: 'gym' }));
      // El gabinete sigue disponible aunque gym tenga reservas
      const gabinete = await model.createBooking(
        validBookingData({ date, time, clientId: 'client2', zone: 'gabinete' })
      );
      expect(gabinete.zone).toBe('gabinete');
    });
  });

  describe('flujo completo: crear → verificar persistencia → aforo', () => {
    it('ejecuta el ciclo de vida de una reserva de principio a fin', async () => {
      const date = tomorrow();
      const time = '09:00';

      // 1. Crear reserva
      const booking = await model.createBooking(
        validBookingData({ date, time, clientId: 'client1', zone: 'gym' })
      );
      expect(booking.id).toBeDefined();
      expect(booking.status).toBe('confirmed');

      // 2. Verificar que persiste en localStorage
      const saved = await service.bookings.getById(booking.id);
      expect(saved).not.toBeNull();
      expect(saved!.clientId).toBe('client1');

      // 3. Verificar que aparece en getBookingsByDate
      const dayBookings = await model.getBookingsByDate(date);
      expect(dayBookings.some(b => b.id === booking.id)).toBe(true);

      // 4. Verificar que el aforo refleja la nueva reserva
      const occupancy = await model.getZoneOccupancy('gym', date, time, 'trainer1');
      expect(occupancy).toBeGreaterThanOrEqual(1);

      // 5. Verificar aforo de ambas zonas a la vez
      const both = await model.getAllZonesOccupancy(date, time, 'trainer1');
      expect(both.gym).toBeGreaterThanOrEqual(1);
      expect(typeof both.gabinete).toBe('number');
    });
  });
});

// ---------------------------------------------------------------------------
// BookingViewModel ↔ BookingModel ↔ LocalStorageDataService
// ---------------------------------------------------------------------------

describe('BookingViewModel ↔ BookingModel ↔ LocalStorageDataService', () => {
  let vm: BookingViewModel;

  beforeEach(() => {
    const programModel = new ProgramModel(service);
    vm = new BookingViewModel(model, programModel);
  });

  it('createBooking a través del ViewModel persiste en localStorage', async () => {
    await vm.loadTrainers();
    expect(vm.trainers.length).toBeGreaterThan(0);

    const trainer = vm.trainers[0];
    const date = tomorrow();

    vm.setDate(date);
    vm.setTrainer(trainer.id);
    await vm.loadAvailableSlots(trainer.id, date);

    // Usar un slot disponible si existe; si no hay (domingo), saltar test
    if (vm.availableSlots.length === 0) return;

    vm.setTime(vm.availableSlots[0]);
    vm.setZone('gym');

    const success = await vm.createBooking();

    expect(success).toBe(true);
    expect(vm.error).toBeNull();
    expect(vm.showSuccessModal).toBe(true);
    expect(vm.confirmedBooking).not.toBeNull();

    // Verificar persistencia real en localStorage
    const saved = await service.bookings.getById(vm.confirmedBooking!.id);
    expect(saved).not.toBeNull();
    expect(saved!.zone).toBe('gym');
  });

  it('createBooking falla con error de dominio si el gabinete está lleno', async () => {
    await vm.loadTrainers();
    const trainer = vm.trainers[0];
    const date = tomorrow();

    vm.setDate(date);
    vm.setTrainer(trainer.id);
    await vm.loadAvailableSlots(trainer.id, date);

    if (vm.availableSlots.length === 0) return;

    const time = vm.availableSlots[0];

    // Llenar el gabinete directamente vía el service (capacidad 1)
    await service.bookings.create({
      clientId: 'client9',
      trainerId: trainer.id,
      trainerName: `Entrenador ${trainer.name}`,
      date,
      time,
      duration: 60,
      zone: 'gabinete',
      status: 'confirmed',
    });

    vm.setTime(time);
    vm.setZone('gabinete');

    const success = await vm.createBooking();

    expect(success).toBe(false);
    expect(vm.error).not.toBeNull();
    expect(vm.showSuccessModal).toBe(false);
  });

  it('refreshBookings actualiza la lista de reservas después de crear una', async () => {
    await vm.loadTrainers();
    const trainer = vm.trainers[0];
    const date = tomorrow();

    vm.setDate(date);
    vm.setTrainer(trainer.id);
    await vm.loadAvailableSlots(trainer.id, date);

    if (vm.availableSlots.length === 0) return;

    vm.setTime(vm.availableSlots[0]);
    vm.setZone('gym');

    const before = vm.bookings.length;
    await vm.createBooking();
    await vm.refreshBookings();

    expect(vm.bookings.length).toBeGreaterThan(before);
  });
});
