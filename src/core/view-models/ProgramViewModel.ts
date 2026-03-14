import { Program, ProgramStatus, ProgramStats, ProgramRenewal } from '../types';
import { ProgramModel } from '../models/ProgramModel';

export class ProgramViewModel {
  private listeners: (() => void)[] = [];

  // Program Management
  createProgram(programData: Omit<Program, 'id' | 'usedSessions' | 'remainingSessions' | 'status' | 'createdAt' | 'updatedAt'>): { success: boolean; program?: Program; error?: string } {
    try {
      // Validate program rules
      const validation = ProgramModel.validateProgramRules(
        programData.totalSessions,
        programData.minimumSessions,
        programData.frequencyPerWeek
      );

      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Check if client can create program
      const canCreate = ProgramModel.canCreateProgram(programData.clientId, programData.trainerId);
      if (!canCreate.canCreate) {
        return { success: false, error: canCreate.reason || 'Cannot create program' };
      }

      const program = ProgramModel.createProgram(programData);
      this.notifyListeners();
      
      return { success: true, program };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  getPrograms(): Program[] {
    return ProgramModel.getPrograms();
  }

  getProgramById(id: string): Program | null {
    return ProgramModel.getProgramById(id);
  }

  getProgramsByClient(clientId: string): Program[] {
    return ProgramModel.getProgramsByClient(clientId);
  }

  getActiveProgramByClient(clientId: string): Program | null {
    return ProgramModel.getActiveProgramByClient(clientId);
  }

  getProgramsByTrainer(trainerId: string): Program[] {
    return ProgramModel.getProgramsByTrainer(trainerId);
  }

  // Session Management
  consumeSession(programId: string): { success: boolean; error?: string } {
    try {
      const success = ProgramModel.useSession(programId);
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

  addSession(programId: string, additionalSessions: number): { success: boolean; error?: string } {
    try {
      const success = ProgramModel.addSession(programId, additionalSessions);
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
  renewProgram(renewalData: Omit<ProgramRenewal, 'renewedAt'>): { success: boolean; program?: Program; error?: string } {
    try {
      const program = ProgramModel.renewProgram(renewalData);
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
  checkExpiringPrograms(): Program[] {
    return ProgramModel.checkExpiringPrograms();
  }

  expirePrograms(): { success: boolean; expiredPrograms: Program[] } {
    try {
      const expiredPrograms = ProgramModel.expirePrograms();
      this.notifyListeners();
      return { success: true, expiredPrograms };
    } catch (error) {
      console.error('Error expiring programs:', error);
      return { success: false, expiredPrograms: [] };
    }
  }

  suspendProgram(id: string, reason: string): { success: boolean; error?: string } {
    try {
      const program = ProgramModel.suspendProgram(id, reason);
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

  reactivateProgram(id: string): { success: boolean; error?: string } {
    try {
      const program = ProgramModel.reactivateProgram(id);
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
  getProgramStats(trainerId?: string): ProgramStats {
    return ProgramModel.getProgramStats(trainerId);
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
  validateNewProgram(clientId: string, trainerId: string): { canCreate: boolean; reason?: string } {
    return ProgramModel.canCreateProgram(clientId, trainerId);
  }

  validateProgramRules(totalSessions: number, minimumSessions: number, frequencyPerWeek: number): { isValid: boolean; errors: string[] } {
    return ProgramModel.validateProgramRules(totalSessions, minimumSessions, frequencyPerWeek);
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