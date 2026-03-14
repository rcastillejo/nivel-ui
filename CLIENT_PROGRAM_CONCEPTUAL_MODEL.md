# Modelo Conceptual - Programa de Clientes

## Introducción

Este documento define el modelo conceptual para la gestión de programas de entrenamiento para clientes en el sistema Nivel Gym. El modelo se integra con la arquitectura MVVM existente y extiende las capacidades actuales del sistema de reservas.

## Requisitos Analizados

1. **El cliente debe conocer el Nro de clases pendientes de un programa**
2. **El Entrenador debe conocer cuántas clases le quedan al cliente**
3. **Cantidad mínima para tener un resultado**
4. **Frecuencia recomendada: 3 veces por semana**
5. **Número de sesiones por programa para un cliente**
6. **Un programa vigente por cliente**
7. **Proceso de renovación con nuevo número de sesiones**
8. **Gestión de renovación basada en:**
   - Expiración del programa
   - Agotamiento de sesiones
   - Decisión del entrenador
   - Recuperación posterior a expiración

## Modelo Conceptual Propuesto

### 1. Entidades Principales

#### 1.1. ClientProgram (Programa de Cliente)
```typescript
interface ClientProgram {
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
```

#### 1.2. ProgramStatus (Estado del Programa)
```typescript
type ProgramStatus = 
  | 'active'        // Activo y vigente
  | 'expired'       // Expirado por fecha
  | 'completed'     // Completado por sesiones
  | 'suspended'     Suspendido temporalmente
  | 'cancelled';    // Cancelado
```

#### 1.3. ProgramRenewal (Renovación de Programa)
```typescript
interface ProgramRenewal {
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
```

#### 1.4. RenewalType (Tipo de Renovación)
```typescript
type RenewalType = 
  | 'expiration'     // Por expiración de fecha
  | 'sessions_depleted' // Por agotamiento de sesiones
  | 'trainer_decision'  // Por decisión del entrenador
  | 'client_request'    // Por solicitud del cliente
  | 'system_auto';      // Automática del sistema
```

### 2. Configuración de Programas

#### 2.1. ProgramConfiguration
```typescript
interface ProgramConfiguration {
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
```

#### 2.2. Configuraciones Predefinidas
```typescript
const PROGRAM_CONFIGURATIONS: ProgramConfiguration[] = [
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
```

### 3. Reglas de Negocio

#### 3.1. Reglas de Sesiones
- **Frecuencia recomendada**: 3 sesiones por semana
- **Mínimo para resultados**: 8 sesiones
- **Un programa vigente**: Por cliente a la vez
- **Reserva solo con sesiones disponibles**: Un cliente solo puede reservar si tiene sesiones restantes

#### 3.2. Reglas de Renovación
- **Por expiración**: Cuando `endDate < fecha actual`
- **Por sesiones agotadas**: Cuando `remainingSessions <= 0`
- **Decisión del entrenador**: El entrenador puede renovar en cualquier momento
- **Recuperación**: Clientes con programas expirados pueden renovar

#### 3.3. Estados y Transiciones
```
[active] → [completed] (when sessions depleted)
[active] → [expired] (when date passed)
[expired] → [active] (when renewed)
[completed] → [active] (when renewed)
[active] → [suspended] (trainer decision)
[suspended] → [active] (trainer decision)
```

### 4. Integración con Sistema Actual

#### 4.1. Extensión de Types Existentes
```typescript
// Extender Booking para incluir referencia a programa
interface Booking {
  // ... propiedades existentes
  programId?: string;           // Referencia al programa del cliente
  sessionDeducted: boolean;     // Si la sesión fue descontada
}

// Extender Client (nueva entidad)
interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  currentProgram?: ClientProgram;
  programHistory: ClientProgram[];
  isActive: boolean;
  createdAt: Date;
}
```

#### 4.2. Integración con BookingModel
```typescript
class BookingModel {
  // ... métodos existentes
  
  async validateSessionAvailability(clientId: string, programId?: string): Promise<boolean> {
    if (!clientId || !programId) return true; // Reservas sin programa
    
    const program = await this.getProgramById(programId);
    return program?.remainingSessions > 0 && program.status === 'active';
  }
  
  async deductSessionFromProgram(programId: string): Promise<void> {
    const program = await this.getProgramById(programId);
    if (!program) throw new Error('Program not found');
    
    if (program.remainingSessions <= 0) {
      throw new Error('No sessions remaining in program');
    }
    
    program.usedSessions++;
    program.remainingSessions--;
    program.updatedAt = new Date();
    
    // Verificar si se completó el programa
    if (program.remainingSessions === 0) {
      program.status = 'completed';
    }
    
    await this.dataService.programs.save(program);
  }
}
```

### 5. Nuevos ViewModels

#### 5.1. ClientProgramViewModel
```typescript
class ClientProgramViewModel {
  @observable programs: ClientProgram[] = [];
  @observable selectedProgram: ClientProgram | null = null;
  @observable isLoading = false;
  @observable error: string | null = null;
  
  // Para vista del cliente
  @observable myProgram: ClientProgram | null = null;
  @observable remainingSessions: number = 0;
  @observable programStatus: ProgramStatus = 'active';
  
  async getProgramByClientId(clientId: string): Promise<ClientProgram | null> {
    return this.dataService.programs.getByClientId(clientId);
  }
  
  async createProgram(programData: Omit<ClientProgram, 'id'>): Promise<ClientProgram> {
    // Validaciones de negocio
    this.validateProgramCreation(programData);
    
    const newProgram: ClientProgram = {
      ...programData,
      id: `program_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      remainingSessions: programData.totalSessions - programData.usedSessions
    };
    
    await this.dataService.programs.save(newProgram);
    return newProgram;
  }
  
  async renewProgram(
    programId: string, 
    newSessions: number, 
    renewalType: RenewalType,
    renewedBy: 'trainer' | 'system' | 'client'
  ): Promise<ClientProgram> {
    const program = await this.getProgramById(programId);
    if (!program) throw new Error('Program not found');
    
    // Crear registro de renovación
    const renewal: ProgramRenewal = {
      id: `renewal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      programId,
      previousTotalSessions: program.totalSessions,
      newTotalSessions: newSessions,
      renewalType,
      renewalDate: new Date(),
      renewedBy,
      newEndDate: this.calculateNewEndDate(newSessions, program.frequencyPerWeek)
    };
    
    // Actualizar programa
    program.totalSessions = newSessions;
    program.usedSessions = 0; // Reiniciar contador
    program.remainingSessions = newSessions;
    program.endDate = renewal.newEndDate;
    program.status = 'active';
    program.updatedAt = new Date();
    program.renewalHistory.push(renewal);
    
    await this.dataService.programs.save(program);
    await this.dataService.renewals.save(renewal);
    
    return program;
  }
  
  private calculateNewEndDate(totalSessions: number, frequencyPerWeek: number): Date {
    const weeksNeeded = Math.ceil(totalSessions / frequencyPerWeek);
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + (weeksNeeded * 7));
    return newEndDate;
  }
  
  private validateProgramCreation(programData: Omit<ClientProgram, 'id'>): void {
    // Validar que no tenga programa activo
    if (programData.status === 'active') {
      // Verificar que no exista otro programa activo para el mismo cliente
    }
    
    // Validar fechas
    if (programData.startDate >= programData.endDate) {
      throw new Error('End date must be after start date');
    }
    
    // Validar sesiones mínimas
    if (programData.totalSessions < programData.minimumSessionsForResult) {
      throw new Error('Total sessions must be at least minimum sessions for result');
    }
  }
}
```

#### 5.2. TrainerProgramViewModel
```typescript
class TrainerProgramViewModel {
  @observable clientPrograms: ClientProgram[] = [];
  @observable selectedClient: Client | null = null;
  @observable isLoading = false;
  @observable error: string | null = null;
  
  async getProgramsByTrainer(trainerId: string): Promise<ClientProgram[]> {
    return this.dataService.programs.getByTrainerId(trainerId);
  }
  
  async getClientProgramSummary(clientId: string): Promise<{
    remainingSessions: number;
    totalSessions: number;
    status: ProgramStatus;
    daysUntilExpiration: number;
    sessionsThisWeek: number;
  }> {
    const program = await this.dataService.programs.getByClientId(clientId);
    if (!program) {
      throw new Error('No program found for client');
    }
    
    const today = new Date();
    const daysUntilExpiration = Math.ceil(
      (program.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Calcular sesiones esta semana
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const bookingsThisWeek = await this.dataService.bookings.getByClientAndDateRange(
      clientId,
      weekStart,
      weekEnd
    );
    
    return {
      remainingSessions: program.remainingSessions,
      totalSessions: program.totalSessions,
      status: program.status,
      daysUntilExpiration: Math.max(0, daysUntilExpiration),
      sessionsThisWeek: bookingsThisWeek.filter(b => b.status === 'confirmed').length
    };
  }
  
  // Métodos para gestión de renovaciones
  async recommendRenewal(programId: string): Promise<RenewalRecommendation> {
    const program = await this.getProgramById(programId);
    if (!program) throw new Error('Program not found');
    
    const recommendations: RenewalRecommendation[] = [];
    
    // Recomendar si está por expirar
    const today = new Date();
    const daysUntilExpiration = Math.ceil(
      (program.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiration <= 7) {
      recommendations.push({
        type: 'expiration',
        priority: 'high',
        message: `El programa expira en ${daysUntilExpiration} días`,
        suggestedAction: 'renew'
      });
    }
    
    // Recomendar si tiene pocas sesiones
    if (program.remainingSessions <= 3) {
      recommendations.push({
        type: 'sessions_depleted',
        priority: 'high',
        message: `Solo quedan ${program.remainingSessions} sesiones`,
        suggestedAction: 'renew'
      });
    }
    
    return {
      programId,
      recommendations,
      nextAction: recommendations.length > 0 ? 'review' : 'continue'
    };
  }
}
```

### 6. Repositories Nuevos

#### 6.1. IClientProgramRepository
```typescript
interface IClientProgramRepository {
  getAll(): Promise<ClientProgram[]>;
  getById(id: string): Promise<ClientProgram | null>;
  getByClientId(clientId: string): Promise<ClientProgram | null>;
  getByTrainerId(trainerId: string): Promise<ClientProgram[]>;
  getActivePrograms(): Promise<ClientProgram[]>;
  getExpiringPrograms(days: number): Promise<ClientProgram[]>;
  save(program: ClientProgram): Promise<void>;
  delete(id: string): Promise<void>;
}
```

#### 6.2. IRenewalRepository
```typescript
interface IRenewalRepository {
  getAll(): Promise<ProgramRenewal[]>;
  getByProgramId(programId: string): Promise<ProgramRenewal[]>;
  getByClientId(clientId: string): Promise<ProgramRenewal[]>;
  save(renewal: ProgramRenewal): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### 7. Componentes de UI Sugeridos

#### 7.1. Para Clientes
- **ClientProgramCard**: Muestra resumen del programa actual
- **SessionCounter**: Visualización de sesiones restantes
- **ProgramStatus**: Indicador visual del estado del programa

#### 7.2. Para Entrenadores
- **ClientProgramList**: Lista de programas de clientes
- **ProgramSummary**: Resumen detallado del programa de un cliente
- **RenewalModal**: Modal para gestionar renovaciones
- **ProgramAnalytics**: Estadísticas de programas

### 8. Flujo de Integración

#### 8.1. Creación de Programa
1. Entrenador crea programa para cliente
2. Sistema valida que no tenga programa activo
3. Se crea programa con estado 'active'
4. Cliente puede comenzar a reservar sesiones

#### 8.2. Reserva con Programa
1. Cliente selecciona fecha/horario
2. Sistema verifica sesiones disponibles
3. Si hay sesiones, permite reserva
4. Al confirmar, descuenta una sesión

#### 8.3. Renovación de Programa
1. Sistema detecta necesidad de renovación
2. Entrenador recibe recomendación
3. Entrenador gestiona renovación
4. Programa se reactiva con nuevas sesiones

### 9. Consideraciones Técnicas

#### 9.1. Persistencia
- Extender `IDataService` para incluir `programs` y `renewals`
- Implementar repositorios en localStorage initially
- Preparar para migración a API

#### 9.2. Validaciones
- Validar disponibilidad de sesiones antes de reservar
- Evitar doble descuento de sesiones
- Manejar concurrencia en actualizaciones

#### 9.3. Notificaciones
- Alertas cuando programa está por expirar
- Notificaciones cuando quedan pocas sesiones
- Confirmaciones de renovación

## Conclusiones

Este modelo conceptual proporciona una base sólida para implementar la gestión de programas de clientes manteniendo la arquitectura existente. Las características principales son:

1. **Integración limpia** con el sistema actual de reservas
2. **Flexibilidad** para diferentes tipos de programas
3. **Automatización** de renovaciones y validaciones
4. **Visibilidad** completa para clientes y entrenadores
5. **Escalabilidad** para futuras funcionalidades

El modelo sigue los principios SOLID y el patrón MVVM establecido, asegurando consistencia y mantenibilidad del código.