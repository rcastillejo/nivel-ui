import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgramModel } from '@/core/models/ProgramModel';
import { IDataService } from '@/core/repositories';
import { Program } from '@/core/types';
import {
  ProgramNotFoundError,
  ProgramExpiredError,
  ActiveProgramAlreadyExistsError,
  ProgramValidationError,
  InvalidSessionCountError
} from '@/core/types/errors';

// Mock del data service
const mockProgramRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  getByTrainer: vi.fn(),
  getByClient: vi.fn(),
  save: vi.fn(),
  delete: vi.fn()
};

const mockDataService: IDataService = {
  clients: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByEmail: vi.fn(),
    save: vi.fn(),
    delete: vi.fn()
  },
  trainers: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByAuthUserId: vi.fn(),
    save: vi.fn(),
    saveSchedule: vi.fn(),
    getSchedule: vi.fn()
  },
  bookings: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByDate: vi.fn(),
    getByTrainer: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  programs: mockProgramRepository,
  initialize: vi.fn(),
  clear: vi.fn()
};

describe('ProgramModel', () => {
  let programModel: ProgramModel;

  beforeEach(() => {
    programModel = new ProgramModel(mockDataService);
    vi.clearAllMocks();
  });

  describe('createProgram', () => {
    const validProgramData = {
      name: 'Programa de Fitness',
      description: 'Programa de entrenamiento personalizado',
      trainerId: 'trainer1',
      clientIds: ['client1', 'client2'],
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      totalSessions: 10
    };

    it('should create a program successfully', async () => {
      mockProgramRepository.getByClient.mockResolvedValue([]);
      mockProgramRepository.save.mockResolvedValue(undefined);

      const result = await programModel.createProgram(validProgramData);

      expect(result).toMatchObject({
        name: validProgramData.name,
        description: validProgramData.description,
        trainerId: validProgramData.trainerId,
        clientIds: validProgramData.clientIds,
        totalSessions: validProgramData.totalSessions,
        usedSessions: 0,
        status: 'active'
      });
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^program_\d+_[a-z0-9]+$/);
      expect(mockProgramRepository.save).toHaveBeenCalledWith(result);
    });

    it('should throw ProgramValidationError when name is empty', async () => {
      const invalidProgram = { ...validProgramData, name: '' };

      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(ProgramValidationError);
      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(
        'El nombre del programa es requerido'
      );
    });

    it('should throw ProgramValidationError when description is empty', async () => {
      const invalidProgram = { ...validProgramData, description: '' };

      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(ProgramValidationError);
      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(
        'La descripción del programa es requerida'
      );
    });

    it('should throw ProgramValidationError when trainerId is empty', async () => {
      const invalidProgram = { ...validProgramData, trainerId: '' };

      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(ProgramValidationError);
      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow('El entrenador es requerido');
    });

    it('should throw ProgramValidationError when clientIds is empty', async () => {
      const invalidProgram = { ...validProgramData, clientIds: [] };

      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(ProgramValidationError);
      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow('Al menos un cliente es requerido');
    });

    it('should throw ProgramValidationError when totalSessions is less than 1', async () => {
      const invalidProgram = { ...validProgramData, totalSessions: 0 };

      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(ProgramValidationError);
      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(
        'El programa debe tener al menos 1 sesión'
      );
    });

    it('should throw ProgramValidationError when endDate is not after startDate', async () => {
      const invalidProgram = {
        ...validProgramData,
        endDate: validProgramData.startDate
      };

      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(ProgramValidationError);
      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(
        'La fecha de finalización debe ser posterior a la de inicio'
      );
    });

    it('should throw ProgramValidationError when startDate is in the past', async () => {
      const invalidProgram = {
        ...validProgramData,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      };

      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(ProgramValidationError);
      await expect(programModel.createProgram(invalidProgram)).rejects.toThrow(
        'La fecha de inicio no puede ser en el pasado'
      );
    });

    it('should throw ActiveProgramAlreadyExistsError when client has active program', async () => {
      const existingProgram: Program = {
        id: 'program1',
        name: 'Existing Program',
        description: 'Already active',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 0,
        status: 'active'
      };

      mockProgramRepository.getByClient.mockResolvedValue([existingProgram]);

      await expect(programModel.createProgram(validProgramData)).rejects.toThrow(
        ActiveProgramAlreadyExistsError
      );
    });
  });

  describe('getActiveProgram', () => {
    it('should return active program for client', async () => {
      const activeProgram: Program = {
        id: 'program1',
        name: 'Active Program',
        description: 'Currently active',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 5,
        status: 'active'
      };

      const expiredProgram: Program = {
        ...activeProgram,
        id: 'program2',
        status: 'expired'
      };

      mockProgramRepository.getByClient.mockResolvedValue([expiredProgram, activeProgram]);

      const result = await programModel.getActiveProgram('client1');

      expect(result).toEqual(activeProgram);
    });

    it('should return null when no active program exists', async () => {
      mockProgramRepository.getByClient.mockResolvedValue([]);

      const result = await programModel.getActiveProgram('client1');

      expect(result).toBeNull();
    });
  });

  describe('renewProgram', () => {
    const previousProgram: Program = {
      id: 'program1',
      name: 'Old Program',
      description: 'Program to renew',
      trainerId: 'trainer1',
      clientIds: ['client1'],
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(),
      totalSessions: 10,
      usedSessions: 8,
      status: 'active'
    };

    it('should renew a program successfully', async () => {
      mockProgramRepository.getById.mockResolvedValue(previousProgram);
      mockProgramRepository.getByClient.mockResolvedValue([previousProgram]);
      mockProgramRepository.save.mockResolvedValue(undefined);

      const result = await programModel.renewProgram('program1', 15);

      expect(result).toMatchObject({
        name: previousProgram.name,
        description: previousProgram.description,
        trainerId: previousProgram.trainerId,
        clientIds: previousProgram.clientIds,
        totalSessions: 15,
        usedSessions: 0,
        status: 'active',
        previousProgramId: 'program1'
      });
      expect(result.id).not.toBe('program1');
      expect(mockProgramRepository.save).toHaveBeenCalledTimes(2); // New program + expire old one
    });

    it('should throw ProgramNotFoundError when program does not exist', async () => {
      mockProgramRepository.getById.mockResolvedValue(null);

      await expect(programModel.renewProgram('nonexistent', 15)).rejects.toThrow(ProgramNotFoundError);
    });

    it('should throw ProgramExpiredError when program is already expired', async () => {
      const expiredProgram: Program = {
        ...previousProgram,
        status: 'expired'
      };

      mockProgramRepository.getById.mockResolvedValue(expiredProgram);

      await expect(programModel.renewProgram('program1', 15)).rejects.toThrow(ProgramExpiredError);
    });

    it('should throw ActiveProgramAlreadyExistsError when another program is active for same client', async () => {
      const anotherActiveProgram: Program = {
        id: 'program2',
        name: 'Another Active',
        description: 'Also active',
        trainerId: 'trainer2',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 0,
        status: 'active'
      };

      mockProgramRepository.getById.mockResolvedValue(previousProgram);
      mockProgramRepository.getByClient.mockResolvedValue([previousProgram, anotherActiveProgram]);

      await expect(programModel.renewProgram('program1', 15)).rejects.toThrow(
        ActiveProgramAlreadyExistsError
      );
    });
  });

  describe('expireProgram', () => {
    it('should expire a program successfully', async () => {
      const program: Program = {
        id: 'program1',
        name: 'Program to Expire',
        description: 'Will be expired',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 5,
        status: 'active'
      };

      mockProgramRepository.getById.mockResolvedValue(program);
      mockProgramRepository.save.mockResolvedValue(undefined);

      await programModel.expireProgram('program1');

      expect(mockProgramRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'program1',
          status: 'expired'
        })
      );
    });

    it('should throw ProgramNotFoundError when program does not exist', async () => {
      mockProgramRepository.getById.mockResolvedValue(null);

      await expect(programModel.expireProgram('nonexistent')).rejects.toThrow(ProgramNotFoundError);
    });
  });

  describe('updateUsedSessions', () => {
    const program: Program = {
      id: 'program1',
      name: 'Program',
      description: 'Test',
      trainerId: 'trainer1',
      clientIds: ['client1'],
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalSessions: 10,
      usedSessions: 5,
      status: 'active'
    };

    it('should update used sessions successfully', async () => {
      mockProgramRepository.getById.mockResolvedValue(program);
      mockProgramRepository.save.mockResolvedValue(undefined);

      const result = await programModel.updateUsedSessions('program1', 7);

      expect(result).toMatchObject({
        ...program,
        usedSessions: 7
      });
      expect(mockProgramRepository.save).toHaveBeenCalled();
    });

    it('should throw InvalidSessionCountError when used sessions exceed total', async () => {
      mockProgramRepository.getById.mockResolvedValue(program);

      await expect(programModel.updateUsedSessions('program1', 11)).rejects.toThrow(
        InvalidSessionCountError
      );
    });

    it('should throw ProgramNotFoundError when program does not exist', async () => {
      mockProgramRepository.getById.mockResolvedValue(null);

      await expect(programModel.updateUsedSessions('nonexistent', 5)).rejects.toThrow(ProgramNotFoundError);
    });
  });

  describe('getPendingSessions', () => {
    it('should return pending sessions correctly', () => {
      const program: Program = {
        id: 'program1',
        name: 'Program',
        description: 'Test',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 3,
        status: 'active'
      };

      const result = programModel.getPendingSessions(program);

      expect(result).toBe(7);
    });

    it('should return 0 when all sessions are used', () => {
      const program: Program = {
        id: 'program1',
        name: 'Program',
        description: 'Test',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 10,
        status: 'active'
      };

      const result = programModel.getPendingSessions(program);

      expect(result).toBe(0);
    });
  });

  describe('getProgramsByTrainer', () => {
    it('should return all programs by trainer', async () => {
      const programs: Program[] = [
        {
          id: 'program1',
          name: 'Program 1',
          description: 'First program',
          trainerId: 'trainer1',
          clientIds: ['client1'],
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalSessions: 10,
          usedSessions: 0,
          status: 'active'
        }
      ];

      mockProgramRepository.getByTrainer.mockResolvedValue(programs);

      const result = await programModel.getProgramsByTrainer('trainer1');

      expect(result).toEqual(programs);
      expect(mockProgramRepository.getByTrainer).toHaveBeenCalledWith('trainer1');
    });
  });

  describe('getProgramsByClient', () => {
    it('should return all programs by client', async () => {
      const programs: Program[] = [
        {
          id: 'program1',
          name: 'Program 1',
          description: 'First program',
          trainerId: 'trainer1',
          clientIds: ['client1'],
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalSessions: 10,
          usedSessions: 0,
          status: 'active'
        }
      ];

      mockProgramRepository.getByClient.mockResolvedValue(programs);

      const result = await programModel.getProgramsByClient('client1');

      expect(result).toEqual(programs);
      expect(mockProgramRepository.getByClient).toHaveBeenCalledWith('client1');
    });
  });

  describe('consumeSession', () => {
    const program: Program = {
      id: 'program1',
      name: 'Program',
      description: 'Test',
      trainerId: 'trainer1',
      clientIds: ['client1'],
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalSessions: 10,
      usedSessions: 5,
      status: 'active'
    };

    it('should increment usedSessions and return the updated program', async () => {
      mockProgramRepository.getById.mockResolvedValue(program);
      mockProgramRepository.save.mockResolvedValue(undefined);

      const result = await programModel.consumeSession('program1');

      expect(result).toMatchObject({ ...program, usedSessions: 6 });
      expect(mockProgramRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ usedSessions: 6 })
      );
    });

    it('should return null when sessions are exhausted (usedSessions >= totalSessions)', async () => {
      const exhaustedProgram: Program = { ...program, usedSessions: 10, totalSessions: 10 };
      mockProgramRepository.getById.mockResolvedValue(exhaustedProgram);

      const result = await programModel.consumeSession('program1');

      expect(result).toBeNull();
      expect(mockProgramRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ProgramNotFoundError when program does not exist', async () => {
      mockProgramRepository.getById.mockResolvedValue(null);

      await expect(programModel.consumeSession('nonexistent')).rejects.toThrow(ProgramNotFoundError);
    });
  });

  describe('consumeSessionForClient', () => {
    const activeProgram: Program = {
      id: 'program1',
      name: 'Program',
      description: 'Test',
      trainerId: 'trainer1',
      clientIds: ['client1'],
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalSessions: 10,
      usedSessions: 5,
      status: 'active'
    };

    it('should consume a session when client has an active program with available sessions', async () => {
      mockProgramRepository.getByClient.mockResolvedValue([activeProgram]);
      mockProgramRepository.getById.mockResolvedValue(activeProgram);
      mockProgramRepository.save.mockResolvedValue(undefined);

      const result = await programModel.consumeSessionForClient('client1');

      expect(result).toMatchObject({ ...activeProgram, usedSessions: 6 });
      expect(mockProgramRepository.save).toHaveBeenCalled();
    });

    it('should return null when client has no active program', async () => {
      mockProgramRepository.getByClient.mockResolvedValue([]);

      const result = await programModel.consumeSessionForClient('client1');

      expect(result).toBeNull();
      expect(mockProgramRepository.save).not.toHaveBeenCalled();
    });

    it('should return null when client program has no sessions left', async () => {
      const exhaustedProgram: Program = { ...activeProgram, usedSessions: 10, totalSessions: 10 };
      mockProgramRepository.getByClient.mockResolvedValue([exhaustedProgram]);
      mockProgramRepository.getById.mockResolvedValue(exhaustedProgram);

      const result = await programModel.consumeSessionForClient('client1');

      expect(result).toBeNull();
      expect(mockProgramRepository.save).not.toHaveBeenCalled();
    });
  });
});
