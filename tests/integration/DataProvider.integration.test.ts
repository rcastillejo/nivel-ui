/**
 * Integration tests: DataProvider initialization contract
 *
 * These tests guard the functional behavior that DataProvider is responsible
 * for: calling service.initialize() to seed demo data and providing a working
 * IDataService to the ViewModel layer.
 *
 * After the DataProvider cleanup (removing React state / useData()), these
 * tests ensure the initialization chain still works correctly.
 *
 * Checklist (CLAUDE.md §6):
 * - [x] Flujo Model → Repository con datos reales (sin mocks de persistencia)
 * - [x] Comportamiento de LocalStorageDataService.initialize()
 * - [x] Estado de localStorage limpiado entre tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageDataService } from '@/core/repositories/localStorage';
import { BookingModel } from '@/core/models/BookingModel';
import { BookingViewModel } from '@/core/view-models/BookingViewModel';
import { ProgramModel } from '@/core/models/ProgramModel';
import { ClientModel } from '@/core/models/ClientModel';
import { ClientViewModel } from '@/core/view-models/ClientViewModel';

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// service.initialize() — comportamiento que DataProvider encapsula
// ---------------------------------------------------------------------------

describe('LocalStorageDataService.initialize()', () => {
  it('siembra entrenadores demo cuando localStorage está vacío', async () => {
    const service = new LocalStorageDataService();
    await service.initialize();

    const trainers = await service.trainers.getAll();
    expect(trainers.length).toBeGreaterThanOrEqual(1);
    expect(trainers[0].id).toBeDefined();
    expect(trainers[0].name).toBeDefined();
  });

  it('siembra horarios de entrenadores junto con los entrenadores', async () => {
    const service = new LocalStorageDataService();
    await service.initialize();

    const trainers = await service.trainers.getAll();
    // Cada entrenador debe tener horario configurado después de initialize()
    for (const trainer of trainers) {
      const schedule = await service.trainers.getSchedule(trainer.id);
      expect(schedule).not.toBeNull();
      expect(schedule!.weeklySchedule.length).toBeGreaterThan(0);
    }
  });

  it('es idempotente — llamarla dos veces no duplica los datos', async () => {
    const service = new LocalStorageDataService();
    await service.initialize();
    const countAfterFirst = (await service.trainers.getAll()).length;

    await service.initialize();
    const countAfterSecond = (await service.trainers.getAll()).length;

    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it('no borra datos existentes en localStorage si ya hay entrenadores', async () => {
    const service = new LocalStorageDataService();
    await service.initialize();
    const trainers = await service.trainers.getAll();
    const originalId = trainers[0].id;

    // Segunda inicialización no debe sobrescribir
    const service2 = new LocalStorageDataService();
    await service2.initialize();
    const trainers2 = await service2.trainers.getAll();

    expect(trainers2.find(t => t.id === originalId)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// BookingViewModel ↔ BookingModel ↔ service inicializado
// (cadena que DataProvider habilita al proveer el service)
// ---------------------------------------------------------------------------

describe('BookingViewModel con service inicializado', () => {
  let service: LocalStorageDataService;
  let bookingVM: BookingViewModel;

  beforeEach(async () => {
    service = new LocalStorageDataService();
    await service.initialize(); // simula lo que DataProvider hace al montar
    const bookingModel = new BookingModel(service);
    const programModel = new ProgramModel(service);
    bookingVM = new BookingViewModel(bookingModel, programModel);
  });

  it('loadTrainers carga los entrenadores sembrados por initialize()', async () => {
    await bookingVM.loadTrainers();

    expect(bookingVM.trainers.length).toBeGreaterThanOrEqual(1);
    expect(bookingVM.error).toBeNull();
    expect(bookingVM.isLoading).toBe(false);
  });

  it('después de loadTrainers los slots disponibles se pueden cargar para una fecha futura', async () => {
    await bookingVM.loadTrainers();

    const trainer = bookingVM.trainers[0];
    const nextMonday = getNextWeekday(1); // próximo lunes

    await bookingVM.loadAvailableSlots(trainer.id, nextMonday);

    // Con horario sembrado, debe haber slots disponibles en días laborables
    expect(Array.isArray(bookingVM.availableSlots)).toBe(true);
    expect(bookingVM.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ClientViewModel ↔ ClientModel ↔ service inicializado
// ---------------------------------------------------------------------------

describe('ClientViewModel con service inicializado', () => {
  it('loadClients carga los clientes demo del service', async () => {
    const service = new LocalStorageDataService();
    // Los clientes se cargan con datos por defecto aunque initialize() no los siembra
    // (LocalStorageDataService los devuelve desde initialData cuando localStorage está vacío)
    const clientModel = new ClientModel(service);
    const clientVM = new ClientViewModel(clientModel);

    await clientVM.loadClients();

    expect(clientVM.clients.length).toBeGreaterThanOrEqual(1);
    expect(clientVM.isLoading).toBe(false);
    expect(clientVM.error).toBeNull();
  });

  it('getClientName resuelve el nombre correcto después de loadClients', async () => {
    const service = new LocalStorageDataService();
    const clientVM = new ClientViewModel(new ClientModel(service));

    await clientVM.loadClients();
    const firstClient = clientVM.clients[0];

    expect(clientVM.getClientName(firstClient.id)).toBe(firstClient.name);
  });

  it('getClientName retorna el id si el cliente no existe', async () => {
    const service = new LocalStorageDataService();
    const clientVM = new ClientViewModel(new ClientModel(service));
    await clientVM.loadClients();

    expect(clientVM.getClientName('id_inexistente')).toBe('id_inexistente');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNextWeekday(dayOfWeek: number): Date {
  const date = new Date();
  const currentDay = date.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilTarget);
  date.setHours(12, 0, 0, 0);
  return date;
}
