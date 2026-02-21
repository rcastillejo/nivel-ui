# Arquitectura del Sistema de Reservas - Nivel UI

## Patrón Arquitectónico Principal

El proyecto implementa **MVVM (Model-View-ViewModel)** con elementos de **Clean Architecture**, proporcionando una separación clara de responsabilidades y alta testabilidad.

## Estructura de Capas

### 1. **Presentation Layer (Capa de Presentación)**
- **Ubicación**: `src/components/`, `src/app/`
- **Responsabilidad**: Interfaces de usuario y navegación
- **Tecnología**: React Components con Next.js App Router

```
src/components/
├── BookingWizard.tsx          # Componente principal del flujo de reservas
├── CalendarStep.tsx           # Selector de fechas
├── TimeGridStep.tsx           # Selector de horarios
├── ConfirmationModal.tsx      # Modal de confirmación
├── SuccessModal.tsx           # Modal de éxito
└── trainer/                   # Componentes específicos del entrenador
    ├── TrainerSchedule.tsx    # Gestión de horarios
    ├── TrainerAppointments.tsx # Vista de citas
    └── ...modales relacionados
```

### 2. **ViewModel Layer (Capa de Lógica de Presentación)**
- **Ubicación**: `src/core/view-models/`
- **Responsabilidad**: Estado de la UI, validaciones de formularios, coordinación de operaciones
- **Tecnología**: MobX para estado reactivo

```typescript
// BookingViewModel.ts - Estado reactivo con MobX
export class BookingViewModel {
  // Estado observable
  trainers: Trainer[] = [];
  availableSlots: string[] = [];
  isLoading = false;
  error: string | null = null;
  
  // Estado del formulario
  selectedDate: Date | null = null;
  selectedTrainer: Trainer | null = null;
  selectedTime: string | null = null;
  
  // Computed values
  get canCreateBooking() {
    return !!(this.selectedDate && this.selectedTrainer && this.selectedTime);
  }
}
```

### 3. **Model Layer (Capa de Lógica de Negocio)**
- **Ubicación**: `src/core/models/`
- **Responsabilidad**: Reglas de negocio, validaciones de dominio, coordinación de repositorios
- **Patrón**: Domain Models con lógica encapsulada

```typescript
// BookingModel.ts - Lógica de negocio
export class BookingModel {
  async createBooking(booking: Omit<Booking, 'id'>): Promise<Booking> {
    // Validaciones de negocio
    this.validateBooking(booking);
    
    // Verificar disponibilidad
    await this.checkAvailability(booking.trainerId, booking.date, booking.time);
    
    // Crear reserva
    return await this.dataService.bookings.save(newBooking);
  }
}
```

### 4. **Repository Layer (Capa de Acceso a Datos)**
- **Ubicación**: `src/core/repositories/`
- **Responsabilidad**: Abstracción del acceso a datos
- **Patrón**: Repository Pattern con interfaces

```typescript
// Interfaces de repositorios
export interface IBookingRepository {
  getAll(): Promise<Booking[]>;
  getByDate(date: Date): Promise<Booking[]>;
  save(booking: Booking): Promise<void>;
  // ... más métodos
}

export interface IDataService {
  trainers: ITrainerRepository;
  bookings: IBookingRepository;
}
```

### 5. **Infrastructure Layer (Capa de Infraestructura)**
- **Ubicación**: `src/core/repositories/localStorage.ts`
- **Responsabilidad**: Implementaciones concretas de persistencia
- **Tecnología**: LocalStorage (fácilmente intercambiable por API)

## Patrones de Diseño Implementados

### 1. **Repository Pattern**
```typescript
// Abstracción
interface IBookingRepository {
  save(booking: Booking): Promise<void>;
}

// Implementación concreta
class LocalStorageBookingRepository implements IBookingRepository {
  async save(booking: Booking): Promise<void> {
    // Implementación específica de localStorage
  }
}
```

### 2. **Dependency Injection**
```typescript
// ViewModelProvider inyecta dependencias
const bookingModel = new BookingModel(dataService);
const bookingViewModel = new BookingViewModel(bookingModel);
```

### 3. **Observer Pattern (MobX)**
```typescript
// Estado observable que notifica cambios automáticamente
@observable selectedDate: Date | null = null;

// Componentes React se re-renderizan automáticamente
const Component = observer(() => {
  const { selectedDate } = useBookingViewModel();
  return <div>{selectedDate}</div>;
});
```

### 4. **Provider Pattern (React Context)**
```typescript
// DataProvider maneja el estado global
export function DataProvider({ children }) {
  const [service] = useState(() => new LocalStorageDataService());
  return (
    <DataContext.Provider value={{ service }}>
      {children}
    </DataContext.Provider>
  );
}
```

## Principios SOLID Aplicados

### 1. **Single Responsibility Principle (SRP)**
- Cada clase tiene una responsabilidad única
- `BookingModel`: Solo lógica de negocio de reservas
- `BookingViewModel`: Solo estado de UI de reservas
- `BookingRepository`: Solo acceso a datos de reservas

### 2. **Open/Closed Principle (OCP)**
- Interfaces permiten extensión sin modificación
- Nuevos tipos de persistencia implementan `IDataService`
- Nuevos ViewModels pueden usar el mismo `BookingModel`

### 3. **Liskov Substitution Principle (LSP)**
- Cualquier implementación de `IBookingRepository` es intercambiable
- `LocalStorageDataService` puede ser reemplazado por `APIDataService`

### 4. **Interface Segregation Principle (ISP)**
- Interfaces específicas para cada responsabilidad
- `ITrainerRepository` separado de `IBookingRepository`
- Clientes no dependen de métodos que no usan

### 5. **Dependency Inversion Principle (DIP)**
- Capas altas no dependen de implementaciones concretas
- `BookingModel` depende de `IDataService`, no de `LocalStorageDataService`
- Inyección de dependencias en toda la aplicación

## Flujo de Datos

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Components    │    │   ViewModels     │    │     Models      │    │   Repositories   │
│  (React + UI)   │────│  (MobX State)    │────│ (Business Logic)│────│ (Data Access)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
         │                        │                       │                       │
         │                        │                       │                       │
    User Events              Observable State        Domain Rules            Data Persistence
  (clicks, inputs)          (auto re-render)       (validations)           (localStorage)
```

### Flujo Típico de Operación:
1. **User Action**: Usuario selecciona fecha en componente
2. **ViewModel**: `setDate(date)` actualiza estado observable
3. **Model**: `getAvailableSlots(trainerId, date)` aplica reglas de negocio
4. **Repository**: Consulta datos desde localStorage
5. **ViewModel**: Actualiza `availableSlots` observable
6. **Component**: Re-renderiza automáticamente con nuevos datos

## Gestión de Estado

### 1. **Estado Local (MobX)**
```typescript
// ViewModels manejan estado de formularios y UI
class BookingViewModel {
  @observable selectedDate: Date | null = null;
  @observable isLoading = false;
  
  @action setDate(date: Date) {
    this.selectedDate = date;
  }
}
```

### 2. **Estado Global (React Context)**
```typescript
// DataProvider maneja datos compartidos
const DataContext = createContext<{
  trainers: Trainer[];
  bookings: Booking[];
  refreshData: () => Promise<void>;
}>();
```

### 3. **Persistencia (Repository Layer)**
```typescript
// Repositories manejan la persistencia
class LocalStorageDataService implements IDataService {
  async initialize() {
    // Carga datos iniciales o seed data
  }
}
```

## Ventajas de esta Arquitectura

### 1. **Testabilidad**
- Cada capa puede ser testeada independientemente
- Mocking sencillo a través de interfaces
- Lógica de negocio separada de UI

### 2. **Mantenibilidad**
- Responsabilidades claramente separadas
- Cambios en una capa no afectan otras
- Código organizado y predecible

### 3. **Escalabilidad**
- Fácil agregar nuevas funcionalidades
- Nuevos ViewModels reutilizan Models existentes
- Nuevos tipos de persistencia sin cambios en lógica

### 4. **Flexibilidad**
- Intercambio de implementaciones sin cambios de código
- Soporte para múltiples fuentes de datos
- Adaptable a diferentes requerimientos de UI

## Tecnologías Utilizadas

- **Frontend**: Next.js 14 con App Router
- **Estado**: MobX para reactividad
- **Dependencias**: React Context para DI
- **Tipado**: TypeScript para type safety
- **Persistencia**: LocalStorage (extensible a API)

## Patrones de Naming

- **Interfaces**: Prefijo `I` (ej: `IBookingRepository`)
- **Models**: Sufijo `Model` (ej: `BookingModel`)
- **ViewModels**: Sufijo `ViewModel` (ej: `BookingViewModel`)
- **Components**: PascalCase (ej: `BookingWizard`)
- **Providers**: Sufijo `Provider` (ej: `DataProvider`)

Esta arquitectura proporciona una base sólida para el desarrollo de la aplicación, facilitando el mantenimiento, testing y extensión futura del sistema.