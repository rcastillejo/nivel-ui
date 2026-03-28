# Arquitectura Completa de Nivel UI

## 1. Arquitectura General

Nivel UI sigue una arquitectura **MVVM (Model-View-ViewModel)** con **Patrón Mediator** para coordinación, **inyección de dependencias** y **separación de responsabilidades**.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN                     │
├─────────────────────────────────────────────────────────────────┤
│  Pages (Next.js)                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   /client   │  │  /trainer   │  │     /       │              │
│  │   page.tsx  │  │   page.tsx  │  │   page.tsx  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                │                 │                  │
│         ▼                ▼                 ▼                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    COMPONENTS                           │   │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │   │
│  │ │ BookingView  │ │ TrainerApp   │ │ ClientInfo   │      │   │
│  │ └──────────────┘ └──────────────┘ └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CAPA DE LÓGICA                           │
├─────────────────────────────────────────────────────────────────┤
│  ViewModels (Estados y Lógica de Presentación)                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ BookingViewModel│ │ProgramViewModel │ │TrainerViewModel │   │
│  │                 │ │                 │ │                 │   │
│  │ • Estado UI     │ │ • Estado UI     │ │ • Estado UI     │   │
│  │ • Validaciones  │ │ • Validaciones  │ │ • Validaciones  │   │
│  │ • Formato datos │ │ • Formato datos │ │ • Formato datos │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│         │                       │                   │          │
│         ▼                       ▼                   ▼          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 PROGRAM MEDIATOR                        │   │
│  │  • Coordinación entre ViewModels                       │   │
│  │  • Elimina dependencias directas                       │   │
│  │  • Centraliza lógica de coordinación                   │   │
│  │  • Métodos: loadPrograms(), create, update, delete     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CAPA DE DATOS                            │
├─────────────────────────────────────────────────────────────────┤
│  Models (Lógica de Negocio)                                   │
│  ┌─────────────────┐ ┌─────────────────┐                       │
│  │  BookingModel   │ │  ProgramModel   │                       │
│  │                 │ │                 │                       │
│  │ • Reglas negocio│ │ • Reglas negocio│                       │
│  │ • Validaciones  │ │ • Validaciones  │                       │
│  │ • Cálculos      │ │ • Cálculos      │                       │
│  └─────────────────┘ └─────────────────┘                       │
│                                 │                              │
│                                 ▼                              │
│                         Repositories                            │
│                    ┌─────────────────┐                         │
│                    │ IDataService    │                         │
│                    │                 │                         │
│                    │ • CRUD           │                         │
│                    │ • Queries        │                         │
│                    │ • Storage        │                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Flujo de Datos Actual (LocalStorage)

### 2.1. Configuración de Providers

```typescript
// layout.tsx
<ViewModelProvider>
  <DataProvider>
    {children}
  </DataProvider>
</ViewModelProvider>
```

### 2.2. Coordinación entre ViewModels

Para resolver el problema de acoplamiento entre ViewModels, hemos implementado el **Patrón Mediator**.

**📋 Para ver la implementación completa del Patrón Mediator, incluyendo:**
- ✅ **Implementación completa** del ProgramMediator
- ✅ **Ejemplos de uso** en componentes React  
- ✅ **Guía de migración** paso a paso
- ✅ **Testing completo** con ejemplos de tests
- ✅ **Diagramas de arquitectura** y flujos de datos
- ✅ **Análisis antes/después** con métricas

**👉 Consulta el documento especializado: [ARQUITECTURA_VIEW_MODELS.md](./ARQUITECTURA_VIEW_MODELS.md)**

#### Concepto Básico
```typescript
// ViewModels desacoplados con coordinación via Mediator
const viewModels = useMemo(() => {
  // ViewModels solo dependen de sus Models
  const bookingVM = new BookingViewModel(bookingModel);
  const trainerVM = new TrainerViewModel(bookingModel);
  const programVM = new ProgramViewModel(service);
  
  // Mediator coordina entre ViewModels
  const mediator = new ProgramMediator(programVM, bookingVM, trainerViewModel);

  return { bookingVM, trainerViewModel, programVM, mediator };
}, [service]);
```

### 2.3. Flujo de Datos LocalStorage

```
Componente 
    ↓ (useViewModels)
ViewModel 
    ↓ (métodos del Model)
Model 
    ↓ (repository service)
DataService 
    ↓ (localStorage)
localStorage
```

**Ejemplo concreto:**

```typescript
// 1. Componente solicita datos
const { bookingVM } = useBookingViewModel();
const trainers = bookingVM.trainers;

// 2. ViewModel (sin estado, solo derivaciones)
get trainers() {
  return this.bookingModel.getTrainers();
}

// 3. Model (lógica de negocio)
async getTrainers(): Promise<Trainer[]> {
  return this.dataService.trainers.getAll();
}

// 4. DataService (abstracto)
async getAll(): Promise<Trainer[]> {
  return this.repository.getAll(); // localStorage Repository
}

// 5. LocalStorage Repository
getAll(): Trainer[] {
  return this.readFromStorage('trainers') || [];
}
```

## 3. Integración con Backend - Arquitectura Propuesta

### 3.1. Estructura del Backend

```
backend/
├── src/
│   ├── controllers/     # Endpoints HTTP
│   │   ├── bookings.controller.ts
│   │   ├── programs.controller.ts
│   │   └── trainers.controller.ts
│   ├── services/        # Lógica de negocio del backend
│   │   ├── bookings.service.ts
│   │   ├── programs.service.ts
│   │   └── trainers.service.ts
│   ├── repositories/    # Acceso a base de datos
│   │   ├── booking.repository.ts
│   │   ├── program.repository.ts
│   │   └── trainer.repository.ts
│   ├── models/          # Modelos de base de datos
│   │   ├── booking.model.ts
│   │   ├── program.model.ts
│   │   └── trainer.model.ts
│   ├── middleware/      # Autenticación, validación
│   ├── config/          # Configuración DB, etc.
│   └── routes/          # Definición de rutas
└── package.json
```

### 3.2. API Endpoints Propuestos

```typescript
// GET /api/trainers
interface GetTrainersResponse {
  trainers: Trainer[];
  total: number;
}

// GET /api/trainers/:id/schedule?date=2024-03-15
interface GetTrainerScheduleResponse {
  trainerId: string;
  date: string;
  availableSlots: TimeSlot[];
  weeklySchedule: WeeklySchedule;
}

// GET /api/bookings/availability
interface AvailabilityQuery {
  trainerId: string;
  date: string;
  zone: ZoneType;
}

interface AvailabilityResponse {
  availableSlots: string[];
  occupancy: Record<ZoneType, number>;
  maxCapacity: Record<ZoneType, number>;
}

// POST /api/bookings
interface CreateBookingRequest {
  trainerId: string;
  clientName: string;
  date: string;
  time: string;
  duration: number;
  zone: ZoneType;
  type: BookingType;
  programId?: string;
}

// GET /api/programs/client/:clientId
interface GetClientProgramsResponse {
  programs: Program[];
  activeProgram?: Program;
}
```

### 3.3. Implementación del Repository de Backend

```typescript
// src/core/repositories/backend.ts
export class BackendDataService implements IDataService {
  private baseURL: string;
  private authToken?: string;

  constructor(baseURL: string, authToken?: string) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  // Trainers
  trainers = {
    getAll: async (): Promise<Trainer[]> => {
      const response = await this.request<{trainers: Trainer[]}>('/api/trainers');
      return response.trainers;
    },

    getById: async (id: string): Promise<Trainer | null> => {
      try {
        return await this.request<Trainer>(`/api/trainers/${id}`);
      } catch {
        return null;
      }
    },

    getSchedule: async (trainerId: string): Promise<WeeklySchedule | null> => {
      try {
        const today = new Date().toISOString().split('T')[0];
        return await this.request<WeeklySchedule>(
          `/api/trainers/${trainerId}/schedule?date=${today}`
        );
      } catch {
        return null;
      }
    },

    saveSchedule: async (trainerId: string, schedule: WeeklySchedule): Promise<void> => {
      await this.request(`/api/trainers/${trainerId}/schedule`, {
        method: 'POST',
        body: JSON.stringify(schedule),
      });
    }
  };

  // Bookings
  bookings = {
    getAll: async (): Promise<Booking[]> => {
      const response = await this.request<{bookings: Booking[]}>('/api/bookings');
      return response.bookings;
    },

    getById: async (id: string): Promise<Booking | null> => {
      try {
        return await this.request<Booking>(`/api/bookings/${id}`);
      } catch {
        return null;
      }
    },

    save: async (booking: Booking): Promise<void> => {
      await this.request('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(booking),
      });
    },

    update: async (id: string, updates: Partial<Booking>): Promise<void> => {
      await this.request(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },

    delete: async (id: string): Promise<void> => {
      await this.request(`/api/bookings/${id}`, {
        method: 'DELETE',
      });
    },

    getByDate: async (date: Date): Promise<Booking[]> => {
      const dateStr = date.toISOString().split('T')[0];
      const response = await this.request<{bookings: Booking[]}>(
        `/api/bookings?date=${dateStr}`
      );
      return response.bookings;
    },

    getByTrainer: async (trainerId: string): Promise<Booking[]> => {
      const response = await this.request<{bookings: Booking[]}>(
        `/api/bookings?trainerId=${trainerId}`
      );
      return response.bookings;
    }
  };

  // Programs
  programs = {
    getAll: async (): Promise<Program[]> => {
      const response = await this.request<{programs: Program[]}>('/api/programs');
      return response.programs;
    },

    getById: async (id: string): Promise<Program | null> => {
      try {
        return await this.request<Program>(`/api/programs/${id}`);
      } catch {
        return null;
      }
    },

    save: async (program: Program): Promise<void> => {
      await this.request('/api/programs', {
        method: 'POST',
        body: JSON.stringify(program),
      });
    },

    update: async (id: string, updates: Partial<Program>): Promise<void> => {
      await this.request(`/api/programs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },

    delete: async (id: string): Promise<void> => {
      await this.request(`/api/programs/${id}`, {
        method: 'DELETE',
      });
    }
  };
}
```

### 3.4. Configuración del Backend Service

```typescript
// src/core/providers/BackendProvider.tsx
interface BackendProviderProps {
  children: ReactNode;
  apiURL: string;
  authToken?: string;
}

export function BackendProvider({ 
  children, 
  apiURL, 
  authToken 
}: BackendProviderProps) {
  const backendService = useMemo(() => 
    new BackendDataService(apiURL, authToken), 
    [apiURL, authToken]
  );

  return (
    <DataProvider service={backendService}>
      {children}
    </DataProvider>
  );
}
```

### 3.5. Integración en la Aplicación

```typescript
// app/layout.tsx (con detección de entorno)
export default function RootLayout({ children }: { children: ReactNode }) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  return (
    <html lang="es">
      <body>
        {isDevelopment ? (
          // Desarrollo: usar LocalStorage
          <ViewModelProvider>
            <DataProvider>
              {children}
            </DataProvider>
          </ViewModelProvider>
        ) : (
          // Producción: usar Backend
          <ViewModelProvider>
            <BackendProvider apiURL={apiURL}>
              {children}
            </BackendProvider>
          </ViewModelProvider>
        )}
      </body>
    </html>
  );
}
```

## 4. Flujo de Datos con Backend

### 4.1. Diagrama de Flujo

```
Componente React
       ↓ (useViewModels)
   ViewModel
       ↓ (métodos del Model)
     Model
       ↓ (repository service)
BackendDataService
       ↓ (HTTP request)
     API REST
       ↓
   Backend Server
       ↓
   Base de Datos
```

### 4.2. Ejemplo Completo: Crear Reserva

```typescript
// 1. Componente
const handleSubmit = async (data: BookingData) => {
  try {
    const booking = await bookingVM.createBooking({
      trainerId: data.trainerId,
      clientName: data.clientName,
      date: data.date,
      time: data.time,
      duration: data.duration,
      zone: data.zone,
      type: data.type
    });
    
    showSuccess('Reserva creada exitosamente');
  } catch (error) {
    showError(error.message);
  }
};

// 2. ViewModel
async createBooking(data: CreateBookingData): Promise<Booking> {
  // Validaciones de UI
  this.validateBookingData(data);
  
  // Llamar al Model
  return await this.bookingModel.createBooking(data);
}

// 3. Model
async createBooking(booking: Omit<Booking, 'id'>): Promise<Booking> {
  // Validaciones de negocio
  this.validateBooking(booking);
  
  // Verificar disponibilidad (llamada al backend)
  await this.checkAvailability(booking.trainerId, booking.date, booking.time);
  
  // Validar capacidad (llamada al backend)
  await this.validateCapacity(booking);
  
  // Crear reserva (llamada al backend)
  return await this.dataService.bookings.save(booking as Booking);
}

// 4. BackendDataService
async save(booking: Booking): Promise<void> {
  await this.request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(booking),
  });
}

// 5. Backend Endpoint (Node.js/Express)
app.post('/api/bookings', async (req, res) => {
  try {
    const booking = await bookingService.createBooking({
      ...req.body,
      id: generateId(),
      status: 'confirmed',
      createdAt: new Date()
    });
    
    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## 5. Ventajas de esta Arquitectura

### 5.1. Separación de Responsabilidades
- **Components**: Solo presentación y estado de UI
- **ViewModels**: Lógica de presentación y formato de datos
- **Models**: Reglas de negocio puras
- **Repositories**: Abstracción de persistencia

### 5.2. Testabilidad
```typescript
// Fácil de testear con mocks
const mockDataService = {
  bookings: {
    save: jest.fn().mockResolvedValue(mockBooking)
  }
};

const bookingModel = new BookingModel(mockDataService);
const result = await bookingModel.createBooking(bookingData);
expect(mockDataService.bookings.save).toHaveBeenCalledWith(bookingData);
```

### 5.3. Flexibilidad
- **Swap de persistance** sin cambiar lógica de negocio
- **Múntiples data sources** (localStorage, backend, cache)
- **Evolución independiente** de cada capa

### 5.4. Mantenimiento
- **Cada clase tiene una responsabilidad única**
- **Bajo acoplamiento entre capas**
- **Alta cohesión dentro de cada capa**

## 6. Estrategia de Migración

### 6.1. Fase 1: Preparación
- ✅ Implementar interfaz `IDataService`
- ✅ Separar Models de dependencias directas
- ✅ Crear providers configurables

### 6.2. Fase 2: Backend Development
- 🔄 Crear API REST con endpoints definidos
- 🔄 Implementar lógica de negocio en backend
- 🔄 Configurar base de datos

### 6.3. Fase 3: Integración
- 🔄 Implementar `BackendDataService`
- 🔄 Configurar `BackendProvider`
- 🔄 Ajustar Models para manejar errores HTTP

### 6.4. Fase 4: Optimización
- 🔄 Implementar caché en cliente
- 🔄 Optimizar consultas (batching, deduplication)
- 🔄Agregar autenticación y autorización

## 7. Resumen

La arquitectura de Nivel UI está diseñada para ser **escalable, mantenible y testeable**. La transición a backend es **transparente para los componentes** gracias a la abstracción de repositories y el patrón MVVM bien implementado.

**Flujo actual (LocalStorage):**
`Component → ViewModel → Model → LocalStorageRepository → localStorage`

**Flujo con backend:**
`Component → ViewModel → Model → BackendDataService → API REST → Database`

Los **ViewModels mantienen el estado y la lógica de presentación**, los **Models contienen las reglas de negocio**, y los **Repositories abstraen la fuente de datos**, permitiendo cambiar entre LocalStorage y Backend sin modificar la lógica de negocio ni la presentación.