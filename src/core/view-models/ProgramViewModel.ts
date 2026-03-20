import { Program, ProgramStatus, ProgramStats, ProgramRenewal } from '../types';
import { IDataService } from '../repositories';
import { ProgramModel } from '../models/ProgramModel';

export class ProgramViewModel {
  private model: ProgramModel;
  private listeners: (() => void)[] = [];

  constructor(dataService: IDataService) {
    this.model = new ProgramModel(dataService);
  }

  // Program Management
  async createProgram(programData: Omit<Program, 'id' | 'usedSessions' | 'remainingSessions' | 'status' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; program?: Program; error?: string }> {
    try {
      // Validate program rules
      const validation = this.model.validateProgramRules(
        programData.totalSessions,
        programData.minimumSessions,
        programData.frequencyPerWeek
      );

      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Check if client can create program
      const canCreate = await this.model.canCreateProgram(programData.clientId, programData.trainerId);
      if (!canCreate.canCreate) {
        return { success: false, error: canCreate.reason || 'Cannot create program' };
      }

      const program = await this.model.createProgram(programData);
      this.notifyListeners();
      
      return { success: true, program };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getPrograms(): Promise<Program[]> {
    return await this.model.getPrograms();
  }

  async getProgramById(id: string): Promise<Program | null> {
    return await this.model.getProgramById(id);
  }

  async getProgramsByClient(clientId: string): Promise<Program[]> {
    return await this.model.getProgramsByClient(clientId);
  }

  async getActiveProgramByClient(clientId: string): Promise<Program | null> {
    return await this.model.getActiveProgramByClient(clientId);
  }

  async getProgramsByTrainer(trainerId: string): Promise<Program[]> {
    return await this.model.getProgramsByTrainer(trainerId);
  }

  // Session Management
  async consumeSession(programId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const success = await this.model.consumeProgramSession(programId);
      if (success) {
        this.notifyListeners();
        return { success: true };
      } else {
        return { success: false, error: 'No sessions available or program not found' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async addSession(programId: string, additionalSessions: number): Promise<{ success: boolean; error?: string }> {
    try {
      const success = await this.model.addSession(programId, additionalSessions);
      if (success) {
        this.notifyListeners();
        return { success: true };
      } else {
        return { success: false, error: 'Program not found' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Program Renewal
  async renewProgram(renewalData: Omit<ProgramRenewal, 'renewalDate'>): Promise<{ success: boolean; program?: Program; error?: string }> {
    try {
      const program = await this.model.renewProgram(renewalData);
      if (program) {
        this.notifyListeners();
        return { success: true, program };
      } else {
        return { success: false, error: 'Program not found' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Program Status Management
  async checkExpiringPrograms(): Promise<Program[]> {
    return await this.model.checkExpiringPrograms();
  }

  async expirePrograms(): Promise<{ success: boolean; expiredPrograms: Program[] }> {
    try {
      const expiredPrograms = await this.model.expirePrograms();
      this.notifyListeners();
      return { success: true, expiredPrograms };
    } catch (error) {
      console.error('Error expiring programs:', error);
      return { success: false, expiredPrograms: [] };
    }
  }

  async suspendProgram(id: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const program = await this.model.suspendProgram(id, reason);
      if (program) {
        this.notifyListeners();
        return { success: true };
      } else {
        return { success: false, error: 'Program not found' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async reactivateProgram(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const program = await this.model.reactivateProgram(id);
      if (program) {
        this.notifyListeners();
        return { success: true };
      } else {
        return { success: false, error: 'Program not found' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Statistics
  async getProgramStats(trainerId?: string): Promise<ProgramStats> {
    return await this.model.getProgramStats(trainerId);
  }

  // UI Helper Methods
  getProgramStatusText(status: ProgramStatus): string {
    const statusMap = {
      active: 'Activo',
      expired: 'Expirado',
      completed: 'Completado',
      suspended: 'Suspendido',
      renewed: 'Renovado'
    };
    return statusMap[status] || status;
  }

  getProgramStatusColor(status: ProgramStatus): string {
    const colorMap = {
      active: '#22c55e', // green
      expired: '#ef4444', // red
      completed: '#3b82f6', // blue
      suspended: '#f59e0b', // amber
      renewed: '#8b5cf6' // violet
    };
    return colorMap[status] || '#6b7280';
  }

  isProgramExpiringSoon(program: Program, daysThreshold: number = 7): boolean {
    if (program.status !== 'active') return false;
    
    const daysUntilExpiry = Math.ceil(
      (new Date(program.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    return daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0;
  }

  isProgramLowOnSessions(program: Program, threshold: number = 3): boolean {
    if (program.status !== 'active') return false;
    return program.remainingSessions <= threshold;
  }

  needsRenewalAttention(program: Program): boolean {
    return this.isProgramExpiringSoon(program) || this.isProgramLowOnSessions(program);
  }

  // Calculate program progress percentage
  getProgramProgress(program: Program): number {
    if (program.totalSessions === 0) return 0;
    return Math.round((program.usedSessions / program.totalSessions) * 100);
  }

  // Format remaining sessions display
  formatRemainingSessions(program: Program): string {
    return `${program.remainingSessions}/${program.totalSessions} sesiones`;
  }

  // Calculate program duration in weeks
  getProgramDurationInWeeks(program: Program): number {
    const start = new Date(program.startDate);
    const end = new Date(program.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  // Get next recommended session date based on frequency
  getNextRecommendedSessionDate(program: Program): Date | null {
    if (program.status !== 'active' || program.remainingSessions === 0) return null;

    // This would typically integrate with the booking system
    // For now, return tomorrow as a placeholder
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // Validation
  async validateNewProgram(clientId: string, trainerId: string): Promise<{ canCreate: boolean; reason?: string }> {
    return await this.model.canCreateProgram(clientId, trainerId);
  }

  validateProgramRules(totalSessions: number, minimumSessions: number, frequencyPerWeek: number): { isValid: boolean; errors: string[] } {
    return this.model.validateProgramRules(totalSessions, minimumSessions, frequencyPerWeek);
  }

  // Lifecycle Methods
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Cleanup
  dispose(): void {
    this.listeners = [];
  }
}