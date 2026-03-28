# Análisis de Dependencias entre ViewModels - Nivel UI

## 🔍 Estado Actual de la Implementación

### 1. **Dependencias Identificadas**

#### ViewModelProvider.tsx - Inyección de Dependencias
```typescript
const viewModels = useMemo(() => {
  const programModel = new ProgramModel(service);
  const bookingModel = new BookingModel(service);
  const programVM = new ProgramViewModel(service);
  const bookingVM = new BookingViewModel(bookingModel, programVM);  // ⚠️ DEPENDENCIA
  const trainerViewModel = new TrainerViewModel(bookingModel, programVM); // ⚠️ DEPENDENCIA
}, [service]);
```

#### BookingViewModel.ts - Dependencia directa
```typescript
constructor(private model: BookingModel, private programViewModel: ProgramViewModel) {
  makeAutoObservable(this);
}

// Método que usa la dependencia
async loadClientPrograms() {
  const programs = await this.programViewModel.getProgramsByClient(this.clientId);
  // ...
}
```

#### TrainerViewModel.ts - Dependencia directa
```typescript
constructor(private model: BookingModel, private programViewModel: ProgramViewModel) {
  makeAutoObservable(this);
}

// Método que usa la dependencia
async loadClientPrograms(clientId?: string) {
  const programs = clientId 
    ? await this.programViewModel.getProgramsByClient(clientId)
    : await this.programViewModel.getPrograms();
  // ...
}
```

## ⚠️ **PROBLEMAS IDENTIFICADOS**

### 1. **Violación del Principio de Responsabilidad Única (SRP)**
- **BookingViewModel** maneja lógica de reservas Y gestiona programas
- **TrainerViewModel** maneja lógica de entrenador Y gestiona programas
- Los ViewModels están faisant el trabajo del **ProgramViewModel**

### 2. **Acoplamiento Fuerte entre ViewModels**
- `BookingViewModel` depende directamente de `ProgramViewModel`
- `TrainerViewModel` depende directamente de `ProgramViewModel`
- Creación de una **red de dependencias** difícil de mantener

### 3. **Duplicación de Lógica**
- Ambos ViewModels (`BookingViewModel` y `TrainerViewModel`) tienen métodos similares:
  ```typescript
  // En BookingViewModel
  async loadClientPrograms() {
    const programs = await this.programViewModel.getProgramsByClient(this.clientId);
  }

  // En TrainerViewModel  
  async loadClientPrograms(clientId?: string) {
    const programs = await this.programViewModel.getProgramsByClient(clientId);
  }
  ```

### 4. **Problemas de Testabilidad**
- Para testear `BookingViewModel` necesitas mockear `ProgramViewModel`
- Para testear `TrainerViewModel` necesitas mockear `ProgramViewModel`
- Los tests se vuelven complejos y frágiles

### 5. **Inconsistencia en el Patrón MVVM**
- Los ViewModels deberían depender **solo de Models**, no de otros ViewModels
- Se rompe el flujo unidireccional: `View → ViewModel → Model → Repository`

## 🏗️ **ALTERNATIVAS ARQUITECTÓNICAS PROPUESTAS**

### Opción 1: **Mediator Pattern (Recomendado)**

#### Implementación:
```typescript
// src/core/mediators/ProgramMediator.ts
export class ProgramMediator {
  constructor(
    private programVM: ProgramViewModel,
    private bookingVM: BookingViewModel,
    private trainerVM: TrainerViewModel
  ) {}

  // Métodos de coordinación
  async loadProgramsForBooking(clientId: string): Promise<Program[]> {
    return await this.programVM.getProgramsByClient(clientId);
  }

  async loadProgramsForTrainer(clientId?: string): Promise<Program[]> {
    return clientId 
      ? await this.programVM.getProgramsByClient(clientId)
      : await this.programVM.getPrograms();
  }

  async createBookingWithProgramCheck(bookingData: BookingData): Promise<Booking> {
    // 1. Validar programa activo
    const programs = await this.programVM.getProgramsByClient(bookingData.clientId);
    const activeProgram = programs.find(p => p.status === 'active');
    
    if (!activeProgram || activeProgram.remainingSessions <= 0) {
      throw new Error('No active program or sessions available');
    }

    // 2. Crear booking
    return await this.bookingVM.createBooking(bookingData);
  }
}

// ViewModelProvider.tsx
const viewModels = useMemo(() => {
  const programModel = new ProgramModel(service);
  const bookingModel = new BookingModel(service);
  
  // ViewModels sin dependencias entre sí
  const programVM = new ProgramViewModel(service);
  const bookingVM = new BookingViewModel(bookingModel);
  const trainerViewModel = new TrainerViewModel(bookingModel);
  
  // Mediator que coordina
  const mediator = new ProgramMediator(programVM, bookingVM, trainerViewModel);

  return {
    bookingVM,
    trainerViewModel,
    programVM,
    mediator
  };
}, [service]);
```

#### Ventajas:
- ✅ **Desacoplamiento total** entre ViewModels
- ✅ **Responsabilidad única**: cada ViewModel se enfoca en su dominio
- ✅ **Coordinación centralizada** en el Mediator
- ✅ **Fácil testabilidad**: cada componente se puede testear independientemente
- ✅ **Mantenibilidad**: cambios en un ViewModel no afectan a otros

### Opción 2: **Event-Driven Architecture**

#### Implementación:
```typescript
// src/core/events/EventBus.ts
export class EventBus {
  private listeners: Map<string, Function[]> = new Map();

  emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.forEach(listener => listener(data));
  }

  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
}

// BookingViewModel.ts
export class BookingViewModel {
  constructor(private model: BookingModel, private eventBus: EventBus) {
    // Escuchar eventos de programas
    eventBus.on('program:loaded', (programs: Program[]) => {
      this.programs = programs;
    });
  }

  async loadClientPrograms(clientId: string) {
    // Emitir evento en lugar de llamar directamente
    this.eventBus.emit('program:load-requested', { clientId });
  }
}

// ProgramViewModel.ts
export class ProgramViewModel {
  constructor(private model: ProgramModel, private eventBus: EventBus) {
    // Escuchar solicitudes de carga de programas
    eventBus.on('program:load-requested', async ({ clientId }) => {
      const programs = await this.getProgramsByClient(clientId);
      this.eventBus.emit('program:loaded', programs);
    });
  }
}
```

#### Ventajas:
- ✅ **Desacoplamiento completo** via eventos
- ✅ **Extensibilidad**: fácil agregar nuevos listeners
- ✅ **Asíncrono natural**

#### Desventajas:
- ❌ **Complejidad** en el debugging de flujo
- ❌ **Dificultad** para seguir el flujo de datos
- ❌ **Potencial memory leaks** si no se limpie bien

### Opción 3: **Service Layer Pattern**

#### Implementación:
```typescript
// src/core/services/BookingProgramService.ts
export class BookingProgramService {
  constructor(
    private programModel: ProgramModel,
    private bookingModel: BookingModel
  ) {}

  async validateAndCreateBooking(bookingData: BookingData): Promise<Booking> {
    // 1. Validar programa
    const programs = await this.programModel.getProgramsByClient(bookingData.clientId);
    const activeProgram = programs.find(p => p.status === 'active');
    
    if (!activeProgram || activeProgram.remainingSessions <= 0) {
      throw new Error('No active program or sessions available');
    }

    // 2. Crear booking
    const booking = await this.bookingModel.createBooking(bookingData);
    
    // 3. Actualizar programa
    await this.programModel.consumeProgramSession(activeProgram.id);
    
    return booking;
  }
}

// BookingViewModel.ts
export class BookingViewModel {
  constructor(
    private model: BookingModel,
    private bookingProgramService: BookingProgramService
  ) {
    makeAutoObservable(this);
  }

  async createBooking(): Promise<boolean> {
    // Lógica simplificada
    const booking = await this.bookingProgramService.validateAndCreateBooking(bookingData);
    // ...
  }
}
```

#### Ventajas:
- ✅ **Lógica de negocio coordinada** en servicios
- ✅ **ViewModels limpios** y enfocados
- ✅ **Reutilizable** entre diferentes ViewModels

## 📊 **COMPARATIVA DE ALTERNATIVAS**

| Criterio | Estado Actual | Mediator | Event-Driven | Service Layer |
|----------|--------------|-----------|--------------|---------------|
| **Acoplamiento** | ❌ Alto | ✅ Bajo | ✅ Mínimo | ✅ Bajo |
| **Testabilidad** | ❌ Difícil | ✅ Fácil | ⚠️ Media | ✅ Fácil |
| **Mantenibilidad** | ❌ Compleja | ✅ Simple | ⚠️ Media | ✅ Simple |
| **Complejidad** | ✅ Baja | ✅ Media | ❌ Alta | ✅ Media |
| **Scalability** | ❌ Pobre | ✅ Buena | ✅ Excelente | ✅ Buena |
| **Debugging** | ✅ Fácil | ✅ Fácil | ❌ Difícil | ✅ Fácil |

## 🎯 **RECOMENDACIÓN FINAL**

### **Adoptar Mediator Pattern** por las siguientes razones:

1. **Balance Ideal**: Ofrece desacoplamiento sin la complejidad del event-driven
2. **Mantenibilidad**: Código más limpio y fácil de entender
3. **Testabilidad**: Cada componente se puede testear en aislamiento
4. **Evolución**: Fácil de extender sin riesgo de regressiones
5. **Consistencia**: Mantiene el principio MVVM sin violarlo

### **Plan de Migración:**

#### Fase 1: Crear Mediator
```typescript
// src/core/mediators/AppMediator.ts
export class AppMediator {
  constructor(
    private programVM: ProgramViewModel,
    private bookingVM: BookingViewModel,
    private trainerVM: TrainerViewModel
  ) {}

  // Métodos de coordinación
  async loadProgramsForContext(context: 'booking' | 'trainer', clientId?: string) {
    const programs = clientId 
      ? await this.programVM.getProgramsByClient(clientId)
      : await this.programVM.getPrograms();
    
    // Distribuir a los ViewModels que lo necesiten
    if (context === 'booking') {
      this.bookingVM.setPrograms(programs);
    } else if (context === 'trainer') {
      this.trainerVM.setPrograms(programs);
    }
  }
}
```

#### Fase 2: Refactorizar ViewModels
- Remover dependencias directas
- Agregar métodos para recibir datos del mediator
- Mantener solo lógica específica de su dominio

#### Fase 3: Actualizar Provider
- Inyectar mediator junto con ViewModels
- Actualizar componentes para usar mediator quando necesario

### **Resultado Esperado:**
- **ViewModels desacoplados** y con responsabilidad única
- **Coordenación centralizada** via mediator
- **Código más mantenible** y testeable
- **Arquitectura escalable** para futuras funcionalidades

## 📝 **CONCLUSIÓN**

La práctica actual de ViewModels llamando a otros ViewModels **no es recomendable** porque viola principios fundamentales de diseño de software y crea una arquitectura frágil. 

El **Mediator Pattern** ofrece la mejor solución para este caso específico, proporcionando el balance perfecto entre desacoplamiento y simplicidad, manteniendo la coherencia del patrón MVVM y facilitando el mantenimiento futuro del código.