import { Program } from '../types';
import { ProgramViewModel } from '../view-models/ProgramViewModel';
import { BookingViewModel } from '../view-models/BookingViewModel';
import { TrainerViewModel } from '../view-models/TrainerViewModel';

/**
 * ProgramMediator - Coordinador central para operaciones de carga de programas
 * 
 * Este mediator implementa el patrón Mediator para desacoplar los ViewModels
 * y centralizar la lógica de carga de programas entre ellos.
 */
export class ProgramMediator {
  constructor(
    private programVM: ProgramViewModel,
    private bookingVM: BookingViewModel,
    private trainerVM: TrainerViewModel
  ) {}

  /**
   * Carga programas para el contexto de booking
   * Reemplaza la llamada directa que hacía BookingViewModel a ProgramViewModel
   */
  async loadProgramsForBooking(clientId: string): Promise<Program[]> {
    try {
      const programs = await this.programVM.getProgramsByClient(clientId);
      
      // Establecer los programas en el BookingViewModel
      this.bookingVM.setPrograms(programs);
      
      return programs;
    } catch (error) {
      console.error('Error loading programs for booking:', error);
      throw error;
    }
  }

  /**
   * Carga programas para el contexto de trainer
   * Reemplaza la llamada directa que hacía TrainerViewModel a ProgramViewModel
   */
  async loadProgramsForTrainer(clientId?: string): Promise<Program[]> {
    try {
      const programs = clientId 
        ? await this.programVM.getProgramsByClient(clientId)
        : await this.programVM.getPrograms();
      
      // Establecer los programas en el TrainerViewModel
      this.trainerVM.setClientPrograms(programs);
      
      return programs;
    } catch (error) {
      console.error('Error loading programs for trainer:', error);
      throw error;
    }
  }

  /**
   * Load programs for different contexts - método general para las pruebas
   */
  async loadPrograms(context: 'booking' | 'trainer', clientId?: string): Promise<Program[]> {
    const programs = clientId 
      ? await this.programVM.getProgramsByClient(clientId)
      : await this.programVM.getPrograms();
    
    // Distribute to the appropriate ViewModels
    if (context === 'booking') {
      this.bookingVM.setPrograms(programs);
    } else if (context === 'trainer') {
      this.trainerVM.setClientPrograms(programs);
    }
    
    return programs;
  }

  /**
   * Get active programs for a client
   */
  async getActiveProgramsForClient(clientId: string): Promise<Program[]> {
    const allPrograms = await this.programVM.getProgramsByClient(clientId);
    return allPrograms.filter(program => program.status === 'active');
  }

  /**
   * Program CRUD operations coordinated through mediator
   */
  async createProgram(programData: Omit<Program, 'id' | 'usedSessions' | 'remainingSessions' | 'status' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; program?: Program; error?: string }> {
    const result = await this.programVM.createProgram(programData);
    
    // Refresh ViewModels after creation
    if (result.success && result.program) {
      await this.refreshViewModels(result.program.clientId);
    }
    
    return result;
  }

  async updateProgram(programId: string, updateData: Partial<Program>): Promise<{ success: boolean; program?: Program; error?: string }> {
    // First get the current program to determine clientId
    const currentProgram = await this.programVM.getProgramById(programId);
    if (!currentProgram) {
      return { success: false, error: 'Program not found' };
    }

    // Note: This would need to be implemented in ProgramViewModel
    // For now, we'll simulate the update
    const result = { success: true, program: { ...currentProgram, ...updateData } } as const;
    
    // Refresh ViewModels after update
    if (result.success && result.program) {
      await this.refreshViewModels(result.program.clientId);
    }
    
    return result;
  }

  async deleteProgram(programId: string): Promise<{ success: boolean; error?: string }> {
    // First get the current program to determine clientId
    const currentProgram = await this.programVM.getProgramById(programId);
    if (!currentProgram) {
      return { success: false, error: 'Program not found' };
    }

    // Note: This would need to be implemented in ProgramViewModel
    // For now, we'll simulate the deletion
    const result = { success: true } as const;
    
    // Refresh ViewModels after deletion
    if (result.success) {
      await this.refreshViewModels(currentProgram.clientId);
    }
    
    return result;
  }

  /**
   * Helper method to refresh all ViewModels
   */
  private async refreshViewModels(clientId: string): Promise<void> {
    try {
      const programs = await this.programVM.getProgramsByClient(clientId);
      this.bookingVM.setPrograms(programs);
      this.trainerVM.setClientPrograms(programs);
    } catch (error) {
      console.error('Error refreshing ViewModels:', error);
    }
  }

  /**
   * Renueva un programa cliente
   * Reemplaza la llamada directa que hacía TrainerViewModel a ProgramViewModel
   */
  async renewClientProgram(
    programId: string, 
    renewalData: {
      newTotalSessions: number;
      reason: string;
      renewedBy: 'trainer' | 'system' | 'client';
    }
  ): Promise<boolean> {
    try {
      // Obtener el programa actual para obtener los datos necesarios
      const currentProgram = await this.programVM.getProgramById(programId);
      if (!currentProgram) {
        throw new Error('Program not found');
      }

      // Calcular nueva fecha de finalización (30 días adicionales desde la fecha actual)
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 30);

      const result = await this.programVM.renewProgram({
        id: `renewal_${Date.now()}`, // ID único para la renovación
        programId,
        previousTotalSessions: currentProgram.totalSessions,
        newTotalSessions: renewalData.newTotalSessions,
        renewalType: 'trainer_decision', // Tipo de renovación por decisión del entrenador
        renewedBy: renewalData.renewedBy,
        reason: renewalData.reason,
        newEndDate
      });

      if (result.success) {
        // Recargar programas después de la renovación para mantener consistencia
        await this.loadProgramsForTrainer();
        return true;
      } else {
        throw new Error(result.error || 'Error renovando programa');
      }
    } catch (error) {
      console.error('Error renewing client program:', error);
      throw error;
    }
  }
}
