import { ClientProgram, ProgramStatus, ProgramRenewal, RenewalType } from '../types/program';

export interface IClientProgramRepository {
  getAll(): Promise<ClientProgram[]>;
  getById(id: string): Promise<ClientProgram | null>;
  getByClientId(clientId: string): Promise<ClientProgram | null>;
  getByTrainerId(trainerId: string): Promise<ClientProgram[]>;
  getActivePrograms(): Promise<ClientProgram[]>;
  getExpiringPrograms(days: number): Promise<ClientProgram[]>;
  getByStatus(status: ProgramStatus): Promise<ClientProgram[]>;
  save(program: ClientProgram): Promise<void>;
  delete(id: string): Promise<void>;
  update(id: string, updates: Partial<ClientProgram>): Promise<ClientProgram>;
}

export interface IRenewalRepository {
  getAll(): Promise<ProgramRenewal[]>;
  getById(id: string): Promise<ProgramRenewal | null>;
  getByProgramId(programId: string): Promise<ProgramRenewal[]>;
  getByClientId(clientId: string): Promise<ProgramRenewal[]>;
  getByType(renewalType: RenewalType): Promise<ProgramRenewal[]>;
  save(renewal: ProgramRenewal): Promise<void>;
  delete(id: string): Promise<void>;
}

// LocalStorage Implementation
export class LocalStorageClientProgramRepository implements IClientProgramRepository {
  private readonly STORAGE_KEY = 'client_programs';

  async getAll(): Promise<ClientProgram[]> {
    if (typeof window === 'undefined') return [];
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      
      const programs = JSON.parse(data);
      return programs.map((program: ClientProgram) => ({
        ...program,
        startDate: new Date(program.startDate),
        endDate: new Date(program.endDate),
        createdAt: new Date(program.createdAt),
        updatedAt: new Date(program.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading client programs:', error);
      return [];
    }
  }

  async getById(id: string): Promise<ClientProgram | null> {
    const programs = await this.getAll();
    return programs.find(program => program.id === id) || null;
  }

  async getByClientId(clientId: string): Promise<ClientProgram | null> {
    const programs = await this.getAll();
    // Return the most recent active program for the client
    const clientPrograms = programs
      .filter(program => program.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return clientPrograms[0] || null;
  }

  async getByTrainerId(trainerId: string): Promise<ClientProgram[]> {
    const programs = await this.getAll();
    return programs
      .filter(program => program.trainerId === trainerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getActivePrograms(): Promise<ClientProgram[]> {
    const programs = await this.getAll();
    return programs.filter(program => program.status === 'active');
  }

  async getExpiringPrograms(days: number): Promise<ClientProgram[]> {
    const programs = await this.getAll();
    const now = new Date();
    const expirationDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
    
    return programs.filter(program => 
      program.status === 'active' && 
      program.endDate <= expirationDate
    );
  }

  async getByStatus(status: ProgramStatus): Promise<ClientProgram[]> {
    const programs = await this.getAll();
    return programs.filter(program => program.status === status);
  }

  async save(program: ClientProgram): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const programs = await this.getAll();
      const existingIndex = programs.findIndex(p => p.id === program.id);
      
      if (existingIndex >= 0) {
        programs[existingIndex] = program;
      } else {
        programs.push(program);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(programs));
    } catch (error) {
      console.error('Error saving client program:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const programs = await this.getAll();
      const filteredPrograms = programs.filter(program => program.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredPrograms));
    } catch (error) {
      console.error('Error deleting client program:', error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<ClientProgram>): Promise<ClientProgram> {
    const programs = await this.getAll();
    const programIndex = programs.findIndex(p => p.id === id);
    
    if (programIndex === -1) {
      throw new Error(`Program with id ${id} not found`);
    }
    
    const updatedProgram = {
      ...programs[programIndex],
      ...updates,
      updatedAt: new Date()
    };
    
    programs[programIndex] = updatedProgram;
    await this.save(updatedProgram);
    
    return updatedProgram;
  }
}

export class LocalStorageRenewalRepository implements IRenewalRepository {
  private readonly STORAGE_KEY = 'program_renewals';

  async getAll(): Promise<ProgramRenewal[]> {
    if (typeof window === 'undefined') return [];
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      
      const renewals = JSON.parse(data);
      return renewals.map((renewal: ProgramRenewal) => ({
        ...renewal,
        renewalDate: new Date(renewal.renewalDate),
        newEndDate: new Date(renewal.newEndDate)
      }));
    } catch (error) {
      console.error('Error loading renewals:', error);
      return [];
    }
  }

  async getById(id: string): Promise<ProgramRenewal | null> {
    const renewals = await this.getAll();
    return renewals.find(renewal => renewal.id === id) || null;
  }

  async getByProgramId(programId: string): Promise<ProgramRenewal[]> {
    const renewals = await this.getAll();
    return renewals
      .filter(renewal => renewal.programId === programId)
      .sort((a, b) => new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime());
  }

  async getByClientId(clientId: string): Promise<ProgramRenewal[]> {
    // First get all programs for the client, then get their renewals
    const programRepo = new LocalStorageClientProgramRepository();
    const clientPrograms = await programRepo.getByClientId(clientId);
    
    if (!clientPrograms) return [];
    
    const clientProgramIds = clientPrograms ? [clientPrograms.id] : [];
    const renewals = await this.getAll();
    
    return renewals
      .filter(renewal => clientProgramIds.includes(renewal.programId))
      .sort((a, b) => new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime());
  }

  async getByType(renewalType: RenewalType): Promise<ProgramRenewal[]> {
    const renewals = await this.getAll();
    return renewals
      .filter(renewal => renewal.renewalType === renewalType)
      .sort((a, b) => new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime());
  }

  async save(renewal: ProgramRenewal): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const renewals = await this.getAll();
      const existingIndex = renewals.findIndex(r => r.id === renewal.id);
      
      if (existingIndex >= 0) {
        renewals[existingIndex] = renewal;
      } else {
        renewals.push(renewal);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(renewals));
    } catch (error) {
      console.error('Error saving renewal:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const renewals = await this.getAll();
      const filteredRenewals = renewals.filter(renewal => renewal.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredRenewals));
    } catch (error) {
      console.error('Error deleting renewal:', error);
      throw error;
    }
  }
}

// Factory function for repository creation
export const createClientProgramRepository = (): IClientProgramRepository => {
  return new LocalStorageClientProgramRepository();
};

export const createRenewalRepository = (): IRenewalRepository => {
  return new LocalStorageRenewalRepository();
};