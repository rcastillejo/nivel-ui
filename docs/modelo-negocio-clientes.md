# Modelo de Negocio — Clientes

> Documento de hallazgos y plan de acción generado a partir del análisis del issue #11.

---

## 1. Hallazgos de la revisión

### 1.1 Arquitectura actual

El proyecto implementa **MVVM + Clean Architecture** con Next.js, MobX y TypeScript.

```
Presentation → ViewModel → Model → Repository → Infrastructure (localStorage)
```

Las capas están desacopladas a través de interfaces (`IDataService`, `IBookingRepository`, `ITrainerRepository`), lo que permite intercambiar implementaciones de infraestructura (localStorage → API → Supabase) sin tocar ViewModels ni componentes.

### 1.2 Gap identificado: el cliente no existe como entidad de dominio

En la arquitectura actual, `Booking` tiene solo `clientName: string`. El cliente **no tiene identidad propia**, lo que genera:

- Imposibilidad de referenciar un cliente desde múltiples bookings
- Duplicación de datos (el nombre puede escribirse diferente en cada reserva)
- Sin datos de contacto (email, teléfono)
- Sin estado de membresía

### 1.3 Datos de prueba existentes

Los bookings seed contienen 9 clientes únicos identificados por nombre:

| ID propuesto | Nombre            |
|---|---|
| `client1`    | María González    |
| `client2`    | Carlos Ruiz       |
| `client3`    | Ana Martín        |
| `client4`    | Luis Torres       |
| `client5`    | Patricia Vega     |
| `client6`    | Roberto Silva     |
| `client7`    | Laura Mendoza     |
| `client8`    | Diego Castro      |
| `client9`    | Luis Castillejo   |

---

## 2. Entidad `Client` — Modelo conceptual

### 2.1 Interfaz mínima

```typescript
export interface Client {
  id: string;                      // Identificador único (UUID en producción)
  name: string;                    // Nombre completo
  email: string;                   // Correo para notificaciones
  phone: string;                   // Teléfono de contacto
  status: 'active' | 'inactive';  // Estado de membresía
  createdAt: Date;                 // Fecha de registro
}
```

**Justificación de cada campo:**

| Campo | Por qué es mínimo |
|---|---|
| `id` | Clave de dominio para referenciar desde `Booking` |
| `name` | Identificación visual en la UI |
| `email` | Canal para notificaciones y cancelaciones |
| `phone` | Canal de contacto directo |
| `status` | Permite deshabilitar clientes sin eliminarlos |
| `createdAt` | Trazabilidad de registro |

### 2.2 Relación con `Booking`

Se adopta **Opción B**: `clientId: string` obligatorio en `Booking`, eliminando `clientName` como campo propio (se deriva de `Client.name`).

```typescript
export interface Booking {
  id: string;
  clientId: string;   // referencia obligatoria a Client.id
  trainerId: string;
  date: Date;
  time: string;
  // ... resto de campos
}
```

**Por qué Opción B y no clientId opcional:**

- Integridad referencial garantizada desde el inicio
- Elimina duplicación de datos
- El modelo de dominio mapea directamente al schema de Supabase (`auth.users.id`)
- Reduce el costo de migración a Supabase en ~2 días (ver sección 4)

### 2.3 Repositorio mínimo

```typescript
export interface IClientRepository {
  getAll(): Promise<Client[]>;
  getById(id: string): Promise<Client | null>;
  getByEmail(email: string): Promise<Client | null>;
  save(client: Client): Promise<void>;
  delete(id: string): Promise<void>;
}
```

---

## 3. Plan de acción — 3 etapas

### Etapa 1 — Demo con datos de prueba (sin backend)

**Objetivo:** Flujo completo funcional en localhost con localStorage, listo para presentación.

**Archivos a modificar (impacto mínimo ~94 líneas):**

| # | Archivo | Cambio |
|---|---|---|
| 1 | `src/core/types/index.ts` | Agregar interfaz `Client` + cambiar `clientName` → `clientId` en `Booking` |
| 2 | `src/core/repositories/index.ts` | Agregar `IClientRepository` + `clients` en `IDataService` |
| 3 | `src/core/repositories/localStorage.ts` | 9 clientes seed + vincular `clientId` en cada booking |
| 4 | `src/core/models/BookingModel.ts` | Validar `clientId` en lugar de `clientName` |
| 5 | `src/core/view-models/BookingViewModel.ts` | Estado `clientId` (valor demo hardcodeado hasta que exista selector) |
| 6 | `src/components/BookingWizard.tsx` | Pasar `clientId` al crear booking |
| 7 | `src/components/trainer/TrainerAppointments.tsx` | Lookup: `clients.find(c => c.id === booking.clientId)?.name` |

**Esfuerzo:** ~4 horas
**Deuda técnica:** ninguna — el modelo queda listo para las etapas siguientes

---

### Etapa 2 — Integración con backend (issue #13)

**Objetivo:** Reemplazar `LocalStorageDataService` por `ApiDataService` sin modificar ViewModels ni componentes.

```
IDataService (interfaz — no cambia)
    ├── LocalStorageDataService  ← etapa 1 (queda como fallback)
    └── ApiDataService           ← etapa 2 (nueva implementación)
```

**Archivos nuevos:**

| Archivo | Contenido |
|---|---|
| `src/core/repositories/api.ts` | `ApiClientRepository`, `ApiBookingRepository`, `ApiTrainerRepository` usando `fetch()` |
| `src/lib/apiClient.ts` | Cliente HTTP base con headers, manejo de errores, base URL |

**Endpoints mínimos esperados:**

```
GET    /api/clients
GET    /api/clients/:id
POST   /api/clients

GET    /api/bookings
POST   /api/bookings
PATCH  /api/bookings/:id
DELETE /api/bookings/:id

GET    /api/trainers
```

**Estrategia de swap (sin cambios de código):**

```typescript
const dataService = process.env.NEXT_PUBLIC_USE_API === 'true'
  ? new ApiDataService(process.env.NEXT_PUBLIC_API_URL!)
  : new LocalStorageDataService();
```

**Esfuerzo:** ~2 días
**Prerequisito:** API disponible según issue #13

---

### Etapa 3 — Integración con Supabase + Google OAuth

**Objetivo:** Reemplazar la implementación de repositorios por acceso directo a Supabase con autenticación real.

```
IDataService
    ├── LocalStorageDataService  ← etapa 1
    ├── ApiDataService           ← etapa 2
    └── SupabaseDataService      ← etapa 3 (nueva implementación)
```

**Schema de base de datos:**

```sql
-- Extiende auth.users de Supabase
create table clients (
  id         uuid references auth.users(id) primary key,
  name       text not null,
  email      text not null,
  phone      text,
  status     text default 'active',
  created_at timestamptz default now()
);

-- Trigger: crea Client automáticamente al hacer login con Google
create function handle_new_user() returns trigger as $$
begin
  insert into clients (id, name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

**Consecuencia del trigger:** el módulo de registro de clientes se reduce al formulario de "completar perfil" (teléfono, etc.) — el alta ocurre automáticamente al autenticarse con Google. El `client.id` = `auth.uid()` de Supabase, que es el mismo `clientId` que está en `Booking` desde la etapa 1.

**RLS Policies mínimas:**

```sql
-- Clientes ven solo sus propias reservas
create policy "clients own bookings" on bookings for select
  using (client_id = auth.uid());

-- Trainers ven todas las reservas
create policy "trainers all bookings" on bookings for select
  using (exists (select 1 from trainers where id = auth.uid()));
```

**Archivos nuevos:**

| Archivo | Contenido |
|---|---|
| `src/lib/supabase.ts` | Cliente Supabase (~10 líneas) |
| `src/core/repositories/supabase.ts` | `SupabaseClientRepository`, `SupabaseBookingRepository`, `SupabaseTrainerRepository` (~250 líneas) |
| `src/hooks/useAuth.ts` | Hook de sesión: `user`, `signInWithGoogle`, `signOut` (~50 líneas) |
| `src/components/LoginButton.tsx` | Botón "Entrar con Google" (~20 líneas) |

**Esfuerzo:** ~4–5 días
**Prerequisito:** Etapas 1 y 2 completas

---

## 4. Análisis comparativo de opciones de `clientId`

| Criterio | Opción A (`clientId?` opcional) | Opción B (`clientId` obligatorio) |
|---|---|---|
| Cambios de código hoy | Mínimos (0 roturas) | ~94 líneas |
| Integridad referencial | No garantizada | Garantizada |
| Costo migración Supabase | ~6–7 días | **~4–5 días** |
| Módulo de registro futuro | Complejo | Simplificado (trigger lo maneja) |
| Deuda técnica | Alta | Ninguna |

**Decisión recomendada:** Opción B desde la etapa 1.

---

## 5. Resumen del camino crítico

```
Etapa 1 (~4h)              Etapa 2 (~2d)              Etapa 3 (~4-5d)
━━━━━━━━━━━━━━━━━━━━━━     ━━━━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━
Client entity + seed    →  ApiDataService swap      →  SupabaseDataService
localStorage               fetch() + API endpoints     Supabase + Google OAuth
Flujo demo completo        Datos reales del backend    Auth + RLS
```

**Inversión total estimada:** ~7–8 días de desarrollo, donde cada etapa es independiente y entregable por separado. Ninguna etapa requiere refactorizar las anteriores.
