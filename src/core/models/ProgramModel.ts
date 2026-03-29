import { Program } from '../types';
import { ProgramNotFoundError, ProgramExpiredError, ActiveProgramAlreadyExistsError } from '../types/errors';
import { IDataService } from '../repositories';

export class ProgramModel {
  constructor(private dataService: IDataService) {}

  async createProgram(data: {
    name: string;
    description: string;
    trainerId: string;
    clientIds: string[];
    startDate: Date;
    endDate: Date;
    totalSessions: number;
  }): Promise<Program> {
    // Validar que no exista un programa activo para ninguno de los clientes
    await this.validateNoActiveProgramExists(data.clientIds);

    // Validaciones básicas
    this.validateProgramData(data);

    const newProgram: Program = {
      id: `program_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      trainerId: data.trainerId,
      clientIds: data.clientIds,
      startDate: data.startDate,
      endDate: data.endDate,
      totalSessions: data.totalSessions,
      usedSessions: 0,
      status: 'active'
    };

    await this.dataService.programs.save(newProgram);
    return newProgram;
  }

  async getActiveProgram(clientId: string): Promise<Program | null> {
    const programs = await this.dataService.programs.getByClient(clientId);
    const activeProgram = programs.find(p => p.status === 'active');
    return activeProgram || null;
  }

  async renewProgram(programId: string, newTotalSessions: number): Promise<Program> {
    // Obtener el programa anterior
    const previousProgram = await this.dataService.programs.getById(programId);
    if (!previousProgram) {
      throw new ProgramNotFoundError(programId);
    }

    if (previousProgram.status === 'expired') {
      throw new ProgramExpiredError(programId);
    }

    // Validar que no exista otro programa activo para los mismos clientes
    // (necesitamos expirar el anterior primero)
    for (const clientId of previousProgram.clientIds) {
      const activeProgram = await this.getActiveProgram(clientId);
      if (activeProgram && activeProgram.id !== programId) {
        throw new ActiveProgramAlreadyExistsError(clientId);
      }
    }

    // Crear el nuevo programa
    const newProgram: Program = {
      id: `program_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: previousProgram.name,
      description: previousProgram.description,
      trainerId: previousProgram.trainerId,
      clientIds: previousProgram.clientIds,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
      totalSessions: newTotalSessions,
      usedSessions: 0,
      status: 'active',
      previousProgramId: programId
    };

    // Guardar el nuevo programa
    await this.dataService.programs.save(newProgram);

    // Expirar el programa anterior
    await this.expireProgram(programId);

    return newProgram;
  }

  async expireProgram(programId: string): Promise<void> {
    const program = await this.dataService.programs.getById(programId);
    if (!program) {
      throw new ProgramNotFoundError(programId);
    }

    const expiredProgram: Program = {
      ...program,
      status: 'expired'
    };

    await this.dataService.programs.save(expiredProgram);
  }

  getPendingSessions(program: Program): number {
    return program.totalSessions - program.usedSessions;
  }

  async updateUsedSessions(programId: string, usedSessions: number): Promise<Program> {
    const program = await this.dataService.programs.getById(programId);
    if (!program) {
      throw new ProgramNotFoundError(programId);
    }

    if (usedSessions > program.totalSessions) {
      throw new Error('Las sesiones usadas no pueden exceder el total');
    }

    const updatedProgram: Program = {
      ...program,
      usedSessions
    };

    await this.dataService.programs.save(updatedProgram);
    return updatedProgram;
  }

  async getProgramsByTrainer(trainerId: string): Promise<Program[]> {
    return this.dataService.programs.getByTrainer(trainerId);
  }

  async getProgramsByClient(clientId: string): Promise<Program[]> {
    return this.dataService.programs.getByClient(clientId);
  }

  private async validateNoActiveProgramExists(clientIds: string[]): Promise<void> {
    for (const clientId of clientIds) {
      const activeProgram = await this.getActiveProgram(clientId);
      if (activeProgram) {
        throw new ActiveProgramAlreadyExistsError(clientId);
      }
    }
  }

  private validateProgramData(data: {
    name: string;
    description: string;
    trainerId: string;
    clientIds: string[];
    startDate: Date;
    endDate: Date;
    totalSessions: number;
  }): void {
    if (!data.name.trim()) {
      throw new Error('El nombre del programa es requerido');
    }

    if (!data.description.trim()) {
      throw new Error('La descripción del programa es requerida');
    }

    if (!data.trainerId.trim()) {
      throw new Error('El entrenador es requerido');
    }

    if (data.clientIds.length === 0) {
      throw new Error('Al menos un cliente es requerido');
    }

    if (data.totalSessions < 1) {
      throw new Error('El programa debe tener al menos 1 sesión');
    }

    if (data.endDate <= data.startDate) {
      throw new Error('La fecha de finalización debe ser posterior a la de inicio');
    }

    if (data.startDate < new Date()) {
      throw new Error('La fecha de inicio no puede ser en el pasado');
    }
  }
}
