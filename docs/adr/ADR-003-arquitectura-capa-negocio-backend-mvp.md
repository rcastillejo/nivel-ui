# ADR-003: Arquitectura de Capa de Negocio Backend para el MVP

**Fecha**: 2026-04-18
**Estado**: Proposed
**Autores**: rcastillejo
**Issues relacionados**: #87

---

## Contexto

El ADR-002 decidió que la infraestructura de producción será **Vercel + Supabase**. Sin embargo,
no definió *cómo se estructuran los modelos de negocio en el servidor* antes de liberar el MVP.

### Situación actual (solo frontend)

```
Browser
  └── React Components
      └── ViewModels (MobX)
          └── BookingModel / ProgramModel   ← reglas de negocio EN EL CLIENTE
              └── LocalStorageDataService
                  └── localStorage (per-device)
```

Los modelos de negocio (`BookingModel`, `ProgramModel`) corren completamente en el navegador.
Esto funciona para demo, pero presenta problemas en producción multi-usuario:

1. **Reglas de negocio bypasseables**: cualquier cliente puede modificar el JS o hacer
   llamadas directas a Supabase ignorando validaciones de capacidad, disponibilidad, etc.
2. **Datos no compartidos**: cada navegador tiene su propia copia del estado
3. **Sin autorización real**: `clientId` está hardcodeado como `'client1'` en el ViewModel
4. **Concurrencia no controlada**: dos clientes pueden reservar simultáneamente la misma
   plaza sin que el sistema lo detecte (race condition)

### Escala del MVP

| Métrica | Valor |
|---------|-------|
| Clientes | 30 |
| Entrenadores | 2 |
| Reservas/día estimadas | 30–60 |
| Concurrencia máxima | < 10 simultáneos |
| Crecimiento esperado 6 meses | < 5× |

### La pregunta central de este ADR

> ¿Dónde y cómo corren los modelos de negocio (`BookingModel`, `ProgramModel`) en producción?

---

## Decisión

Adoptamos la **Opción A: Monolito Modularizado con Next.js API Routes** como capa de
negocio backend.

Los modelos de negocio pasan a correr **exclusivamente en el servidor** (Next.js Route Handlers).
Los ViewModels dejan de instanciar los Models directamente y pasan a consumirlos vía HTTP.

### Arquitectura objetivo

```
Browser
  └── React Components
      └── ViewModels (MobX) ─── fetch('/api/bookings') ──▶ Next.js API Routes
                                                                └── BookingModel / ProgramModel
                                                                    └── SupabaseDataService
                                                                        └── Supabase (PostgreSQL)
```

### Estructura de directorios nueva

```
src/
├── app/
│   ├── api/                              ← NUEVO: capa de API
│   │   ├── bookings/
│   │   │   ├── route.ts                  GET /api/bookings, POST /api/bookings
│   │   │   ├── [id]/
│   │   │   │   └── route.ts              GET, DELETE /api/bookings/:id
│   │   │   └── capacity/
│   │   │       └── route.ts              GET /api/bookings/capacity
│   │   ├── trainers/
│   │   │   ├── route.ts                  GET /api/trainers
│   │   │   └── [id]/
│   │   │       ├── route.ts              GET /api/trainers/:id
│   │   │       └── schedule/
│   │   │           └── route.ts          GET, PUT /api/trainers/:id/schedule
│   │   └── programs/
│   │       ├── route.ts                  GET, POST /api/programs
│   │       └── [id]/
│   │           ├── route.ts              GET /api/programs/:id
│   │           ├── renew/route.ts        PUT /api/programs/:id/renew
│   │           ├── expire/route.ts       PUT /api/programs/:id/expire
│   │           └── session/route.ts      PUT /api/programs/:id/session
│   ├── login/page.tsx                    ← NUEVO: auth (ver auth.spec.md)
│   ├── client/page.tsx                   (sin cambios)
│   └── trainer/page.tsx                  (sin cambios)
├── core/
│   ├── models/                           (sin cambios)
│   ├── services/                         ← NUEVO: implementaciones de IDataService
│   │   └── SupabaseDataService.ts
│   ├── repositories/                     (sin cambios: interfaces IDataService)
│   ├── view-models/                      (se actualizan para usar fetch)
│   ├── providers/                        (se actualiza DataProvider)
│   └── types/                            (sin cambios)
└── lib/
    └── supabase/                         ← NUEVO
        ├── client.ts                     (cliente browser: createBrowserClient)
        └── server.ts                     (cliente server: createServerClient + cookies)
```

---

## Modelo de Dominio — Entidades y Contratos de API

### Entidades del dominio (sin cambios)

Los tipos de dominio existentes en `src/core/types/index.ts` se reutilizan sin modificación.

```
Booking        → /api/bookings
Program        → /api/programs
Trainer        → /api/trainers
TrainerSchedule → /api/trainers/:id/schedule
```

### Contratos de API (surface mínimo para MVP)

#### Bookings

```
GET  /api/bookings?date=YYYY-MM-DD
     Auth: client (ve solo las propias) | trainer (ve todas)
     Response: Booking[]

POST /api/bookings
     Auth: client | trainer
     Body: { trainerId, date, time, zone, duration }
     Response: 201 Booking | 409 { error, code: 'CAPACITY_EXCEEDED' }

DELETE /api/bookings/:id
     Auth: client (solo la propia) | trainer
     Response: 204

GET  /api/bookings/capacity?date=YYYY-MM-DD&time=HH:MM&trainerId=xxx
     Auth: client | trainer
     Response: { gym: number, gabinete: number }
```

#### Trainers

```
GET /api/trainers
    Auth: public (o autenticado)
    Response: Trainer[]

GET /api/trainers/:id
    Auth: public
    Response: Trainer | 404

GET  /api/trainers/:id/schedule
     Auth: public
     Response: TrainerSchedule | null

PUT  /api/trainers/:id/schedule
     Auth: trainer (solo el propio schedule)
     Body: TrainerSchedule
     Response: 200 TrainerSchedule
```

#### Programs

```
GET  /api/programs?clientId=xxx | ?trainerId=xxx
     Auth: client (solo los propios) | trainer (los propios)
     Response: Program[]

POST /api/programs
     Auth: trainer
     Body: { name, description, clientIds, startDate, endDate, totalSessions }
     Response: 201 Program | 422 { error, field }

PUT  /api/programs/:id/renew
     Auth: trainer
     Body: { newTotalSessions }
     Response: 200 Program | 404

PUT  /api/programs/:id/expire
     Auth: trainer
     Response: 200 Program | 404

PUT  /api/programs/:id/session
     Auth: client | trainer
     Response: 200 Program | 409 { error: 'No sessions remaining' }
```

### Mapeo Domain ↔ Base de Datos

```
Booking (Domain)          bookings (Supabase table)
─────────────────────     ───────────────────────────
id: string           ↔   id: uuid (PK)
clientId: string     ↔   client_id: uuid → auth.users.id
trainerId: string    ↔   trainer_id: uuid → trainers.id
trainerName: string  ↔   trainer_name: text (denormalizado)
date: Date           ↔   date: date
time: string         ↔   time_slot: text
duration: number     ↔   duration_minutes: integer
zone: ZoneType       ↔   zone: 'gym' | 'gabinete'
status: string       ↔   status: 'confirmed' | 'cancelled' | 'pending'

Program (Domain)          programs (Supabase table)
─────────────────────     ───────────────────────────
id: string           ↔   id: uuid (PK)
name: string         ↔   name: text
description: string  ↔   description: text
trainerId: string    ↔   trainer_id: uuid → trainers.id
clientIds: string[]  ↔   client_ids: uuid[] (array)
startDate: Date      ↔   start_date: date
endDate: Date        ↔   end_date: date
totalSessions: int   ↔   total_sessions: integer
usedSessions: int    ↔   used_sessions: integer
status: string       ↔   status: 'active' | 'inactive' | 'expired'
previousProgramId?   ↔   previous_program_id: uuid (nullable)
```

### Autorización por endpoint

| Endpoint | Client | Trainer |
|----------|--------|---------|
| GET /api/bookings (propias) | ✅ | ✅ (todas) |
| POST /api/bookings | ✅ | ✅ |
| DELETE /api/bookings/:id | ✅ (propia) | ✅ |
| GET /api/bookings/capacity | ✅ | ✅ |
| GET /api/trainers | ✅ | ✅ |
| PUT /api/trainers/:id/schedule | ❌ | ✅ (propio) |
| GET /api/programs (propios) | ✅ | ✅ (propios) |
| POST /api/programs | ❌ | ✅ |
| PUT /api/programs/:id/renew | ❌ | ✅ |
| PUT /api/programs/:id/expire | ❌ | ✅ |
| PUT /api/programs/:id/session | ✅ | ✅ |

---

## Opciones Evaluadas

### Opción A: Monolito Modularizado con Next.js API Routes ✅ SELECCIONADA

ViewModels llaman a API Routes HTTP (`/api/*`) que instancian los Models server-side.

**Pros**:
- **Reutiliza el capital existente**: `BookingModel` y `ProgramModel` se usan sin cambios
- **Reglas de negocio protegidas**: Las validaciones corren en el servidor; no son bypasseables
- **Un solo deploy**: Vercel despliega frontend + API juntos; costo $0 adicional
- **TypeScript compartido end-to-end**: Los tipos de dominio se comparten entre handlers y ViewModels
- **OCP respetado**: Se agrega la capa API sin modificar los Models
- **Tests sin cambios**: Los unit tests de Models siguen válidos; se agregan tests de API
- **Race conditions prevenidas**: `SupabaseDataService` usa transacciones/upsert atómico en Supabase
- **Camino de evolución**: Si el sistema escala, los Route Handlers se pueden extraer a un servicio
  separado con bajo costo de migración (los Models son agnósticos al transporte)

**Contras**:
- Los ViewModels deben cambiar de `new BookingModel()` a `fetch('/api/bookings')` — refactor moderado
- Latencia adicional: hay un hop HTTP dentro del mismo proceso en SSR (< 5 ms en Vercel edge)
- API Routes en Vercel tienen timeout de 10s (Hobby) / 60s (Pro) — suficiente para MVP

**Esfuerzo**: 🟢 Bajo-Medio (~8–11 días hábiles para MVP completo)
**Beneficio**: 🔴 Alto (datos compartidos + reglas protegidas + auth)

---

### Opción B: Modelos corriendo client-side con SupabaseDataService

Los ViewModels siguen instanciando los Models en el navegador, pero se reemplaza
`LocalStorageDataService` por `SupabaseDataService` directo al navegador.

```
Browser
  └── ViewModels → BookingModel → SupabaseDataService → Supabase (RLS protege)
```

**Pros**:
- **Mínimo refactor**: Solo se cambia el `DataService` inyectado
- **Más rápido de implementar**: 3–4 días (sin capa de API)
- **Sin cambios en ViewModels**: La arquitectura MVVM permanece igual

**Contras**:
- **Reglas de negocio bypasseables**: El código de `BookingModel` está en el bundle del cliente;
  cualquier usuario puede ignorarlo y hacer requests directos a Supabase
- **Validaciones de capacidad no garantizadas**: `BookingCapacityError` puede ser omitida
  si el cliente llama a Supabase directamente (bypasa `BookingModel.validateCapacity`)
- **Exposición de lógica de negocio**: Los algoritmos de cálculo de disponibilidad son visibles
  en el bundle del cliente
- **Clave anon de Supabase expuesta**: La `ANON_KEY` está en el browser; Supabase la asume pública
  pero las RLS deben ser perfectas — cualquier error en RLS es una vulnerabilidad directa
- **Race conditions posibles**: Dos clientes pueden leer la misma capacidad simultáneamente antes
  de que ninguno haya insertado su reserva

**Razón de rechazo**: Para 30 clientes reales pagando por el servicio, las reglas de negocio
(capacidad, disponibilidad, validaciones) deben correr en el servidor. No es aceptable que un
cliente pueda sobrepasar la capacidad de zona manipulando el cliente.

**Esfuerzo**: 🟢 Muy Bajo (3–4 días)
**Beneficio**: 🟡 Medio (datos compartidos sí; reglas protegidas no)

---

### Opción C: Next.js Server Actions + React Server Components

Usar Server Actions (`'use server'`) para mutaciones y RSC para lecturas server-side.

```
Browser
  └── <form action={createBookingAction}> → BookingModel (server-side)
                                                └── SupabaseDataService → Supabase
```

**Pros**:
- Sin API HTTP explícita: las acciones son llamadas RPC tipadas
- Menos boilerplate: no hay `fetch()`, `Response`, headers manuales
- Seguridad: el código server-side nunca llega al bundle del cliente

**Contras**:
- **Conflicto profundo con MobX**: Los ViewModels son observables client-side; Server Actions son
  invocaciones sin estado del servidor. El modelo mental es fundamentalmente diferente
- **Refactor mayor de ViewModels**: `BookingViewModel`, `ProgramViewModel`, `TrainerViewModel`
  necesitarían re-arquitecturarse para separar las llamadas server-bound
- **Debugging más complejo**: El flujo de datos es menos explícito que un API call HTTP
- **Difícil de testear**: Server Actions tienen su propio setup de testing
- **Acoplamiento a Next.js**: Migrar a otro framework en el futuro sería más costoso

**Razón de rechazo**: El esfuerzo de refactorizar los ViewModels es mayor que el de agregar API
Routes. El beneficio (menos boilerplate) no justifica el costo dado el stack MobX existente.

**Esfuerzo**: 🔴 Alto (10–14 días + riesgo de regresiones)
**Beneficio**: 🟡 Medio (mismos datos compartidos + reglas protegidas)

---

### Opción D: Microservicio separado (Node.js / NestJS / Express)

Crear un repositorio o carpeta separada con un framework de API dedicado.

```
Browser → fetch('https://api.nivel-gym.com') → Node.js / NestJS → Supabase
```

**Pros**:
- Máxima independencia: frontend y backend se despliegan por separado
- Escalado independiente
- NestJS tiene ecosistema rico (guards, pipes, swagger, interceptors)

**Contras**:
- **Sobre-ingeniería para 32 usuarios**: El overhead de dos repositorios/CI pipelines/costos no
  se justifica para la escala del MVP
- **Tipos duplicados o shared package**: Sin monorepo, los tipos de dominio deben duplicarse o
  gestionarse en un paquete npm separado
- **CORS a configurar**: En desarrollo local, dos servidores separados complican la experiencia
- **Costo adicional**: Requiere Railway/Render (~$5-15/mes) o Fly.io además de Vercel
- **Tiempo de setup**: 12–16 días vs 8–11 días de la Opción A

**Razón de rechazo**: Prematura para la escala del MVP. Los beneficios de la separación (escalado
independiente, ecosistema NestJS) no se materializan con 32 usuarios. La Opción A permite
extraer el backend en el futuro con bajo costo.

**Esfuerzo**: 🔴 Alto (12–16 días)
**Beneficio**: 🟡 Medio (innecesario para la escala actual)

---

## Resumen Esfuerzo/Beneficio

| Opción | Reglas protegidas | Datos compartidos | Race conditions | Esfuerzo | Recomendación |
|--------|:-----------------:|:-----------------:|:---------------:|----------|:-------------:|
| A — API Routes (monolito) | ✅ | ✅ | ✅ | 8–11 días | ✅ **MVP** |
| B — Client-side Supabase | ❌ | ✅ | ⚠️ parcial | 3–4 días | ❌ Inseguro |
| C — Server Actions | ✅ | ✅ | ✅ | 10–14 días | ❌ Refactor alto |
| D — Microservicio separado | ✅ | ✅ | ✅ | 12–16 días | ❌ Overkill |

---

## Consecuencias

### Positivas

- Las reglas de negocio (`BookingCapacityError`, validaciones de disponibilidad) corren
  exclusivamente en el servidor; no son manipulables por un cliente malicioso
- Los 32 usuarios comparten los mismos datos en Supabase con consistencia garantizada
- Las race conditions de capacidad se previenen usando transacciones en `SupabaseDataService`
- `BookingModel` y `ProgramModel` no cambian: su valor se preserva en servidor
- Costo $0 adicional (API Routes en Vercel están incluidas en el Free tier)
- Los errores de dominio (`BookingCapacityError`, etc.) se traducen a HTTP status codes
  semánticos (409 Conflict) — el ViewModel los mapea a mensajes de UI sin cambiar

### Negativas / Trade-offs

- **Refactor de ViewModels**: `BookingViewModel`, `ProgramViewModel` y `TrainerViewModel`
  cambian de instanciar Models directamente a llamar API Routes vía `fetch`. Estimado: 1–2 días
- **Latencia adicional vs Opción B**: Hay un hop HTTP incluso en SSR. Para la escala del MVP
  es imperceptible (< 20 ms en Vercel edge)
- **Hidratación MobX**: El estado inicial del ViewModel debe cargarse desde la API en `initialize()`;
  no hay cambio de paradigma, pero requiere atención

### Neutras

- `LocalStorageDataService` se conserva para desarrollo local sin conexión a Supabase
- Los tests unitarios de Models y ViewModels no cambian (mockean `IDataService` o `fetch`)
- La arquitectura MVVM + Clean Architecture no cambia; solo el *transporte* de datos cambia

---

## Notas de Implementación

### Plan por fases (orden recomendado)

| Fase | Entregable | Spec | Esfuerzo |
|------|-----------|------|---------|
| 1 | Supabase schema + RLS | `supabase-schema.spec.md` | 1 día |
| 2 | `SupabaseDataService implements IDataService` | `supabase-data-service.spec.md` | 2 días |
| 3 | API Routes: `/api/bookings`, `/api/trainers` | este ADR | 2 días |
| 4 | API Routes: `/api/programs` | este ADR | 1 día |
| 5 | Auth: `AuthViewModel`, middleware, `/login` | `auth.spec.md` | 2 días |
| 6 | Actualizar ViewModels a usar API Routes | este ADR | 1–2 días |
| 7 | Tests de integración + E2E críticos | CLAUDE.md §7 | 2 días |
| 8 | Vercel deployment + env vars | `vercel-deployment.spec.md` | 0.5 día |
| **Total** | | | **~11.5 días hábiles** |

### Patrón de implementación para un API Route

```typescript
// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BookingModel } from '@/core/models/BookingModel';
import { SupabaseDataService } from '@/core/services/SupabaseDataService';
import { BookingCapacityError } from '@/core/types/errors';
import { getAuthUser } from '@/lib/supabase/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const dataService = new SupabaseDataService();
  const model = new BookingModel(dataService);

  try {
    const booking = await model.createBooking({
      ...body,
      clientId: user.id, // siempre del token autenticado, nunca del body
    });
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof BookingCapacityError) {
      return NextResponse.json(
        { error: error.message, code: 'CAPACITY_EXCEEDED' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Actualización de ViewModels

```typescript
// BookingViewModel.ts — createBooking() refactorizado
async createBooking(): Promise<void> {
  this.isLoading = true;
  this.error = null;
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trainerId: this.selectedTrainer!.id,
        date: this.selectedDate!.toISOString(),
        time: this.selectedTime!,
        zone: this.selectedZone!,
        duration: 60,
      }),
    });
    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(error);
    }
    const booking: Booking = await response.json();
    this.openSuccessModal(booking);
  } catch (error) {
    this.error = error instanceof Error ? error.message : 'Error al crear la reserva';
  } finally {
    this.isLoading = false;
  }
}
```

### Regla de seguridad crítica

> **El `clientId` en un POST nunca se toma del body del request.**
> Siempre se extrae del token autenticado (Supabase Auth) en el servidor.
> Si se tomara del body, cualquier cliente podría suplantar a otro usuario.

### Spec a crear para este ADR

Este ADR require una spec nueva que documente los contratos detallados de cada Route Handler:

```
docs/specs/api-routes.spec.md   ← Nueva spec derivada de este ADR
```

---

## Referencias

- [ADR-001](ADR-001-spec-driven-development.md) — Metodología SDD
- [ADR-002](ADR-002-produccion-mvp-deployment.md) — Vercel + Supabase (infraestructura)
- [specs/supabase-schema.spec.md](../specs/supabase-schema.spec.md) — Modelo de datos + RLS
- [specs/supabase-data-service.spec.md](../specs/supabase-data-service.spec.md) — SupabaseDataService
- [specs/auth.spec.md](../specs/auth.spec.md) — Flujo de autenticación
- [specs/vercel-deployment.spec.md](../specs/vercel-deployment.spec.md) — Configuración Vercel
