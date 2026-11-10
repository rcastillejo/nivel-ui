# Plan: Mis citas — Cancelar cita (Hito 2)

**Source PRD**: `.claude/prds/mis-citas-cliente.prd.md`
**Selected Milestone**: 2 — Cancelar cita
**Complexity**: Medium

## Summary
El cliente cancela una cita futura desde `/client/citas`, respetando la anticipación mínima (1 h gym, 24 h gabinete) y **recuperando la sesión de su programa**. La regla de negocio se garantiza en el **backend**, como una **Supabase Edge Function** (TypeScript/Deno) que reutiliza `BookingModel` y `ProgramModel`; no hay lógica en la BD ni en Next.js. Las reservas guardan un instante UTC (`starts_at`) calculado **en el servidor**, así cancelar solo compara `starts_at` con el `now()` del servidor. Para eso, la **creación** de reservas también pasa por la Edge Function. Reprogramar queda para el hito 3.

## Decisiones
| # | Tema | Decisión |
|---|---|---|
| D1 | Medición del plazo | Contra `starts_at` (inicio de la cita); el límite exacto se permite |
| D2 | Reloj y zona horaria | `now` del servidor. La zona IANA **del cliente** se envía solo al **reservar** para convertir `date + time_slot` a UTC; al cancelar ya no hace falta |
| D3 | Sesión del programa | Se devuelve al cancelar (decidido). Usa `bookings.program_id`, registrado al reservar |
| D4 | Qué es cancelar | Misma fila con `status = 'cancelled'` |
| D5 | Fuera de plazo | Error de dominio (HTTP 409); la UI oculta el botón y explica el motivo |
| D6 | Aviso al entrenador | No por ahora (decidido) |
| D7 | Garantía en servidor | **Edge Function** (decidido): ni Next.js ni RPC/trigger en la BD |
| D8 | `starts_at` UTC | **Opción A** (decidido): columna `TIMESTAMPTZ`, calculada en servidor al reservar |
| D9 | Backfill | Zona horaria **del servidor de BD = UTC** (verificada: `current_setting('TimeZone') = 'UTC'`) |

## Hallazgos (repo y proyecto Supabase `nivel-gym2026`)
- Mismas cinco tablas que el esquema del repo (`user_profiles`, `trainers`, `trainer_schedules`, `bookings`, `programs`). El repo no declara el ref del proyecto; se identificó por nombre y esquema, hay que confirmarlo.
- **Edge Functions: ninguna** (`supabase/functions` no existe, tampoco en remoto). Funciones SQL: solo `get_my_role()`, `handle_new_user()` y el trigger `guard_client_program_update`. Nadie usa `.rpc()`.
- `bookings` tiene 52 filas, **todas confirmadas y en el pasado**: el backfill no afecta a ninguna cita cancelable.
- Zona horaria del servidor de BD: **UTC**.
- `guard_client_program_update` solo deja a un cliente hacer `used_sessions + 1`; devolver una sesión falla con RLS/trigger. La Edge Function lo hace con service role, que Supabase inyecta en el runtime (**no hay que crear ningún secreto**).
- Con service role el backend ve todas las reservas: el aforo se cuenta sin el límite de RLS (parte de #182). La inconsistencia gym global vs por entrenador sigue fuera de alcance.
- Las Edge Functions recomiendan "fat functions" y código compartido en `supabase/functions/_shared` (docs: *Development tips*).

## Alternativas evaluadas para D7
| Opción | Veredicto |
|---|---|
| **Edge Function de Supabase** | **Elegida.** Corre junto a la BD, recibe el service role sin configurar secretos |
| Next.js Route Handler | Descartada por el usuario |
| RPC / trigger en Postgres | Descartada por el usuario (lógica en BD) |

## Resultado del spike (Task 0, hecho)
Probado con `supabase start` y `supabase functions serve` (CLI 3.1.0, Edge Runtime 1.78.1, Deno 2.1.4):
- **Sí se puede** importar `src/core/...` desde la función: el runtime monta el proyecto completo. Las 5 migraciones existentes se aplican bien en local.
- **El runtime no resuelve imports sin extensión** (`'../types'`). Solución elegida: `.ts` explícito en los imports alcanzables desde la función + `allowImportingTsExtensions` en `tsconfig.json` (`noEmit` ya está activo). Es un cambio mecánico y amplio en `src/core`.
- `date-fns` y `@supabase/supabase-js` van en `supabase/functions/bookings/deno.json`; `--import-map` no se aplicó.
- Limitación del sandbox: el contenedor del runtime no puede bajar paquetes de npm (CA del proxy). La prueba de punta a punta de la función no se puede hacer aquí; el handler se prueba con Vitest.
- `supabase/config.toml` se actualizó para el CLI 3.1.0.
- Sin verificar: que `functions deploy` empaquete archivos fuera de `supabase/functions/` (se comprueba al primer despliegue; fallback `_shared`).

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
| File | Action | Why |
|---|---|---|
| `docs/specs/client-appointments-cancel.spec.md` | CREATE | SDD: Gherkin, contratos, D1–D9 |
| `.claude/prds/mis-citas-cliente.prd.md` | UPDATE | Registrar decisiones; hito 2 → `complete` al final |
| `supabase/migrations/…_bookings_starts_at.sql` | CREATE | `starts_at TIMESTAMPTZ`, `client_timezone TEXT`, `program_id UUID REFERENCES programs ON DELETE SET NULL`. Backfill `starts_at = (date + time_slot::time) AT TIME ZONE 'UTC'`; luego `starts_at NOT NULL` |
| `supabase/migrations/…_bookings_close_direct_writes.sql` | CREATE | Quita las policies `bookings: client insert` y `bookings: client cancel` (solo la Edge Function escribe). Se aplica **después** de desplegar la función |
| `supabase/functions/bookings/index.ts` | CREATE | Fat function: `POST` con `action: 'create' \| 'cancel'`; valida JWT, rol y zona IANA; `now` del servidor; mapea errores de dominio a HTTP |
| `supabase/functions/import_map.json`, `supabase/config.toml` | CREATE/UPDATE | Import map (`date-fns`) y `[functions.bookings]` con `verify_jwt = true` |
| `src/core/types/index.ts` | UPDATE | `Booking.startsAt`, `programId`; `CANCELLATION_NOTICE_MINUTES`; tipos de petición/respuesta |
| `src/core/types/errors.ts` | UPDATE | `BookingNotFoundError`, `BookingCancellationNoticeError`, `InvalidTimeZoneError` |
| `src/core/mappers/BookingMapper.ts` | UPDATE | Mapear `starts_at`, `client_timezone`, `program_id` |
| `src/core/models/BookingModel.ts` | UPDATE | `createBooking(..., now, timeZone)` calcula `startsAt` UTC; `cancelBooking(id, clientId, now)`; `canCancel(booking, now)` puro |
| `src/core/models/ProgramModel.ts` | UPDATE | `restoreSession(programId)` (idempotente por el `UPDATE` condicional del cancel) |
| `src/core/repositories/index.ts` | UPDATE | Interfaz pequeña `IBookingCommands { create; cancel }` (ISP); `IBookingRepository` sin cambios |
| `src/core/services/EdgeFunctionBookingCommands.ts` | CREATE | Llama a `supabase.functions.invoke('bookings')`, envía la zona IANA del navegador |
| `src/core/services/LocalBookingCommands.ts` | CREATE | Modo local: mismo contrato con `BookingModel`/`ProgramModel` y `LocalStorageDataService` |
| `src/core/view-models/BookingViewModel.ts` | UPDATE | Reservar vía `IBookingCommands` (la sesión se consume en el servidor) |
| `src/core/view-models/ClientAppointmentsViewModel.ts` | UPDATE | `cancelBooking`, `cancellingId`, `canCancel`, error string, recarga |
| `src/components/client/ClientAppointmentsView.tsx`, `CancelAppointmentDialog.tsx` | UPDATE/CREATE | Botón y confirmación; sin lógica de plazo |
| `tests/unit/...`, `tests/integration/BookingFlow.integration.test.ts`, `e2e/client-appointments.spec.ts` | UPDATE/CREATE | Ver Tasks |

## Tasks
### Task 0: Spike de bundling (HECHO, ver resultado arriba)
- **Action**: Función mínima que importe `BookingModel` desde `src/core` y se ejecute con `supabase functions serve`. Decidir entre import relativo o `_shared`.
- **Validate**: la función responde localmente y `deno check` pasa. **Sin esto no se sigue.**

### Task 1: Spec (SDD)
- **Action**: Gherkin: cancelar OK + sesión devuelta; gym <1 h y gabinete <24 h bloqueados; límite exacto; ya cancelada; cita ajena; sin `program_id` (sin devolución, sin error); reserva en zona IANA distinta de UTC; zona inválida; doble clic; token ausente.
- **Validate**: revisión del usuario.

### Task 2: Migración `starts_at` + tipos y mapper (TDD)
- **Action**: Migración en rama/entorno de pruebas primero; tipos, errores y `BookingMapper`.
- **Validate**: `npx tsc --noEmit`; `npx vitest run tests/unit/core/mappers`

### Task 3: Models (TDD: tests primero)
- **Action**: Conversión `date + time_slot + IANA → UTC` (`Intl`, sin dependencia nueva si basta); `createBooking` con `startsAt` y `programId` (consumir sesión); `cancelBooking` (ids → `getById` → ajena = `BookingNotFoundError` → ya cancelada → plazo contra `startsAt` y `now` → `UPDATE ... WHERE status='confirmed'`); `ProgramModel.restoreSession` solo si el `UPDATE` afectó 1 fila.
- **Mirror**: `getClientAppointments`, `consumeSessionForClient`
- **Validate**: `npx vitest run tests/unit/core/models`

### Task 4: Edge Function
- **Action**: Handler como función pura sobre un `IDataService` inyectado (testeable con Vitest); `index.ts` solo cablea Supabase y HTTP. Errores: 401 sin sesión, 403 rol incorrecto, 404 ajena, 409 plazo/ya cancelada, 422 zona inválida.
- **Validate**: tests del handler; `supabase functions serve` + `curl`

### Task 5: Cliente (gateway, ViewModels, componentes)
- **Action**: `IBookingCommands` + implementaciones Edge/local; `BookingViewModel` y `ClientAppointmentsViewModel`; botón y diálogo.
- **Validate**: `npx vitest run tests/unit/core/view-models tests/unit/components`

### Task 6: Despliegue y cierre de la vía directa
- **Action**: Desplegar la función (requiere tu aprobación), verificar reservar y cancelar de punta a punta, **y después** aplicar la migración que quita las policies de escritura directa del cliente. Evaluar quitar `programs: client consume own session` y su trigger (ya no los usa el cliente).
- **Validate**: reservar/cancelar con una cuenta de prueba; intentar `UPDATE` directo y comprobar que falla

### Task 7: Integración, E2E y cierre
- **Action**: Integración Model→`LocalStorageDataService`; E2E si hay modo autenticable; spec a `implemented`; PRD hito 2 a `complete`.
- **Validate**: bloque Validation completo.

## Validation
```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
supabase functions serve bookings
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| El bundler de Edge Functions no admite importar `src/core` | Medium | Task 0 (spike) antes de todo; fallback `_shared` |
| Mover la creación al backend cambia el flujo de reserva ya en uso | High | Despliegue en dos pasos; modo local con el mismo contrato; tests de integración del flujo existente |
| Quitar las policies antes de desplegar la función rompe reservar y cancelar | Medium | Orden estricto: función → verificación → migración |
| Reservas hechas con otra zona horaria del cliente quedan desfasadas | Medium | Se guarda `client_timezone`; `time_slot` se interpreta en la zona enviada; validar IANA |
| Backfill en UTC no coincide con la hora local real | Low | Las 52 filas son pasadas; no afecta cancelación |
| Reservar, consumir sesión y guardar `program_id` no son atómicos | Medium | Orden: crear → consumir → actualizar `program_id`; compensar con log si falla |
| Cold start de la Edge Function aumenta la latencia al reservar | Low | Medir; si molesta, mantener caliente o revisar |
| Probar contra el proyecto remoto sin entorno aislado | Medium | Usar una rama de Supabase (`create_branch`, requiere tu aprobación) o `supabase start` |
| Modo local no ejerce la garantía de servidor | High | Declararlo en la spec; la regla del plazo vive igual en `BookingModel` |

## Acceptance
- [ ] Spike superado y decisión de empaquetado registrada
- [ ] Un cliente no puede reservar ni cancelar fuera de reglas llamando a Supabase directamente
- [ ] `bookings.starts_at` se guarda en UTC, calculado por el servidor
- [ ] Cancelar devuelve la sesión del programa una sola vez
- [ ] Spec en `implemented`; `lint`, `tsc`, `vitest` y `build` pasan
- [ ] Sin `any`; lógica de negocio solo en Models; dependencias inyectadas
