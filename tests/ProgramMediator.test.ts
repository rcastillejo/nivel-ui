import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ProgramMediator } from '../src/core/mediators/ProgramMediator';
import { ProgramViewModel } from '../src/core/view-models/ProgramViewModel';
import { BookingViewModel } from '../src/core/view-models/BookingViewModel';
import { TrainerViewModel } from '../src/core/view-models/TrainerViewModel';
import { Program } from '../src/core/types';
import { DataService } from '../src/core/repositories';

// Mock data using the correct Program type from index.ts
const mockPrograms: Program[] = [
  {
    id: '1',
    clientId: 'client1',
    clientName: 'John Doe',
    trainerId: 'trainer1',
    trainerName: 'Jane Smith',
    totalSessions: 10,
    usedSessions: 5,
    remainingSessions: 5,
    minimumSessions: 8,
    frequencyPerWeek: 3,
    startDate: '2024-01-01',
    endDate: '2024-03-01',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    clientId: 'client2',
    clientName: 'Jane Smith',
    trainerId: 'trainer1',
    trainerName: 'Jane Smith',
    totalSessions: 12,
    usedSessions: 8,
    remainingSessions: 4,
    minimumSessions: 10,
    frequencyPerWeek: 2,
    startDate: '2024-01-15',
    endDate: '2024-04-15',
    status: 'expired',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  }
];

describe('ProgramMediator', () => {
  let programMediator: ProgramMediator;
  let mockProgramViewModel: any;
  let mockBookingViewModel: any;
  let mockTrainerViewModel: any;
  let mockService: DataService;

  beforeEach(() => {
    // Create mock service
    mockService = {
      getPrograms: vi.fn(),
      getProgramsByClient: vi.fn(),
      getProgramsByTrainer: vi.fn(),
      createProgram: vi.fn(),
      updateProgram: vi.fn(),
      deleteProgram: vi.fn(),
      getBookings: vi.fn(),
      getBookingsByClient: vi.fn(),
      getBookingsByTrainer: vi.fn(),
      createBooking: vi.fn(),
      updateBooking: vi.fn(),
      deleteBooking: vi.fn()
    } as DataService;

    // Create mock ViewModels
    mockProgramViewModel = {
      loadPrograms: vi.fn(),
      getProgramsByClient: vi.fn().mockResolvedValue(mockPrograms),
      getPrograms: vi.fn().mockResolvedValue(mockPrograms),
      getProgramsByTrainer: vi.fn().mockResolvedValue(mockPrograms),
      createProgram: vi.fn(),
      updateProgram: vi.fn(),
      deleteProgram: vi.fn(),
      renewProgram: vi.fn(),
      getProgramById: vi.fn()
    } as any;

    mockBookingViewModel = {
      bookings: [],
      loadClientBookings: vi.fn(),
      setPrograms: vi.fn(),
      createBooking: vi.fn()
    } as any;

    mockTrainerViewModel = {
      clientPrograms: [],
      setClientPrograms: vi.fn(),
      loadTrainerBookings: vi.fn()
    } as any;

    programMediator = new ProgramMediator(
      mockProgramViewModel,
      mockBookingViewModel,
      mockTrainerViewModel
    );
  });

  test('should load programs for booking context', async () => {
    const clientId = 'client1';
    
    await programMediator.loadPrograms('booking', clientId);

    expect(mockProgramViewModel.getProgramsByClient).toHaveBeenCalledWith(clientId);
    expect(mockBookingViewModel.setPrograms).toHaveBeenCalledWith(mockPrograms);
    expect(mockTrainerViewModel.setClientPrograms).not.toHaveBeenCalled();
  });

  test('should load programs for trainer context', async () => {
    const clientId = 'client1';
    
    await programMediator.loadPrograms('trainer', clientId);

    expect(mockProgramViewModel.getProgramsByClient).toHaveBeenCalledWith(clientId);
    expect(mockTrainerViewModel.setClientPrograms).toHaveBeenCalledWith(mockPrograms);
    expect(mockBookingViewModel.setPrograms).not.toHaveBeenCalled();
  });

  test('should load all programs for trainer context without clientId', async () => {
    await programMediator.loadPrograms('trainer');

    expect(mockProgramViewModel.getPrograms).toHaveBeenCalled();
    expect(mockTrainerViewModel.setClientPrograms).toHaveBeenCalledWith(mockPrograms);
    expect(mockBookingViewModel.setPrograms).not.toHaveBeenCalled();
  });

  test('should get active programs for client', async () => {
    const clientId = 'client1';
    
    const result = await programMediator.getActiveProgramsForClient(clientId);

    expect(mockProgramViewModel.getProgramsByClient).toHaveBeenCalledWith(clientId);
    expect(result).toEqual(mockPrograms.filter(p => p.status === 'active'));
  });

  test('should renew client program', async () => {
    const programId = '1';
    const renewalData = {
      newTotalSessions: 24,
      reason: 'Client progress',
      renewedBy: 'trainer' as const
    };

    const mockRenewalResult = { success: true, program: mockPrograms[0] };
    mockProgramViewModel.renewProgram = vi.fn().mockResolvedValue(mockRenewalResult);
    mockProgramViewModel.getProgramById = vi.fn().mockResolvedValue(mockPrograms[0]);
    mockProgramViewModel.getPrograms = vi.fn().mockResolvedValue(mockPrograms);

    const result = await programMediator.renewClientProgram(programId, renewalData);

    expect(mockProgramViewModel.getProgramById).toHaveBeenCalledWith(programId);
    expect(mockProgramViewModel.renewProgram).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.any(String),
      programId,
      previousTotalSessions: mockPrograms[0].totalSessions,
      newTotalSessions: renewalData.newTotalSessions,
      renewalType: 'trainer_decision',
      renewedBy: renewalData.renewedBy,
      reason: renewalData.reason,
      newEndDate: expect.any(Date)
    }));
    expect(result).toBe(true);
  });

  test('should create program and update ViewModels', async () => {
    const programData = {
      clientId: 'client2',
      clientName: 'Jane Doe',
      trainerId: 'trainer1',
      trainerName: 'Jane Smith',
      totalSessions: 12,
      minimumSessions: 8,
      frequencyPerWeek: 3,
      startDate: '2024-02-01',
      endDate: '2024-05-01'
    };

    const newProgram = { ...mockPrograms[0], id: '2', clientId: 'client2' };
    const mockCreateResult = { success: true, program: newProgram };
    mockProgramViewModel.createProgram = vi.fn().mockResolvedValue(mockCreateResult);
    mockProgramViewModel.getProgramsByClient = vi.fn().mockResolvedValue([newProgram]);

    await programMediator.createProgram(programData);

    expect(mockProgramViewModel.createProgram).toHaveBeenCalledWith(programData);
    expect(mockBookingViewModel.setPrograms).toHaveBeenCalled();
    expect(mockTrainerViewModel.setClientPrograms).toHaveBeenCalled();
  });

  test('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to load programs';
    mockProgramViewModel.getProgramsByClient.mockRejectedValue(new Error(errorMessage));

    await expect(programMediator.loadPrograms('booking', 'client1'))
      .rejects.toThrow(errorMessage);
  });

  test('should update program and refresh ViewModels', async () => {
    const programId = '1';
    const updateData = { totalSessions: 20 };

    const updatedProgram = { ...mockPrograms[0], totalSessions: 20 };
    mockProgramViewModel.getProgramById = vi.fn().mockResolvedValue(mockPrograms[0]);
    mockProgramViewModel.getProgramsByClient = vi.fn().mockResolvedValue([updatedProgram]);

    await programMediator.updateProgram(programId, updateData);

    expect(mockProgramViewModel.getProgramById).toHaveBeenCalledWith(programId);
    expect(mockBookingViewModel.setPrograms).toHaveBeenCalled();
    expect(mockTrainerViewModel.setClientPrograms).toHaveBeenCalled();
  });

  test('should delete program and refresh ViewModels', async () => {
    const programId = '1';

    mockProgramViewModel.getProgramById = vi.fn().mockResolvedValue(mockPrograms[0]);
    mockProgramViewModel.getProgramsByClient = vi.fn().mockResolvedValue([]);

    await programMediator.deleteProgram(programId);

    expect(mockProgramViewModel.getProgramById).toHaveBeenCalledWith(programId);
    expect(mockBookingViewModel.setPrograms).toHaveBeenCalled();
    expect(mockTrainerViewModel.setClientPrograms).toHaveBeenCalled();
  });

  test('should handle program not found in update', async () => {
    const programId = 'nonexistent';
    const updateData = { totalSessions: 20 };

    mockProgramViewModel.getProgramById = vi.fn().mockResolvedValue(null);

    const result = await programMediator.updateProgram(programId, updateData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Program not found');
  });

  test('should handle program not found in delete', async () => {
    const programId = 'nonexistent';

    mockProgramViewModel.getProgramById = vi.fn().mockResolvedValue(null);

    const result = await programMediator.deleteProgram(programId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Program not found');
  });
});