import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runInAction } from 'mobx';
import { ProgramViewModel } from '@/core/view-models/ProgramViewModel';
import { ProgramModel } from '@/core/models/ProgramModel';
import { Program } from '@/core/types';
import {
  ProgramNotFoundError,
  ProgramExpiredError,
  ActiveProgramAlreadyExistsError,
  ProgramValidationError,
  InvalidSessionCountError
} from '@/core/types/errors';

// Mock del ProgramModel
const mockProgramModel = {
  createProgram: vi.fn(),
  getActiveProgram: vi.fn(),
  renewProgram: vi.fn(),
  expireProgram: vi.fn(),
  updateUsedSessions: vi.fn(),
  getProgramsByTrainer: vi.fn(),
  getProgramsByClient: vi.fn(),
  getPendingSessions: vi.fn()
};

describe('ProgramViewModel', () => {
  let programViewModel: ProgramViewModel;

  beforeEach(() => {
    programViewModel = new ProgramViewModel(mockProgramModel as unknown as ProgramModel);
    vi.clearAllMocks();
  });

  describe('Form Data Management', () => {
    it('should update form data with setFormData', () => {
      programViewModel.setFormData('name', 'New Program');
      expect(programViewModel.formData.name).toBe('New Program');

      programViewModel.setFormData('totalSessions', 15);
      expect(programViewModel.formData.totalSessions).toBe(15);
    });

    it('should update form data with specific setters', () => {
      programViewModel.setFormName('Program Name');
      expect(programViewModel.formData.name).toBe('Program Name');

      programViewModel.setFormDescription('Program Description');
      expect(programViewModel.formData.description).toBe('Program Description');

      programViewModel.setFormTrainerId('trainer1');
      expect(programViewModel.formData.trainerId).toBe('trainer1');

      const clientIds = ['client1', 'client2'];
      programViewModel.setFormClientIds(clientIds);
      expect(programViewModel.formData.clientIds).toEqual(clientIds);

      const startDate = new Date('2024-04-01');
      programViewModel.setFormStartDate(startDate);
      expect(programViewModel.formData.startDate).toBe(startDate);

      const endDate = new Date('2024-05-01');
      programViewModel.setFormEndDate(endDate);
      expect(programViewModel.formData.endDate).toBe(endDate);

      programViewModel.setFormTotalSessions(20);
      expect(programViewModel.formData.totalSessions).toBe(20);
    });

    it('should reset form to initial state', () => {
      programViewModel.setFormName('Program');
      programViewModel.setFormDescription('Description');
      programViewModel.setFormTrainerId('trainer1');
      programViewModel.setFormClientIds(['client1']);
      programViewModel.setFormTotalSessions(10);

      programViewModel.resetForm();

      expect(programViewModel.formData).toEqual({
        name: '',
        description: '',
        trainerId: '',
        clientIds: [],
        startDate: null,
        endDate: null,
        totalSessions: 0
      });
    });
  });

  describe('Computed Values', () => {
    it('should validate canCreateProgram when all fields are valid', () => {
      programViewModel.setFormName('Program');
      programViewModel.setFormDescription('Description');
      programViewModel.setFormTrainerId('trainer1');
      programViewModel.setFormClientIds(['client1']);
      programViewModel.setFormTotalSessions(10);

      const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      programViewModel.setFormStartDate(startDate);
      programViewModel.setFormEndDate(endDate);

      expect(programViewModel.canCreateProgram).toBe(true);
    });

    it('should return false for canCreateProgram when name is missing', () => {
      programViewModel.setFormDescription('Description');
      programViewModel.setFormTrainerId('trainer1');
      programViewModel.setFormClientIds(['client1']);
      programViewModel.setFormTotalSessions(10);

      const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      programViewModel.setFormStartDate(startDate);
      programViewModel.setFormEndDate(endDate);

      expect(programViewModel.canCreateProgram).toBe(false);
    });

    it('should return false for canCreateProgram when clients are missing', () => {
      programViewModel.setFormName('Program');
      programViewModel.setFormDescription('Description');
      programViewModel.setFormTrainerId('trainer1');
      programViewModel.setFormClientIds([]);
      programViewModel.setFormTotalSessions(10);

      const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      programViewModel.setFormStartDate(startDate);
      programViewModel.setFormEndDate(endDate);

      expect(programViewModel.canCreateProgram).toBe(false);
    });

    it('should return false for canCreateProgram when endDate is not after startDate', () => {
      programViewModel.setFormName('Program');
      programViewModel.setFormDescription('Description');
      programViewModel.setFormTrainerId('trainer1');
      programViewModel.setFormClientIds(['client1']);
      programViewModel.setFormTotalSessions(10);

      const startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      programViewModel.setFormStartDate(startDate);
      programViewModel.setFormEndDate(endDate);

      expect(programViewModel.canCreateProgram).toBe(false);
    });

    it('should calculate activeProgramPendingSessions correctly', () => {
      const activeProgram: Program = {
        id: 'program1',
        name: 'Active Program',
        description: 'Current',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 3,
        status: 'active'
      };

      runInAction(() => {
        programViewModel.activeProgram = activeProgram;
      });

      expect(programViewModel.activeProgramPendingSessions).toBe(7);
    });

    it('should return null for activeProgramPendingSessions when no active program', () => {
      expect(programViewModel.activeProgramPendingSessions).toBeNull();
    });

    it('should calculate activeProgramProgress correctly', () => {
      const activeProgram: Program = {
        id: 'program1',
        name: 'Active Program',
        description: 'Current',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 5,
        status: 'active'
      };

      runInAction(() => {
        programViewModel.activeProgram = activeProgram;
      });

      expect(programViewModel.activeProgramProgress).toBe(50);
    });

    it('should return null for activeProgramProgress when no active program', () => {
      expect(programViewModel.activeProgramProgress).toBeNull();
    });

    it('should correctly identify if has active program', () => {
      const activeProgram: Program = {
        id: 'program1',
        name: 'Active Program',
        description: 'Current',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 0,
        status: 'active'
      };

      runInAction(() => {
        programViewModel.activeProgram = activeProgram;
      });

      expect(programViewModel.hasActiveProgram).toBe(true);
    });

    it('should return false hasActiveProgram when program is expired', () => {
      const expiredProgram: Program = {
        id: 'program1',
        name: 'Expired Program',
        description: 'Old',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(),
        totalSessions: 10,
        usedSessions: 10,
        status: 'expired'
      };

      runInAction(() => {
        programViewModel.activeProgram = expiredProgram;
      });

      expect(programViewModel.hasActiveProgram).toBe(false);
    });
  });

  describe('createProgram', () => {
    const newProgram: Program = {
      id: 'program1',
      name: 'New Program',
      description: 'Test Program',
      trainerId: 'trainer1',
      clientIds: ['client1'],
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalSessions: 10,
      usedSessions: 0,
      status: 'active'
    };

    it('should create program successfully', async () => {
      programViewModel.setFormName(newProgram.name);
      programViewModel.setFormDescription(newProgram.description);
      programViewModel.setFormTrainerId(newProgram.trainerId);
      programViewModel.setFormClientIds(newProgram.clientIds);
      programViewModel.setFormStartDate(newProgram.startDate);
      programViewModel.setFormEndDate(newProgram.endDate);
      programViewModel.setFormTotalSessions(newProgram.totalSessions);

      mockProgramModel.createProgram.mockResolvedValue(newProgram);

      const result = await programViewModel.createProgram();

      expect(result).toBe(true);
      expect(programViewModel.programs).toContainEqual(newProgram);
      expect(programViewModel.error).toBeNull();
      expect(programViewModel.showSuccessModal).toBe(true);
      expect(programViewModel.createdProgram).toEqual(newProgram);
      expect(programViewModel.formData).toEqual({
        name: '',
        description: '',
        trainerId: '',
        clientIds: [],
        startDate: null,
        endDate: null,
        totalSessions: 0
      });
    });

    it('should handle validation errors', async () => {
      programViewModel.setFormName('');
      programViewModel.setFormDescription('Description');
      programViewModel.setFormTrainerId('trainer1');
      programViewModel.setFormClientIds(['client1']);
      programViewModel.setFormStartDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
      programViewModel.setFormEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      programViewModel.setFormTotalSessions(10);

      const validationError = new ProgramValidationError('name', 'El nombre es requerido');
      mockProgramModel.createProgram.mockRejectedValue(validationError);

      const result = await programViewModel.createProgram();

      expect(result).toBe(false);
      expect(programViewModel.error).toBe('El nombre es requerido');
    });

    it('should handle active program already exists error', async () => {
      programViewModel.setFormName(newProgram.name);
      programViewModel.setFormDescription(newProgram.description);
      programViewModel.setFormTrainerId(newProgram.trainerId);
      programViewModel.setFormClientIds(newProgram.clientIds);
      programViewModel.setFormStartDate(newProgram.startDate);
      programViewModel.setFormEndDate(newProgram.endDate);
      programViewModel.setFormTotalSessions(newProgram.totalSessions);

      const error = new ActiveProgramAlreadyExistsError('client1');
      mockProgramModel.createProgram.mockRejectedValue(error);

      const result = await programViewModel.createProgram();

      expect(result).toBe(false);
      expect(programViewModel.error).toContain('cliente');
    });

    it('should return false when form is incomplete', async () => {
      programViewModel.setFormName('');

      const result = await programViewModel.createProgram();

      expect(result).toBe(false);
      expect(programViewModel.error).toBe('Faltan datos para crear el programa');
    });
  });

  describe('renewProgram', () => {
    const renewedProgram: Program = {
      id: 'program2',
      name: 'Renewed Program',
      description: 'Test Program',
      trainerId: 'trainer1',
      clientIds: ['client1'],
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalSessions: 20,
      usedSessions: 0,
      status: 'active',
      previousProgramId: 'program1'
    };

    it('should renew program successfully', async () => {
      const oldProgram: Program = {
        ...renewedProgram,
        id: 'program1',
        status: 'active',
        previousProgramId: undefined
      };

      runInAction(() => {
        programViewModel.programs = [oldProgram];
      });

      mockProgramModel.renewProgram.mockResolvedValue(renewedProgram);

      const result = await programViewModel.renewProgram('program1', 20);

      expect(result).toBe(true);
      expect(programViewModel.error).toBeNull();
      expect(programViewModel.programs).toContainEqual(renewedProgram);
      // Old program should be marked as expired
      const updatedOldProgram = programViewModel.programs.find(p => p.id === 'program1');
      expect(updatedOldProgram?.status).toBe('expired');
    });

    it('should handle program not found error', async () => {
      mockProgramModel.renewProgram.mockRejectedValue(new ProgramNotFoundError('program1'));

      const result = await programViewModel.renewProgram('program1', 20);

      expect(result).toBe(false);
      expect(programViewModel.error).toContain('no fue encontrado');
    });

    it('should handle expired program error', async () => {
      mockProgramModel.renewProgram.mockRejectedValue(new ProgramExpiredError('program1'));

      const result = await programViewModel.renewProgram('program1', 20);

      expect(result).toBe(false);
      expect(programViewModel.error).toContain('expirado');
    });
  });

  describe('expireProgram', () => {
    it('should expire program successfully', async () => {
      const program: Program = {
        id: 'program1',
        name: 'Program to Expire',
        description: 'Test',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 5,
        status: 'active'
      };

      runInAction(() => {
        programViewModel.programs = [program];
        programViewModel.activeProgram = program;
      });

      mockProgramModel.expireProgram.mockResolvedValue(undefined);

      const result = await programViewModel.expireProgram('program1');

      expect(result).toBe(true);
      expect(programViewModel.error).toBeNull();
      expect(programViewModel.activeProgram).toBeNull();
      const expiredProgram = programViewModel.programs.find(p => p.id === 'program1');
      expect(expiredProgram?.status).toBe('expired');
    });

    it('should handle program not found error', async () => {
      mockProgramModel.expireProgram.mockRejectedValue(new ProgramNotFoundError('program1'));

      const result = await programViewModel.expireProgram('program1');

      expect(result).toBe(false);
      expect(programViewModel.error).toContain('no fue encontrado');
    });
  });

  describe('updateUsedSessions', () => {
    it('should update used sessions successfully', async () => {
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

      const updatedProgram: Program = {
        ...program,
        usedSessions: 7
      };

      runInAction(() => {
        programViewModel.programs = [program];
        programViewModel.activeProgram = program;
      });

      mockProgramModel.updateUsedSessions.mockResolvedValue(updatedProgram);

      const result = await programViewModel.updateUsedSessions('program1', 7);

      expect(result).toBe(true);
      expect(programViewModel.error).toBeNull();
      expect(programViewModel.activeProgram?.usedSessions).toBe(7);
      const updated = programViewModel.programs.find(p => p.id === 'program1');
      expect(updated?.usedSessions).toBe(7);
    });

    it('should handle invalid session count error', async () => {
      mockProgramModel.updateUsedSessions.mockRejectedValue(
        new InvalidSessionCountError(15, 10)
      );

      const result = await programViewModel.updateUsedSessions('program1', 15);

      expect(result).toBe(false);
      expect(programViewModel.error).toContain('no pueden exceder');
    });
  });

  describe('loadPrograms', () => {
    it('should load programs by trainer', async () => {
      const programs: Program[] = [
        {
          id: 'program1',
          name: 'Program 1',
          description: 'Test 1',
          trainerId: 'trainer1',
          clientIds: ['client1'],
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalSessions: 10,
          usedSessions: 0,
          status: 'active'
        }
      ];

      mockProgramModel.getProgramsByTrainer.mockResolvedValue(programs);

      await programViewModel.loadPrograms('trainer1');

      expect(programViewModel.programs).toEqual(programs);
      expect(programViewModel.error).toBeNull();
    });
  });

  describe('loadProgramsByClient', () => {
    it('should load programs by client and set active program', async () => {
      const activeProgram: Program = {
        id: 'program1',
        name: 'Active Program',
        description: 'Current',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 0,
        status: 'active'
      };

      const expiredProgram: Program = {
        ...activeProgram,
        id: 'program2',
        status: 'expired'
      };

      const programs = [expiredProgram, activeProgram];

      mockProgramModel.getProgramsByClient.mockResolvedValue(programs);

      await programViewModel.loadProgramsByClient('client1');

      expect(programViewModel.programs).toEqual(programs);
      expect(programViewModel.activeProgram).toEqual(activeProgram);
      expect(programViewModel.error).toBeNull();
    });
  });

  describe('loadActiveProgram', () => {
    it('should load active program for client', async () => {
      const activeProgram: Program = {
        id: 'program1',
        name: 'Active Program',
        description: 'Current',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 0,
        status: 'active'
      };

      mockProgramModel.getActiveProgram.mockResolvedValue(activeProgram);

      await programViewModel.loadActiveProgram('client1');

      expect(programViewModel.activeProgram).toEqual(activeProgram);
      expect(programViewModel.error).toBeNull();
    });

    it('should set activeProgram to null when no active program exists', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(null);

      await programViewModel.loadActiveProgram('client1');

      expect(programViewModel.activeProgram).toBeNull();
      expect(programViewModel.error).toBeNull();
    });
  });

  describe('Error Management', () => {
    it('should clear error', () => {
      runInAction(() => {
        programViewModel.error = 'Some error';
      });

      programViewModel.clearError();

      expect(programViewModel.error).toBeNull();
    });
  });

  describe('Modal Management', () => {
    it('should open success modal with created program', () => {
      const program: Program = {
        id: 'program1',
        name: 'New Program',
        description: 'Test',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 0,
        status: 'active'
      };

      programViewModel.openSuccessModal(program);

      expect(programViewModel.showSuccessModal).toBe(true);
      expect(programViewModel.createdProgram).toEqual(program);
    });

    it('should close success modal', () => {
      const program: Program = {
        id: 'program1',
        name: 'New Program',
        description: 'Test',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 0,
        status: 'active'
      };

      programViewModel.openSuccessModal(program);
      programViewModel.closeSuccessModal();

      expect(programViewModel.showSuccessModal).toBe(false);
      expect(programViewModel.createdProgram).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should manage loading state during async operations', async () => {
      const program: Program = {
        id: 'program1',
        name: 'Program',
        description: 'Test',
        trainerId: 'trainer1',
        clientIds: ['client1'],
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSessions: 10,
        usedSessions: 0,
        status: 'active'
      };

      programViewModel.setFormName(program.name);
      programViewModel.setFormDescription(program.description);
      programViewModel.setFormTrainerId(program.trainerId);
      programViewModel.setFormClientIds(program.clientIds);
      programViewModel.setFormStartDate(program.startDate);
      programViewModel.setFormEndDate(program.endDate);
      programViewModel.setFormTotalSessions(program.totalSessions);

      mockProgramModel.createProgram.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(program), 100))
      );

      const promise = programViewModel.createProgram();

      expect(programViewModel.isLoading).toBe(true);

      await promise;

      expect(programViewModel.isLoading).toBe(false);
    });
  });
});
