import { Program, ProgramStatus, ProgramRenewal, ProgramStats } from '../types';

export class ProgramModel {
  private static readonly STORAGE_KEY = 'nivel_programs';
  private static readonly RENEWALS_KEY = 'nivel_program_renewals';

  // Program Management
  static createProgram(programData: Omit<Program, 'id' | 'usedSessions' | 'remainingSessions' | 'status' | 'createdAt' | 'updatedAt'>): Program {
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

    const programs = this.getPrograms();
    programs.push(program);
    this.savePrograms(programs);

    return program;
  }

  static getPrograms(): Program[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : this.getDefaultPrograms();
    } catch (error) {
      console.error('Error loading programs:', error);
      return this.getDefaultPrograms();
    }
  }

  static getProgramById(id: string): Program | null {
    const programs = this.getPrograms();
    return programs.find(p => p.id === id) || null;
  }

  static getProgramsByClient(clientId: string): Program[] {
    const programs = this.getPrograms();
    return programs.filter(p => p.clientId === clientId).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static getActiveProgramByClient(clientId: string): Program | null {
    const programs = this.getProgramsByClient(clientId);
    return programs.find(p => p.status === 'active') || null;
  }

  static getProgramsByTrainer(trainerId: string): Program[] {
    const programs = this.getPrograms();
    return programs.filter(p => p.trainerId === trainerId);
  }

  static updateProgram(id: string, updates: Partial<Program>): Program | null {
    const programs = this.getPrograms();
    const index = programs.findIndex(p => p.id === id);
    
    if (index === -1) return null;

    programs[index] = {
      ...programs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.savePrograms(programs);
    return programs[index];
  }

  static updateProgramStatus(id: string, status: ProgramStatus): Program | null {
    return this.updateProgram(id, { status });
  }

  // Session Management
  static consumeProgramSession(programId: string): boolean {
    const program = this.getProgramById(programId);
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

    return this.updateProgram(programId, updatedProgram) !== null;
  }

  // Legacy method for backward compatibility
  static useSession(programId: string): boolean {
    return this.consumeProgramSession(programId);
  }

  static addSession(programId: string, additionalSessions: number): boolean {
    const program = this.getProgramById(programId);
    if (!program) return false;

    const updatedProgram = {
      ...program,
      totalSessions: program.totalSessions + additionalSessions,
      remainingSessions: program.remainingSessions + additionalSessions,
      updatedAt: new Date().toISOString()
    };

    return this.updateProgram(programId, updatedProgram) !== null;
  }

  // Program Renewal
  static renewProgram(renewalData: Omit<ProgramRenewal, 'renewedAt'>): Program | null {
    const program = this.getProgramById(renewalData.programId);
    if (!program) return null;

    // Store renewal record
    const renewal: ProgramRenewal = {
      ...renewalData,
      renewedAt: new Date().toISOString()
    };
    this.saveRenewal(renewal);

    // Update program
    const updatedProgram: Program = {
      ...program,
      totalSessions: renewal.newTotalSessions,
      usedSessions: 0,
      remainingSessions: renewal.newTotalSessions,
      endDate: renewal.newEndDate,
      status: 'active' as ProgramStatus,
      renewalDecision: renewal.reason as 'trainer' | 'expiration' | 'session_completion',
      updatedAt: new Date().toISOString()
    };

    return this.updateProgram(renewalData.programId, updatedProgram);
  }

  // Program Status Management
  static checkExpiringPrograms(): Program[] {
    const programs = this.getPrograms();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return programs.filter(p => 
      p.status === 'active' && 
      new Date(p.endDate) <= tomorrow
    );
  }

  static expirePrograms(): Program[] {
    const expiringPrograms = this.checkExpiringPrograms();
    const expiredPrograms: Program[] = [];

    expiringPrograms.forEach(program => {
      const updated = this.updateProgramStatus(program.id, 'expired');
      if (updated) expiredPrograms.push(updated);
    });

    return expiredPrograms;
  }

  static suspendProgram(id: string, reason: string): Program | null {
    return this.updateProgram(id, { 
      status: 'suspended',
      renewalDecision: reason as 'trainer' | 'expiration' | 'session_completion'
    });
  }

  static reactivateProgram(id: string): Program | null {
    return this.updateProgramStatus(id, 'active');
  }

  // Statistics
  static getProgramStats(trainerId?: string): ProgramStats {
    const programs = trainerId 
      ? this.getProgramsByTrainer(trainerId)
      : this.getPrograms();

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
  static canCreateProgram(clientId: string, trainerId: string): { canCreate: boolean; reason?: string } {
    const activeProgram = this.getActiveProgramByClient(clientId);
    
    if (activeProgram) {
      return { canCreate: false, reason: 'Client already has an active program' };
    }

    return { canCreate: true };
  }

  static validateProgramRules(totalSessions: number, minimumSessions: number, frequencyPerWeek: number): { isValid: boolean; errors: string[] } {
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
  private static savePrograms(programs: Program[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(programs));
  }

  private static saveRenewal(renewal: ProgramRenewal): void {
    try {
      const renewals = this.getRenewals();
      renewals.push(renewal);
      localStorage.setItem(this.RENEWALS_KEY, JSON.stringify(renewals));
    } catch (error) {
      console.error('Error saving renewal:', error);
    }
  }

  private static getRenewals(): ProgramRenewal[] {
    try {
      const data = localStorage.getItem(this.RENEWALS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading renewals:', error);
      return [];
    }
  }

  private static generateId(): string {
    return `program_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getDefaultPrograms(): Program[] {
    // Programas de ejemplo para demostración
    return [
      {
        id: 'program_001',
        clientId: 'client_001',
        clientName: 'Juan Pérez',
        trainerId: 'trainer_001',
        trainerName: 'Diego Lamas',
        totalSessions: 12,
        usedSessions: 8,
        remainingSessions: 4,
        minimumSessions: 12,
        frequencyPerWeek: 3,
        startDate: '2024-01-15',
        endDate: '2024-02-15',
        status: 'active',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-02-01T15:30:00Z',
        renewalDecision: 'session_completion'
      },
      {
        id: 'program_002',
        clientId: 'client_001',
        clientName: 'Juan Pérez',
        trainerId: 'trainer_001',
        trainerName: 'Diego Lamas',
        totalSessions: 12,
        usedSessions: 12,
        remainingSessions: 0,
        minimumSessions: 12,
        frequencyPerWeek: 3,
        startDate: '2023-12-01',
        endDate: '2024-01-01',
        status: 'renewed',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        renewalDecision: 'session_completion'
      },
      {
        id: 'program_003',
        clientId: 'client_002',
        clientName: 'María García',
        trainerId: 'trainer_001',
        trainerName: 'Diego Lamas',
        totalSessions: 24,
        usedSessions: 18,
        remainingSessions: 6,
        minimumSessions: 12,
        frequencyPerWeek: 3,
        startDate: '2024-01-01',
        endDate: '2024-03-01',
        status: 'active',
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-02-10T16:45:00Z'
      },
      {
        id: 'program_004',
        clientId: 'client_003',
        clientName: 'Carlos López',
        trainerId: 'trainer_001',
        trainerName: 'Diego Lamas',
        totalSessions: 12,
        usedSessions: 12,
        remainingSessions: 0,
        minimumSessions: 12,
        frequencyPerWeek: 3,
        startDate: '2023-11-01',
        endDate: '2023-12-01',
        status: 'expired',
        createdAt: '2023-11-01T11:00:00Z',
        updatedAt: '2023-12-01T18:00:00Z',
        renewalDecision: 'expiration'
      }
    ];
  }
}