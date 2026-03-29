/**
 * Integration tests: ProgramModel ↔ LocalStorageDataService
 *
 * These tests exercise the full stack from ViewModel/Model down to the real
 * LocalStorageDataService (backed by jsdom's localStorage), with no mocks of
 * the persistence layer.
 *
 * Checklist (from CLAUDE.md §6):
 * - [x] Flujo completo ViewModel → Model → Repository con datos reales
 * - [x] Comportamiento de LocalStorageDataService con ProgramModel
 * - [x] Estado de localStorage limpiado entre tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageDataService } from '@/core/repositories/localStorage';
import { ProgramModel } from '@/core/models/ProgramModel';
import { ProgramViewModel } from '@/core/view-models/ProgramViewModel';
import {
  ActiveProgramAlreadyExistsError,
  ProgramExpiredError,
  ProgramNotFoundError,
  ProgramValidationError,
  InvalidSessionCountError
} from '@/core/types/errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
}

function validProgramData(overrides: Partial<Parameters<ProgramModel['createProgram']>[0]> = {}) {
  return {
    name: 'Plan de tonificación',
    description: 'Programa de prueba de integración',
    trainerId: 'trainer1',
    clientIds: ['client1'],
    startDate: tomorrow(),
    endDate: daysFromNow(30),
    totalSessions: 12,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let dataService: LocalStorageDataService;
let model: ProgramModel;

beforeEach(() => {
  // jsdom provides localStorage; clear it before each test to ensure isolation
  localStorage.clear();
  dataService = new LocalStorageDataService();
  model = new ProgramModel(dataService);
});

// ---------------------------------------------------------------------------
// ProgramModel + LocalStorageDataService
// ---------------------------------------------------------------------------

describe('ProgramModel ↔ LocalStorageDataService', () => {
  describe('createProgram', () => {
    it('persiste un programa nuevo en localStorage', async () => {
      const program = await model.createProgram(validProgramData());

      const saved = await dataService.programs.getById(program.id);
      expect(saved).not.toBeNull();
      expect(saved?.name).toBe('Plan de tonificación');
      expect(saved?.status).toBe('active');
      expect(saved?.usedSessions).toBe(0);
    });

    it('el programa creado tiene id único con formato correcto', async () => {
      const p1 = await model.createProgram(validProgramData({ clientIds: ['client1'] }));

      // Segundo programa para un cliente diferente
      const p2 = await model.createProgram(validProgramData({ clientIds: ['client2'] }));

      expect(p1.id).not.toBe(p2.id);
      expect(p1.id).toMatch(/^program_\d+_[a-z0-9]+$/);
    });

    it('lanza ActiveProgramAlreadyExistsError si el cliente ya tiene un programa activo', async () => {
      await model.createProgram(validProgramData());

      await expect(
        model.createProgram(validProgramData())
      ).rejects.toThrow(ActiveProgramAlreadyExistsError);
    });

    it('lanza ProgramValidationError si el nombre está vacío', async () => {
      await expect(
        model.createProgram(validProgramData({ name: '' }))
      ).rejects.toThrow(ProgramValidationError);
    });

    it('lanza ProgramValidationError si no hay clientes', async () => {
      await expect(
        model.createProgram(validProgramData({ clientIds: [] }))
      ).rejects.toThrow(ProgramValidationError);
    });

    it('lanza ProgramValidationError si la fecha de inicio es en el pasado', async () => {
      await expect(
        model.createProgram(
          validProgramData({ startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        )
      ).rejects.toThrow(ProgramValidationError);
    });

    it('lanza ProgramValidationError si endDate <= startDate', async () => {
      const start = daysFromNow(10);
      await expect(
        model.createProgram(validProgramData({ startDate: start, endDate: start }))
      ).rejects.toThrow(ProgramValidationError);
    });

    it('lanza ProgramValidationError si totalSessions < 1', async () => {
      await expect(
        model.createProgram(validProgramData({ totalSessions: 0 }))
      ).rejects.toThrow(ProgramValidationError);
    });
  });

  describe('getActiveProgram', () => {
    it('retorna el programa activo del cliente', async () => {
      const created = await model.createProgram(validProgramData());

      const active = await model.getActiveProgram('client1');
      expect(active?.id).toBe(created.id);
      expect(active?.status).toBe('active');
    });

    it('retorna null cuando el cliente no tiene programa activo', async () => {
      const result = await model.getActiveProgram('client_sin_programa');
      expect(result).toBeNull();
    });

    it('retorna null cuando el único programa del cliente está expirado', async () => {
      const program = await model.createProgram(validProgramData());
      await model.expireProgram(program.id);

      const result = await model.getActiveProgram('client1');
      expect(result).toBeNull();
    });
  });

  describe('renewProgram', () => {
    it('crea un nuevo programa y expira el anterior', async () => {
      const original = await model.createProgram(validProgramData());

      const renewed = await model.renewProgram(original.id, 20);

      // El programa renovado debe ser nuevo
      expect(renewed.id).not.toBe(original.id);
      expect(renewed.totalSessions).toBe(20);
      expect(renewed.usedSessions).toBe(0);
      expect(renewed.status).toBe('active');
      expect(renewed.previousProgramId).toBe(original.id);

      // El original debe estar expirado en localStorage
      const expiredOriginal = await dataService.programs.getById(original.id);
      expect(expiredOriginal?.status).toBe('expired');
    });

    it('el nuevo programa heredada el nombre y descripción del original', async () => {
      const original = await model.createProgram(validProgramData());
      const renewed = await model.renewProgram(original.id, 10);

      expect(renewed.name).toBe(original.name);
      expect(renewed.description).toBe(original.description);
      expect(renewed.trainerId).toBe(original.trainerId);
      expect(renewed.clientIds).toEqual(original.clientIds);
    });

    it('lanza ProgramNotFoundError si el programa no existe', async () => {
      await expect(
        model.renewProgram('programa_inexistente', 10)
      ).rejects.toThrow(ProgramNotFoundError);
    });

    it('lanza ProgramExpiredError si el programa ya está expirado', async () => {
      const program = await model.createProgram(validProgramData());
      await model.expireProgram(program.id);

      await expect(
        model.renewProgram(program.id, 10)
      ).rejects.toThrow(ProgramExpiredError);
    });
  });

  describe('expireProgram', () => {
    it('cambia el estado del programa a expirado en localStorage', async () => {
      const program = await model.createProgram(validProgramData());

      await model.expireProgram(program.id);

      const expired = await dataService.programs.getById(program.id);
      expect(expired?.status).toBe('expired');
    });

    it('lanza ProgramNotFoundError si el programa no existe', async () => {
      await expect(
        model.expireProgram('no_existe')
      ).rejects.toThrow(ProgramNotFoundError);
    });
  });

  describe('updateUsedSessions', () => {
    it('actualiza las sesiones usadas en localStorage', async () => {
      const program = await model.createProgram(validProgramData());

      const updated = await model.updateUsedSessions(program.id, 5);

      expect(updated.usedSessions).toBe(5);
      const saved = await dataService.programs.getById(program.id);
      expect(saved?.usedSessions).toBe(5);
    });

    it('lanza InvalidSessionCountError cuando usedSessions > totalSessions', async () => {
      const program = await model.createProgram(validProgramData({ totalSessions: 10 }));

      await expect(
        model.updateUsedSessions(program.id, 11)
      ).rejects.toThrow(InvalidSessionCountError);
    });

    it('permite actualizar usedSessions al máximo (igual a totalSessions)', async () => {
      const program = await model.createProgram(validProgramData({ totalSessions: 10 }));

      const updated = await model.updateUsedSessions(program.id, 10);
      expect(updated.usedSessions).toBe(10);
    });
  });

  describe('getProgramsByTrainer', () => {
    it('retorna todos los programas del entrenador', async () => {
      await model.createProgram(validProgramData({ clientIds: ['client1'] }));
      await model.createProgram(validProgramData({ clientIds: ['client2'] }));

      const programs = await model.getProgramsByTrainer('trainer1');
      expect(programs).toHaveLength(2);
      expect(programs.every(p => p.trainerId === 'trainer1')).toBe(true);
    });

    it('retorna arreglo vacío si el entrenador no tiene programas', async () => {
      const programs = await model.getProgramsByTrainer('trainer_sin_programas');
      expect(programs).toHaveLength(0);
    });
  });

  describe('getProgramsByClient', () => {
    it('retorna todos los programas del cliente (activos e históricos)', async () => {
      const p1 = await model.createProgram(validProgramData({ clientIds: ['client1'] }));
      await model.expireProgram(p1.id);
      await model.createProgram(validProgramData({ clientIds: ['client1'] }));

      const programs = await model.getProgramsByClient('client1');
      expect(programs).toHaveLength(2);
    });

    it('retorna arreglo vacío si el cliente no tiene programas', async () => {
      const programs = await model.getProgramsByClient('client_sin_programas');
      expect(programs).toHaveLength(0);
    });
  });

  describe('getPendingSessions', () => {
    it('calcula correctamente las sesiones pendientes', async () => {
      const program = await model.createProgram(validProgramData({ totalSessions: 12 }));
      await model.updateUsedSessions(program.id, 4);
      const updated = await dataService.programs.getById(program.id);

      const pending = model.getPendingSessions(updated!);
      expect(pending).toBe(8);
    });

    it('retorna 0 cuando todas las sesiones están usadas', async () => {
      const program = await model.createProgram(validProgramData({ totalSessions: 5 }));
      await model.updateUsedSessions(program.id, 5);
      const updated = await dataService.programs.getById(program.id);

      const pending = model.getPendingSessions(updated!);
      expect(pending).toBe(0);
    });
  });

  describe('flujo completo: crear → usar sesiones → renovar', () => {
    it('ejecuta el ciclo de vida completo de un programa', async () => {
      // 1. Crear programa
      const program = await model.createProgram(
        validProgramData({ totalSessions: 10, clientIds: ['client1'] })
      );
      expect(program.status).toBe('active');

      // 2. Usar sesiones progresivamente
      await model.updateUsedSessions(program.id, 5);
      await model.updateUsedSessions(program.id, 10);
      const full = await dataService.programs.getById(program.id);
      expect(full?.usedSessions).toBe(10);

      // 3. Renovar programa (crea nuevo, expira el anterior)
      const renewed = await model.renewProgram(program.id, 15);
      expect(renewed.usedSessions).toBe(0);
      expect(renewed.totalSessions).toBe(15);
      expect(renewed.status).toBe('active');
      expect(renewed.previousProgramId).toBe(program.id);

      // 4. El programa original está expirado
      const original = await dataService.programs.getById(program.id);
      expect(original?.status).toBe('expired');

      // 5. El cliente ahora tiene 2 programas en su historial
      const history = await model.getProgramsByClient('client1');
      expect(history).toHaveLength(2);
      expect(history.filter(p => p.status === 'active')).toHaveLength(1);
      expect(history.filter(p => p.status === 'expired')).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// ProgramViewModel ↔ ProgramModel ↔ LocalStorageDataService
// ---------------------------------------------------------------------------

describe('ProgramViewModel ↔ ProgramModel ↔ LocalStorageDataService', () => {
  let viewModel: ProgramViewModel;

  beforeEach(() => {
    localStorage.clear();
    dataService = new LocalStorageDataService();
    model = new ProgramModel(dataService);
    viewModel = new ProgramViewModel(model);
  });

  it('crea un programa a través del ViewModel y lo persiste en localStorage', async () => {
    viewModel.setFormName('Programa Integración');
    viewModel.setFormDescription('Descripción test integración');
    viewModel.setFormTrainerId('trainer1');
    viewModel.setFormClientIds(['client1']);
    viewModel.setFormStartDate(tomorrow());
    viewModel.setFormEndDate(daysFromNow(30));
    viewModel.setFormTotalSessions(8);

    const result = await viewModel.createProgram();

    expect(result).toBe(true);
    expect(viewModel.error).toBeNull();
    expect(viewModel.programs).toHaveLength(1);
    expect(viewModel.programs[0].name).toBe('Programa Integración');

    // Verificar persistencia real en localStorage
    const saved = await dataService.programs.getAll();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Programa Integración');
  });

  it('loadPrograms recupera programas guardados en localStorage', async () => {
    // Crear directamente vía el model para pre-poblar
    await model.createProgram(validProgramData({ clientIds: ['client1'], trainerId: 'trainer1' }));
    await model.createProgram(validProgramData({ clientIds: ['client2'], trainerId: 'trainer1' }));

    await viewModel.loadPrograms('trainer1');

    expect(viewModel.programs).toHaveLength(2);
    expect(viewModel.isLoading).toBe(false);
    expect(viewModel.error).toBeNull();
  });

  it('renewProgram a través del ViewModel actualiza el estado observable y localStorage', async () => {
    const original = await model.createProgram(validProgramData({ clientIds: ['client1'] }));
    await viewModel.loadPrograms('trainer1');

    const result = await viewModel.renewProgram(original.id, 20);

    expect(result).toBe(true);

    // Estado observable: el programa original está expirado
    const expiredInVM = viewModel.programs.find(p => p.id === original.id);
    expect(expiredInVM?.status).toBe('expired');

    // El nuevo programa está en la lista
    const renewed = viewModel.programs.find(p => p.previousProgramId === original.id);
    expect(renewed).toBeDefined();
    expect(renewed?.totalSessions).toBe(20);
    expect(renewed?.status).toBe('active');

    // Verificar en localStorage
    const savedOriginal = await dataService.programs.getById(original.id);
    expect(savedOriginal?.status).toBe('expired');
  });

  it('captura y expone errores de dominio en el ViewModel', async () => {
    // Intentar crear con formulario vacío
    const result = await viewModel.createProgram();

    expect(result).toBe(false);
    expect(viewModel.error).not.toBeNull();
  });

  it('expireProgram a través del ViewModel limpia activeProgram', async () => {
    const program = await model.createProgram(validProgramData({ clientIds: ['client1'] }));
    await viewModel.loadActiveProgram('client1');
    expect(viewModel.activeProgram?.id).toBe(program.id);

    const result = await viewModel.expireProgram(program.id);

    expect(result).toBe(true);
    expect(viewModel.activeProgram).toBeNull();

    // Verificar en localStorage
    const saved = await dataService.programs.getById(program.id);
    expect(saved?.status).toBe('expired');
  });
});
