# Plan: Mis citas — Cancelar cita (Hito 2)

**Source PRD**: `.claude/prds/mis-citas-cliente.prd.md`
**Selected Milestone**: 2 — Cancelar cita
**Complexity**: Medium

## Summary
El cliente cancela una cita futura desde `/client/citas`, respetando la anticipación mínima (1 h gym, 24 h gabinete) y **recuperando la sesión de su programa**. La regla se garantiza **en un backend** (Next.js Route Handler en Vercel), no en la BD: usa la hora del servidor y la zona horaria del cliente, y reutiliza `BookingModel`/`ProgramModel` en TypeScript. El navegador deja de hacer el `UPDATE` directo. Reprogramar queda para el hito 3.

## Decisiones
| # | Tema | Decisión |
|---|---|---|
| D1 | Medición del plazo | Contra el inicio de la cita; el límite exacto se permite (pendiente de confirmar) |
| D2 | Reloj y zona horaria | **Servidor**: `now` lo toma el servidor. Zona horaria: la del **cliente** (IANA, enviada por el navegador y validada) para convertir `date + time_slot` a instante UTC |
| D3 | Sesión del programa | **Se devuelve al cancelar** (decidido por el usuario). Ver "Devolución de sesión" |
| D4 | Qué es cancelar | Misma fila con `status = 'cancelled'` (rastro en Historial) |
| D5 | Fuera de plazo | Rechazo con error de dominio (HTTP 409/422); la UI oculta el botón y explica el motivo |
| D6 | Aviso al entrenador | No por ahora (decidido por el usuario) |
| D7 | Garantía en servidor | **Sí, en backend** (decidido por el usuario), no en RPC/trigger de la BD |

## Hallazgos del repo (base de D3 y D7)
- Funciones en Supabase hoy: solo `get_my_role()`, `handle_new_user()` y el trigger `guard_client_program_update` (`supabase/migrations/`). No hay RPC (`.rpc`), Edge Functions (`supabase/functions` no existe) ni rutas `/api`; el navegador habla directo con Supabase bajo RLS.
- `guard_client_program_update` solo deja a un cliente hacer `used_sessions + 1`. **Devolver una sesión (`- 1`) hoy falla** con RLS/trigger. Aflojar el trigger dejaría a cualquier cliente restar sesiones sin cancelar nada; por eso la devolución debe hacerla el backend con service role.
- Hoy `bookings` guarda `date` (DATE) + `time_slot` (TEXT) sin zona horaria, y `created_at` (TIMESTAMPTZ).
- La reserva no registra si consumió una sesión (`consumeSessionForClient` puede devolver `null`).

## Alternativas evaluadas para D7
| Opción | Lógica de negocio | Coste | Veredicto |
|---|---|---|---|
| **A. Next.js Route Handler** `POST /api/bookings/[id]/cancel` | En TS, reutilizando `BookingModel`/`ProgramModel` con un `IDataService` de servidor | Nueva variable secreta `SUPABASE_SERVICE_ROLE_KEY` en Vercel; sin migración | **Recomendada**: una sola implementación, mismo despliegue |
| B. Supabase Edge Function (Deno) | Duplicada o reescrita para Deno (no puede importar `src/`) | Infra nueva (`supabase/functions`, deploy aparte) | Solo si algún día se sale de Next/Vercel |
| C. RPC / trigger en Postgres | En SQL | Migración + test contra Postgres real | Descartada por el usuario (lógica en BD) |

## Devolución de sesión
- Nuevo `ProgramModel.restoreSessionForClient(clientId)`: devuelve 1 sesión al programa activo si `usedSessions > 0`; sin programa activo no es error (igual que `consumeSessionForClient`).
- Anti-abuso sin cambiar esquema: solo se devuelve si el programa activo existía al reservar (`program.created_at <= booking.created_at`). Limitación conocida: si la reserva se hizo con el programa agotado y no consumió sesión, la devolución daría una gratis. Cierre definitivo: columna `bookings.program_id` (ver pendientes).
- Idempotencia: el backend cancela con `UPDATE ... WHERE id = $1 AND status = 'confirmed'` y solo devuelve la sesión si afectó 1 fila; así un doble clic no devuelve dos veces.
- Sin transacción entre dos tablas con supabase-js: si falla la devolución tras cancelar, se registra el error y se informa al usuario (reintento manual por el entrenador). Riesgo aceptado.

## Pendientes de decisión
1. **Timestamp UTC en `bookings` (`starts_at TIMESTAMPTZ`)**, que el usuario pidió. Calcularlo en servidor al reservar exige mover también la **creación** de reservas al backend (`POST /api/bookings`), porque hoy el navegador inserta directo. Opciones:
   - **A (completa)**: migración `starts_at` + backfill + endpoint de crear + cancelar. Cierra la zona horaria de raíz y permite guardar `program_id`. Más alcance.
   - **B (mínima)**: solo el endpoint de cancelar; el instante se calcula con `date + time_slot` en la zona del cliente enviada en la petición. `starts_at` pasa al hito 3 (reprogramar).
2. Si es A: zona horaria para el backfill de las reservas existentes (producto aún sin producción).
3. Riesgo de zona horaria: `time_slot` es la hora local del gimnasio; si el cliente viaja y reserva con otra zona, el instante saldría desfasado. Mitigación posible: guardar la zona usada al reservar.
4. Que el usuario cree `SUPABASE_SERVICE_ROLE_KEY` (secreto) en Vercel y en `.env.local`; no se guarda en el repo.

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Model + reloj inyectado | `src/core/models/BookingModel.ts:38` (`getClientAppointments(clientId, now)`) | Método público con `now: Date` inyectado, validación primero, `BookingValidationError` |
| Helpers de fecha | `src/core/models/BookingModel.ts:114-123` (`getBookingStart/End`) | Reutilizar `getBookingStart` para calcular el plazo |
| Errores de dominio | `src/core/types/errors.ts:10-26` | Clase `...Error extends Error` con `name`; datos útiles como props públicas |
| ViewModel | `src/core/view-models/ClientAppointmentsViewModel.ts:30-51` | `isLoading/error`, `runInAction`, `error instanceof Error ? message : fallback`, `now` inyectado |
| Persistencia | `IBookingRepository.getById/update` (`src/core/repositories/index.ts`); `SupabaseDataService.ts:251`, `localStorage.ts:335` | `update(id, { status: 'cancelled' })` ya mapeado en ambos repos |
| RLS | `supabase/migrations/20260101000001_rls_policies.sql:128` | `bookings: client cancel` permite al dueño pasar a `cancelled` |
| Vista | `src/components/client/ClientAppointmentsView.tsx` | `observer`, `data-testid`, estados loading/error/vacío |
| Tests | `tests/unit/core/view-models/ClientAppointmentsViewModel.test.ts`, `tests/integration/BookingFlow.integration.test.ts:432` | Vitest, Model mockeado en VM, `LocalStorageDataService` real en integración, `fixedNow` |
| E2E | `e2e/trainer-programs-flow.spec.ts` | Playwright (único spec existente; no hay e2e del flujo cliente) |

## Files to Change
Base común (aplica a las opciones A y B de "Pendientes"). Con la opción A se añaden la migración `starts_at`, su backfill y `POST /api/bookings`.

| File | Action | Why |
|---|---|---|
| `docs/specs/client-appointments-cancel.spec.md` | CREATE | SDD: Gherkin, contratos, D1–D7 y criterios (copiar `TEMPLATE.spec.md`) |
| `.claude/prds/mis-citas-cliente.prd.md` | UPDATE | Hito 2 → `complete` al final; registrar D3/D6/D7 en Open Questions |
| `src/core/types/index.ts` | UPDATE | `CANCELLATION_NOTICE_MINUTES` (gym 60, gabinete 1440); tipos de petición/respuesta del endpoint |
| `src/core/types/errors.ts` | UPDATE | `BookingNotFoundError`, `BookingCancellationNoticeError(zone, minNoticeMinutes)` |
| `src/core/models/BookingModel.ts` | UPDATE | `cancelBooking(bookingId, clientId, now, timeZone)` y `canCancel` puro; `getBookingStart` pasa a aceptar zona (hoy usa hora local) |
| `src/core/models/ProgramModel.ts` | UPDATE | `restoreSessionForClient(clientId, bookedAt)` |
| `src/app/api/bookings/[id]/cancel/route.ts` | CREATE | Route Handler: valida JWT del usuario, toma `now` del servidor, llama al Model y traduce errores de dominio a HTTP |
| `src/core/services/ServerDataService.ts` | CREATE | `IDataService` de servidor (service role) reutilizando los repositorios Supabase existentes; sin tocar el Model |
| `src/core/repositories/index.ts` | UPDATE | Nueva interfaz pequeña `IBookingCancellationGateway` (cliente → endpoint), sin ampliar `IBookingRepository` (ISP) |
| `src/core/services/HttpBookingCancellationGateway.ts` | CREATE | Llama al endpoint con el token y la zona horaria del navegador; en modo local, implementación con `LocalStorageDataService` |
| `src/core/view-models/ClientAppointmentsViewModel.ts` | UPDATE | `cancelBooking(id)`, `cancellingId`, `canCancel` (pista de UI), error string, recarga |
| `src/components/client/ClientAppointmentsView.tsx` | UPDATE | Botón "Cancelar" solo en próximas y mensaje de plazo |
| `src/components/client/CancelAppointmentDialog.tsx` | CREATE | Confirmación (mirar `ConfirmationModal.tsx`) |
| `supabase/migrations/…_bookings_client_cancel_via_backend.sql` | CREATE | Quitar la policy `bookings: client cancel` para que el cliente ya no pueda cancelar por la API directa (cierra la evasión del plazo). Se aplica **después** de desplegar el endpoint |
| `tests/unit/...` (Model, ProgramModel, VM, componente, route handler) | UPDATE/CREATE | Ver Tasks |
| `tests/integration/BookingFlow.integration.test.ts` | UPDATE | Cancelar + devolver sesión con `LocalStorageDataService` real |
| `e2e/client-appointments.spec.ts` | CREATE | Solo si hay modo autenticable (ver Riesgos) |

## Tasks
### Task 1: Spec (SDD)
- **Action**: Crear la spec con Gherkin: cancelar OK y devuelve sesión; gym a <1 h bloqueado; gabinete a <24 h bloqueado; límite exacto; cita pasada; ya cancelada; cita ajena; sin programa activo; zona horaria del cliente distinta de UTC; doble clic.
- **Validate**: confirmación del usuario de los pendientes 1–4 antes de seguir.

### Task 2: Tipos, errores y zona horaria
- **Action**: Constantes y errores; helper puro para convertir `date + time_slot` + IANA a instante (usar `date-fns-tz` o `Temporal`/`Intl`; evaluar dependencia nueva antes de agregarla). Validar el nombre IANA recibido.
- **Validate**: `npx tsc --noEmit`

### Task 3: Models (TDD: tests primero)
- **Action**: `BookingModel.cancelBooking`: validar ids → `getById` (inexistente o ajena → `BookingNotFoundError`) → ya cancelada/terminada → `BookingValidationError` → plazo por zona con `now` y zona recibidos → `update` condicional → devolver cita. `ProgramModel.restoreSessionForClient` con la regla anti-abuso.
- **Mirror**: `getClientAppointments`, `consumeSessionForClient`
- **Validate**: `npx vitest run tests/unit/core/models`

### Task 4: Backend (Route Handler)
- **Action**: Verificar el JWT del usuario con Supabase, usar service role solo para escribir, `now = new Date()` del servidor, mapear errores (401 sin sesión, 404 ajena/inexistente, 409 fuera de plazo o ya cancelada). Devolución de sesión solo si el `UPDATE` afectó 1 fila.
- **Validate**: tests unitarios del handler con `IDataService` falso; `npm run build`

### Task 5: Cliente (gateway, ViewModel, componentes)
- **Action**: Gateway HTTP, `cancelBooking` en el ViewModel (el error del backend se traduce a `string`), botón y diálogo. Sin lógica de plazo en componentes.
- **Validate**: `npx vitest run tests/unit/core/view-models tests/unit/components`

### Task 6: Integración, E2E y cierre de la vía directa
- **Action**: Integración Model→`LocalStorageDataService`. Desplegar el endpoint y **después** aplicar la migración que quita `bookings: client cancel` (aplicarla requiere tu aprobación).
- **Validate**: `npx vitest run tests/integration`; `npx playwright test e2e/client-appointments.spec.ts --trace off` si aplica

### Task 7: Cierre
- **Action**: Spec a `implemented`, PRD hito 2 a `complete`.
- **Validate**: bloque Validation completo.

## Validation
```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Falta `SUPABASE_SERVICE_ROLE_KEY` en Vercel/entorno local | High | Pendiente 4; el endpoint falla cerrado (500) sin la clave |
| Cancelar y devolver sesión no son atómicos | Medium | `UPDATE` condicional (idempotente) + log del fallo de devolución; riesgo aceptado |
| Devolución de sesión gratis si la reserva no consumió (programa agotado) | Low | Regla `program.created_at <= booking.created_at`; cierre definitivo con `bookings.program_id` |
| Zona horaria del cliente distinta de la del gimnasio al reservar | Medium | Pendiente 3; validar IANA y guardar la zona usada al reservar |
| Quitar `bookings: client cancel` antes de desplegar el endpoint rompe la cancelación | Medium | Orden estricto: desplegar endpoint → verificar → migración |
| Modo local (sin Google ni backend) no puede usar el endpoint | High | Gateway alternativo con `LocalStorageDataService`; la garantía de servidor solo aplica con backend real |
| E2E difícil sin Google real | High | Cobertura con handler + integración + componente; anotarlo en la spec |
| `date-fns-tz` es una dependencia nueva | Low | Evaluar `Intl` nativo primero |

## Acceptance
- [ ] Pendientes 1–4 resueltos por el usuario
- [ ] Spec creada y en `implemented`
- [ ] Un cliente no puede cancelar fuera de plazo ni llamando a la API de Supabase directamente
- [ ] Cancelar devuelve la sesión del programa una sola vez
- [ ] `lint`, `tsc`, `vitest` y `build` pasan
- [ ] Sin `any`; lógica de negocio solo en Models; dependencias inyectadas
