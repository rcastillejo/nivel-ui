// Types and interfaces for Client Program functionality

import { ZoneType } from './index';

// ===== CLIENT PROGRAM TYPES =====

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  currentProgram?: ClientProgram;
  programHistory: ClientProgram[];
  isActive: boolean;
  createdAt: Date;
}

export interface ClientProgram {
  id: string;
  clientId: string;
  trainerId: string;
  programType: 'basic' | 'premium' | 'custom';
  totalSessions: number;           // Total de sesiones contratadas
  usedSessions: number;            // Sesiones ya utilizadas
  remainingSessions: number;       // Sesiones restantes (calculado)
  startDate: Date;                 // Fecha de inicio del programa
  endDate: Date;                   // Fecha de fin del programa
  status: ProgramStatus;
  frequencyPerWeek: number;        // Frecuencia recomendada (default: 3)
  minimumSessionsForResult: number; // Mínimo para ver resultados
  renewalHistory: ProgramRenewal[]; // Historial de renovaciones
  createdAt: Date;
  updatedAt: Date;
}

export type ProgramStatus = 
  | 'active'        // Activo y vigente
  | 'expired'       // Expirado por fecha
  | 'completed'     // Completado por sesiones
  | 'suspended'     // Suspendido temporalmente
  | 'cancelled';    // Cancelado

export interface ProgramRenewal {
  id: string;
  programId: string;
  previousTotalSessions: number;
  newTotalSessions: number;
  renewalType: RenewalType;
  renewalDate: Date;
  renewedBy: 'trainer' | 'system' | 'client';
  reason?: string;
  newEndDate: Date;
}

export type RenewalType = 
  | 'expiration'     // Por expiración de fecha
  | 'sessions_depleted' // Por agotamiento de sesiones
  | 'trainer_decision'  // Por decisión del entrenador
  | 'client_request'    // Por solicitud del cliente
  | 'system_auto';      // Automática del sistema

export interface ProgramConfiguration {
  id: string;
  name: string;
  description: string;
  defaultSessions: number;
  minimumSessions: number;
  maximumSessions: number;
  recommendedFrequency: number;
  durationWeeks: number;
  price: number;
  isActive: boolean;
}

export const PROGRAM_CONFIGURATIONS: ProgramConfiguration[] = [
  {
    id: 'basic',
    name: 'Programa Básico',
    description: '12 sesiones de entrenamiento',
    defaultSessions: 12,
    minimumSessions: 8,
    maximumSessions: 16,
    recommendedFrequency: 3,
    durationWeeks: 4,
    price: 0,
    isActive: true
  },
  {
    id: 'premium',
    name: 'Programa Premium',
    description: '24 sesiones de entrenamiento',
    defaultSessions: 24,
    minimumSessions: 16,
    maximumSessions: 32,
    recommendedFrequency: 3,
    durationWeeks: 8,
    price: 0,
    isActive: true
  },
  {
    id: 'custom',
    name: 'Programa Personalizado',
    description: 'Programa adaptado a necesidades específicas',
    defaultSessions: 36,
    minimumSessions: 12,
    maximumSessions: 48,
    recommendedFrequency: 3,
    durationWeeks: 12,
    price: 0,
    isActive: true
  }
];

export interface RenewalRecommendation {
  type: RenewalType;
  priority: 'low' | 'medium' | 'high';
  message: string;
  suggestedAction: 'renew' | 'monitor' | 'contact';
}

export interface RenewalAnalysis {
  programId: string;
  recommendations: RenewalRecommendation[];
  nextAction: 'review' | 'continue' | 'urgent';
}

// Extended Booking interface for program integration
export interface BookingWithProgram {
  id: string;
  clientName: string;
  trainerId: string;
  trainerName: string;
  date: Date;
  time: string;
  duration: number; // minutos
  zone: ZoneType;
  status: 'confirmed' | 'cancelled' | 'pending';
  programId?: string;           // Referencia al programa del cliente
  sessionDeducted: boolean;     // Si la sesión fue descontada
}

// UI Props for Program Components
export interface ClientProgramCardProps {
  program: ClientProgram;
  onViewDetails?: () => void;
  compact?: boolean;
}

export interface SessionCounterProps {
  remainingSessions: number;
  totalSessions: number;
  status: ProgramStatus;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export interface ProgramStatusProps {
  status: ProgramStatus;
  expirationDate?: Date;
  daysUntilExpiration?: number;
  onRenew?: () => void;
  showActions?: boolean;
}

export interface ClientProgramListProps {
  trainerId: string;
  onSelectClient?: (clientId: string) => void;
  filterStatus?: ProgramStatus;
  showExpired?: boolean;
}

export interface ProgramSummaryProps {
  clientId: string;
  program: ClientProgram;
  onRenew?: () => void;
  onSuspend?: () => void;
  onViewHistory?: () => void;
  showActions?: boolean;
}

export interface RenewalModalProps {
  program: ClientProgram;
  isOpen: boolean;
  onClose: () => void;
  onRenew: (renewalData: { newSessions: number; renewalType: RenewalType; reason?: string }) => void;
  isLoading?: boolean;
}

export interface ProgramAnalyticsProps {
  trainerId: string;
  dateRange?: { start: Date; end: Date };
  showMetrics?: boolean;
  showCharts?: boolean;
}

// Form interfaces
export interface CreateProgramData {
  clientId: string;
  trainerId: string;
  programType: 'basic' | 'premium' | 'custom';
  totalSessions: number;
  startDate: Date;
  endDate: Date;
  frequencyPerWeek: number;
  minimumSessionsForResult: number;
}

export interface RenewalData {
  newTotalSessions: number;
  renewalType: RenewalType;
  reason?: string;
}