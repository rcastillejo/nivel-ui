import { Program, ProgramStatus, ProgramRenewal, ProgramStats } from '../types';
import { IDataService } from '../repositories';

export class ProgramModel {
  constructor(private dataService: IDataService) {}

  // Program Management
  async createProgram(programData: Omit<Program, 'id' | 'usedSessions' | 'remainingSessions' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Program> {
    const now = new Date().toISOString();
    const program: Program = {
      ...programData,
      id: this.generateId(),
      usedSessions: 0,
      remainingSessions: programData.totalSessions,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    await this.dataService.programs.save(program);
    return program;
  }

  async getPrograms(): Promise<Program[]> {
    return await this.dataService.programs.getAll();
  }

  async getProgramById(id: string): Promise<Program | null> {
    return await this.dataService.programs.getById(id);
  }

  async getProgramsByClient(clientId: string): Promise<Program[]> {
    const programs = await this.getPrograms();
    return programs.filter(p => p.clientId === clientId).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getActiveProgramByClient(clientId: string): Promise<Program | null> {
    const programs = await this.getProgramsByClient(clientId);
    return programs.find(p => p.status === 'active') || null;
  }

  async getProgramsByTrainer(trainerId: string): Promise<Program[]> {
    const programs = await this.getPrograms();
    return programs.filter(p => p.trainerId === trainerId);
  }

  async updateProgram(id: string, updates: Partial<Program>): Promise<Program | null> {
    const programs = await this.getPrograms();
    const index = programs.findIndex(p => p.id === id);
    
    if (index === -1) return null;

    programs[index] = {
      ...programs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.dataService.programs.save(programs[index]);
    return programs[index];
  }

  async updateProgramStatus(id: string, status: ProgramStatus): Promise<Program | null> {
    return await this.updateProgram(id, { status });
  }

  // Session Management
  async consumeProgramSession(programId: string): Promise<boolean> {
    const program = await this.getProgramById(programId);
    if (!program || program.remainingSessions <= 0) return false;

    const updatedProgram: Program = {
      ...program,
      usedSessions: program.usedSessions + 1,
      remainingSessions: program.remainingSessions - 1,
      updatedAt: new Date().toISOString()
    };

    // Check if program should be marked as completed
    if (updatedProgram.remainingSessions === 0) {
      updatedProgram.status = 'completed';
    }

    return await this.updateProgram(programId, updatedProgram) !== null;
  }

  // Legacy method for backward compatibility
  async useSession(programId: string): Promise<boolean> {
    return await this.consumeProgramSession(programId);
  }

  async addSession(programId: string, additionalSessions: number): Promise<boolean> {
    const program = await this.getProgramById(programId);
    if (!program) return false;

    const updatedProgram = {
      ...program,
      totalSessions: program.totalSessions + additionalSessions,
      remainingSessions: program.remainingSessions + additionalSessions,
      updatedAt: new Date().toISOString()
    };

    return await this.updateProgram(programId, updatedProgram) !== null;
  }

  // Program Renewal
  async renewProgram(renewalData: Omit<ProgramRenewal, 'renewalDate'>): Promise<Program | null> {
    const program = await this.getProgramById(renewalData.programId);
    if (!program) return null;

    // Store renewal record
    const renewal: ProgramRenewal = {
      ...renewalData,
      renewalDate: new Date()
    };
    await this.dataService.renewals.save(renewal);

    // Update program
    const updatedProgram: Program = {
      ...program,
      totalSessions: renewal.newTotalSessions,
      usedSessions: 0,
      remainingSessions: renewal.newTotalSessions,
      endDate: renewal.newEndDate.toISOString(),
      status: 'active' as ProgramStatus,
      renewalDecision: renewal.reason as 'trainer' | 'expiration' | 'session_completion',
      updatedAt: new Date().toISOString()
    };

    return await this.updateProgram(renewalData.programId, updatedProgram);
  }

  // Program Status Management
  async checkExpiringPrograms(): Promise<Program[]> {
    const programs = await this.getPrograms();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return programs.filter(p => 
      p.status === 'active' && 
      new Date(p.endDate) <= tomorrow
    );
  }

  async expirePrograms(): Promise<Program[]> {
    const expiringPrograms = await this.checkExpiringPrograms();
    const expiredPrograms: Program[] = [];

    for (const program of expiringPrograms) {
      const updated = await this.updateProgramStatus(program.id, 'expired');
      if (updated) expiredPrograms.push(updated);
    }

    return expiredPrograms;
  }

  async suspendProgram(id: string, reason: string): Promise<Program | null> {
    return await this.updateProgram(id, { 
      status: 'suspended',
      renewalDecision: reason as 'trainer' | 'expiration' | 'session_completion'
    });
  }

  async reactivateProgram(id: string): Promise<Program | null> {
    return await this.updateProgramStatus(id, 'active');
  }

  // Statistics
  async getProgramStats(trainerId?: string): Promise<ProgramStats> {
    const programs = trainerId 
      ? await this.getProgramsByTrainer(trainerId)
      : await this.getPrograms();

    const activePrograms = programs.filter(p => p.status === 'active');
    const expiredPrograms = programs.filter(p => p.status === 'expired');
    const completedPrograms = programs.filter(p => p.status === 'completed');

    // Calculate sessions this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // This would typically integrate with booking data
    const totalSessionsThisWeek = 0; // TODO: Integrate with booking model

    // Clients needing renewal (programs with low remaining sessions or expiring soon)
    const clientsNeedingRenewal = activePrograms.filter(p => 
      p.remainingSessions <= 3 || 
      new Date(p.endDate).getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000 // Next 7 days
    ).length;

    return {
      totalPrograms: programs.length,
      activePrograms: activePrograms.length,
      expiredPrograms: expiredPrograms.length,
      completedPrograms: completedPrograms.length,
      totalSessionsThisWeek,
      clientsNeedingRenewal
    };
  }

  // Validation
  async canCreateProgram(clientId: string, trainerId: string): Promise<{ canCreate: boolean; reason?: string }> {
    const activeProgram = await this.getActiveProgramByClient(clientId);
    
    if (activeProgram) {
      return { canCreate: false, reason: 'Client already has an active program' };
    }

    return { canCreate: true };
  }

  validateProgramRules(totalSessions: number, minimumSessions: number, frequencyPerWeek: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (totalSessions < minimumSessions) {
      errors.push(`Total sessions (${totalSessions}) cannot be less than minimum sessions (${minimumSessions})`);
    }

    if (minimumSessions < 3) {
      errors.push('Minimum sessions must be at least 3 for results');
    }

    if (frequencyPerWeek < 1 || frequencyPerWeek > 7) {
      errors.push('Frequency per week must be between 1 and 7');
    }

    if (frequencyPerWeek < 3) {
      errors.push('Minimum frequency should be 3 times per week for optimal results');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Private Methods
  private generateId(): string {
    return `program_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}