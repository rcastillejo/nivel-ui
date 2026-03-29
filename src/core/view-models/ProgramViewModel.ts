import { makeAutoObservable, runInAction } from 'mobx';
import { ProgramModel } from '../models/ProgramModel';
import { Program } from '../types';
import {
  ProgramNotFoundError,
  ProgramExpiredError,
  ActiveProgramAlreadyExistsError,
  ProgramValidationError,
  InvalidSessionCountError
} from '../types/errors';

export class ProgramViewModel {
  // Estado observable
  programs: Program[] = [];
  activeProgram: Program | null = null;
  isLoading = false;
  error: string | null = null;

  // Estado del formulario
  formData: {
    name: string;
    description: string;
    trainerId: string;
    clientIds: string[];
    startDate: Date | null;
    endDate: Date | null;
    totalSessions: number;
  } = {
    name: '',
    description: '',
    trainerId: '',
    clientIds: [],
    startDate: null,
    endDate: null,
    totalSessions: 0
  };

  // Estado de modales
  showSuccessModal = false;
  createdProgram: Program | null = null;

  constructor(private model: ProgramModel) {
    makeAutoObservable(this);
  }

  // Acciones
  async loadPrograms(trainerId: string) {
    this.setLoading(true);
    try {
      const programs = await this.model.getProgramsByTrainer(trainerId);
      runInAction(() => {
        this.programs = programs;
        this.error = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error cargando programas';
      });
    } finally {
      this.setLoading(false);
    }
  }

  async loadProgramsByClient(clientId: string) {
    this.setLoading(true);
    try {
      const programs = await this.model.getProgramsByClient(clientId);
      runInAction(() => {
        this.programs = programs;
        const active = programs.find(p => p.status === 'active');
        this.activeProgram = active || null;
        this.error = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error cargando programas del cliente';
      });
    } finally {
      this.setLoading(false);
    }
  }

  async loadActiveProgram(clientId: string) {
    this.setLoading(true);
    try {
      const program = await this.model.getActiveProgram(clientId);
      runInAction(() => {
        this.activeProgram = program;
        this.error = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error cargando programa activo';
      });
    } finally {
      this.setLoading(false);
    }
  }

  async createProgram(): Promise<boolean> {
    this.setLoading(true);
    try {
      const programData = {
        name: this.formData.name,
        description: this.formData.description,
        trainerId: this.formData.trainerId,
        clientIds: this.formData.clientIds,
        startDate: this.formData.startDate!,
        endDate: this.formData.endDate!,
        totalSessions: this.formData.totalSessions
      };

      const createdProgram = await this.model.createProgram(programData);

      runInAction(() => {
        this.error = null;
        this.programs.push(createdProgram);
        this.openSuccessModal(createdProgram);
        this.resetForm();
      });

      return true;
    } catch (err) {
      runInAction(() => {
        if (err instanceof ActiveProgramAlreadyExistsError) {
          this.error = err.message;
        } else if (err instanceof ProgramValidationError) {
          this.error = err.message;
        } else if (err instanceof InvalidSessionCountError) {
          this.error = err.message;
        } else {
          this.error = err instanceof Error ? err.message : 'Error creando programa';
        }
      });
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async renewProgram(programId: string, newTotalSessions: number): Promise<boolean> {
    this.setLoading(true);
    try {
      const renewedProgram = await this.model.renewProgram(programId, newTotalSessions);

      runInAction(() => {
        this.error = null;
        // Actualizar el programa en la lista
        const index = this.programs.findIndex(p => p.id === programId);
        if (index !== -1) {
          this.programs[index].status = 'expired';
        }
        this.programs.push(renewedProgram);
        this.openSuccessModal(renewedProgram);
      });

      return true;
    } catch (err) {
      runInAction(() => {
        if (err instanceof ProgramNotFoundError) {
          this.error = err.message;
        } else if (err instanceof ProgramExpiredError) {
          this.error = err.message;
        } else if (err instanceof ActiveProgramAlreadyExistsError) {
          this.error = err.message;
        } else {
          this.error = err instanceof Error ? err.message : 'Error renovando programa';
        }
      });
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async expireProgram(programId: string): Promise<boolean> {
    this.setLoading(true);
    try {
      await this.model.expireProgram(programId);

      runInAction(() => {
        this.error = null;
        const index = this.programs.findIndex(p => p.id === programId);
        if (index !== -1) {
          this.programs[index].status = 'expired';
        }
        if (this.activeProgram?.id === programId) {
          this.activeProgram = null;
        }
      });

      return true;
    } catch (err) {
      runInAction(() => {
        if (err instanceof ProgramNotFoundError) {
          this.error = err.message;
        } else {
          this.error = err instanceof Error ? err.message : 'Error expirando programa';
        }
      });
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async updateUsedSessions(programId: string, usedSessions: number): Promise<boolean> {
    this.setLoading(true);
    try {
      const updatedProgram = await this.model.updateUsedSessions(programId, usedSessions);

      runInAction(() => {
        this.error = null;
        const index = this.programs.findIndex(p => p.id === programId);
        if (index !== -1) {
          this.programs[index] = updatedProgram;
        }
        if (this.activeProgram?.id === programId) {
          this.activeProgram = updatedProgram;
        }
      });

      return true;
    } catch (err) {
      runInAction(() => {
        if (err instanceof ProgramNotFoundError) {
          this.error = err.message;
        } else if (err instanceof InvalidSessionCountError) {
          this.error = err.message;
        } else {
          this.error = err instanceof Error ? err.message : 'Error actualizando sesiones';
        }
      });
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  // Métodos para actualizar el formulario
  setFormData<K extends keyof typeof this.formData>(field: K, value: typeof this.formData[K]): void {
    this.formData[field] = value;
  }

  setFormName(name: string) {
    this.formData.name = name;
  }

  setFormDescription(description: string) {
    this.formData.description = description;
  }

  setFormTrainerId(trainerId: string) {
    this.formData.trainerId = trainerId;
  }

  setFormClientIds(clientIds: string[]) {
    this.formData.clientIds = clientIds;
  }

  setFormStartDate(date: Date) {
    this.formData.startDate = date;
  }

  setFormEndDate(date: Date) {
    this.formData.endDate = date;
  }

  setFormTotalSessions(sessions: number) {
    this.formData.totalSessions = sessions;
  }

  openSuccessModal(program: Program) {
    this.createdProgram = program;
    this.showSuccessModal = true;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.createdProgram = null;
  }

  resetForm() {
    this.formData = {
      name: '',
      description: '',
      trainerId: '',
      clientIds: [],
      startDate: null,
      endDate: null,
      totalSessions: 0
    };
  }

  clearError() {
    this.error = null;
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  private setError(error: string) {
    this.error = error;
  }

  // Computed values
  get canCreateProgram(): boolean {
    return !!(
      this.formData.name.trim() &&
      this.formData.description.trim() &&
      this.formData.trainerId.trim() &&
      this.formData.clientIds.length > 0 &&
      this.formData.startDate &&
      this.formData.endDate &&
      this.formData.totalSessions > 0 &&
      this.formData.endDate > this.formData.startDate
    );
  }

  get activeProgramPendingSessions(): number | null {
    if (!this.activeProgram) return null;
    return this.activeProgram.totalSessions - this.activeProgram.usedSessions;
  }

  get activeProgramProgress(): number | null {
    if (!this.activeProgram) return null;
    return (this.activeProgram.usedSessions / this.activeProgram.totalSessions) * 100;
  }

  get hasActiveProgram(): boolean {
    return this.activeProgram !== null && this.activeProgram.status === 'active';
  }
}
