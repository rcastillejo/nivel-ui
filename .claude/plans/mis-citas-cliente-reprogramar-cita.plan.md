# Plan: Mis citas — Reprogramar cita (Hito 3)

**Source PRD**: `.claude/prds/mis-citas-cliente.prd.md`
**Selected Milestone**: 3 — Reprogramar cita
**Complexity**: Medium (backend pequeño por reutilizar reservar/cancelar; la mayor parte del esfuerzo es la pantalla)
**Estado**: PROPUESTA — las decisiones D1–D8 son recomendaciones y esperan confirmación antes de escribir código

## Summary
El cliente mueve una cita futura a otra fecha, horario, entrenador y/o zona desde `/client/citas`. Se reutiliza el patrón del hito 2: la regla de negocio vive en `BookingModel`/`BookingCommandsModel` y se ejecuta en la Edge Function `bookings` con una nueva acción `reschedule`; el cliente sale del token y el reloj es el del servidor. **No requiere migración**: `starts_at`, `client_timezone` y `program_id` ya existen y el índice único parcial ya protege contra duplicados. Reprogramar modifica la misma reserva en una sola operación atómica y no toca la sesión del programa.

## Decisiones propuestas (confirmar antes de implementar)
| # | Tema | Propuesta | Alternativa descartada |
|---|---|---|---|
| D1 | ¿Misma reserva o nueva? | **Misma fila**: se actualizan `trainer_id`, `trainer_name`, `date`, `time_slot`, `zone`, `starts_at` y `client_timezone` con un único `UPDATE` condicional. Es atómico y conserva `id` y `program_id` | Crear una nueva y cancelar la original: deja rastro pero son dos filas, no es atómico y complica la sesión |
| D2 | Anticipación | Se mide **solo contra la cita original** (1 h gym / 24 h gabinete, igual que cancelar). El nuevo horario solo debe estar en el futuro, como al reservar hoy | Exigir también el plazo del nuevo hueco: más estricto que reservar directamente |
| D3 | Sesión del programa | **No cambia**: la sesión ya consumida pasa a la nueva fecha. `program_id` se conserva y no se llama a consumir ni a devolver | Devolver y consumir otra: solo tiene sentido con una reserva nueva |
| D4 | Alcance | Cualquier fecha futura, entrenador y zona con cupo; **sin límite** de reprogramaciones por cita | Tope por cita (exige un contador en la tabla) o solo el mismo día |
| D5 | Rastro de la cita original | **Ninguno** en este hito (consecuencia de D1). Si se quiere auditoría, es un hito aparte con migración | — |
| D6 | Mover a la misma fecha, hora, entrenador y zona | Se rechaza con `BookingValidationError` ("Elige un horario distinto al actual") | Aceptarlo como no-op |
| D7 | Aviso al entrenador | Ninguno (PRD: sin notificaciones en el MVP). Si se mueve a otro entrenador, la cita desaparece sola de la vista del anterior (filtra por entrenador, #211) | — |
| D8 | Mensaje del plazo | Error propio `BookingRescheduleNoticeError` ("Solo puedes reprogramar… con al menos X de anticipación"). El de cancelar dice "cancelar" y confundiría | Reutilizar `BookingCancellationNoticeError` |

## Hallazgos del código (grounding)
- `createBooking` valida duplicados, capacidad y disponibilidad **contando las reservas del propio cliente**. Al mover una cita hay que **excluir la que se está moviendo**, o el cliente chocaría consigo mismo (p. ej. cambiar solo de zona en el mismo horario, o un hueco justo al límite de 10).
- El índice `uq_bookings_client_slot_confirmed (client_id, date, time_slot) WHERE status='confirmed'` también se dispara en un `UPDATE`. Hoy solo `create` traduce `23505` a `BookingDuplicateError`; `update` no.
- `BookingRepository.update` hace un `UPDATE ... WHERE id` **sin condición de estado**: no sirve para esta operación, porque una cita cancelada entre medias se "resucitaría" con los datos nuevos. Hace falta un método condicional como `cancelIfConfirmed`.
- `TimeSelectionView` (`BookingView.tsx:176-209`) es presentacional (solo props), así que se puede extraer y reutilizar sin tocar su comportamiento.
- Aforo: el conteo concurrente sigue sin ser atómico (#178/#182); reprogramar hereda esa limitación igual que reservar. Aceptado en el PRD.
- Sin migraciones: el despliegue es solo función + app. Como el workflow de la función corre `Validate` antes de desplegar y Vercel despliega por separado, una app que llame a `reschedule` antes de que la función lo conozca recibiría 422 "Comando inválido". Por eso se parte en **2 PRs: backend primero, pantalla después**.

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Caso de uso en el Model | `src/core/models/BookingModel.ts:91-121` (`cancelBooking`) | Orden: cliente requerido → `getById` → ajena = `BookingNotFoundError` → ya cancelada → ya terminó → plazo → operación atómica → si no cambió, `BookingAlreadyCancelledError` |
| Validaciones de reserva | `BookingModel.ts:24-38`, `:241-279` | `validateBooking`, `checkAvailability`, `validateNoDuplicate`, `validateCapacity`: reutilizar añadiendo `ignoreBookingId` opcional |
| Plazo | `BookingModel.ts:187-190` (`hasEnoughNotice`) y `CANCELLATION_NOTICE_MINUTES` (`types/index.ts:80`) | Mismos valores para cancelar y reprogramar; se reutiliza la constante |
| Orquestación | `src/core/models/BookingCommandsModel.ts:32-78` | Validar zona IANA y formatos, resolver entrenador, calcular `startsAt` con `zonedDateTimeToUtc`; el cliente viene de la sesión |
| Errores de dominio | `src/core/types/errors.ts:38-48` | Clase `...Error extends Error` con `name` y datos como props públicas |
| Handler HTTP | `src/server/bookingsHandler.ts:54-76`, `:83-103`, `:133-146` | `parseCommand` por acción, `toErrorResponse` (404/409/422), `clientId` del token |
| Contrato del cliente | `src/core/repositories/index.ts:37-40` (`IBookingCommands`), `types/index.ts:130-144` | Interfaz pequeña de comandos; `Omit<Command,'action'>` |
| Gateways | `EdgeFunctionBookingCommands.ts:33-39`, `LocalBookingCommands.ts:17-23` | Edge: `invoke({action,...})`; Local: delega con `getClientId()` y `now()` |
| Persistencia atómica | `SupabaseDataService.ts:235-245` (23505) y `:275-284` (`cancelIfConfirmed`); `localStorage.ts:345` | `UPDATE ... WHERE id AND status='confirmed'` + `.select('id')`; devolver `boolean` |
| ViewModel | `ClientAppointmentsViewModel.ts` y `BookingViewModel.ts:128-174` | `isSubmitting` anti doble clic, `runInAction`, error como string, `now` inyectado |
| Inyección | `src/core/providers/ViewModelProvider.tsx:52-62`, hook en `:110` | Crear el VM con `commands` ya inyectado y exponerlo con un hook |
| Tests de Model | `tests/unit/core/models/BookingModel.test.ts:759`, `:803`, `:893` | Mock de `IDataService`, `now` fijo, límites exactos |
| Tests de orquestación / handler | `BookingCommandsModel.test.ts:47`, `:123`; `bookingsHandler.test.ts:94`, `:140`, `:170` | Casos por código HTTP; `clientId` en el cuerpo se ignora |
| Tests de repositorio | `SupabaseDataService.test.ts:206-254`, `:351` | `23505` → `BookingDuplicateError`; 0 filas → `false` |
| Integración | `tests/integration/BookingFlow.integration.test.ts:491` | `LocalBookingCommands` ↔ Model ↔ `LocalStorageDataService` real |
| E2E | `e2e/client-appointments.spec.ts` | Modo local; reservas inyectadas en `nivel-bookings`; entrar y navegar por el enlace (un `goto` pierde la sesión) |

## Files to Change
| File | Action | Why |
|---|---|---|
| `src/core/types/index.ts` | UPDATE | `RescheduleBookingCommand` (`action:'reschedule'`, `bookingId`, `trainerId`, `date`, `time`, `zone`, `timeZone`) y unión `BookingCommand` |
| `src/core/types/errors.ts` | UPDATE | `BookingRescheduleNoticeError` (D8) |
| `src/core/repositories/index.ts` | UPDATE | `IBookingRepository.rescheduleIfConfirmed`; `IBookingCommands.reschedule` |
| `src/core/services/SupabaseDataService.ts` | UPDATE | `rescheduleIfConfirmed` (UPDATE condicional; `23505` → `BookingDuplicateError`) |
| `src/core/repositories/localStorage.ts` | UPDATE | `rescheduleIfConfirmed` en modo local |
| `src/core/models/BookingModel.ts` | UPDATE | `rescheduleBooking`, `canReschedule`; `ignoreBookingId` en disponibilidad, duplicados y aforo |
| `src/core/models/BookingCommandsModel.ts` | UPDATE | `rescheduleBooking` (valida zona/formatos, calcula `startsAt`; **no** toca `ProgramModel`) |
| `src/server/bookingsHandler.ts` | UPDATE | Acción `reschedule`, validación de campos y mapeo del nuevo error a 409 |
| `src/core/services/EdgeFunctionBookingCommands.ts`, `LocalBookingCommands.ts` | UPDATE | Método `reschedule` |
| `src/components/TimeSelectionView.tsx` | CREATE | Extraer `TimeSelectionView` de `BookingView.tsx` sin cambiar su comportamiento |
| `src/components/BookingView.tsx` | UPDATE | Importar la vista extraída |
| `src/core/view-models/RescheduleViewModel.ts` | CREATE | Estado de la selección, horarios sin contar la propia cita, `isSubmitting`, error y llamada a `reschedule` (SRP: no mezclar con la lista ni con reservar) |
| `src/core/view-models/ClientAppointmentsViewModel.ts` | UPDATE | `canReschedule(booking)` y refresco tras reprogramar |
| `src/core/providers/ViewModelProvider.tsx` | UPDATE | Crear `RescheduleViewModel` y exponer `useRescheduleViewModel` |
| `src/components/client/RescheduleDialog.tsx` | CREATE | Calendario + `TimeSelectionView` + confirmar, con `data-testid` |
| `src/components/client/ClientAppointmentsView.tsx` | UPDATE | Botón "Reprogramar" junto a "Cancelar", con el mismo texto de plazo cuando no aplica |
| `tests/...`, `e2e/client-appointments.spec.ts` | CREATE/UPDATE | Ver Tasks |
| `DEVELOPMENT.md` | UPDATE | Nota de despliegue: la función primero y luego la app |
| `.claude/prds/mis-citas-cliente.prd.md` | UPDATE | Hito 3 → `in-progress` ahora y `complete` al cerrar; registrar D1–D8 como decisiones al confirmarlas |

## Tasks
### PR A — Backend (sin cambios visibles para el cliente)

### Task 1: Tipos, error y contrato (TDD)
- **Action**: `RescheduleBookingCommand`, `BookingRescheduleNoticeError` (mensaje con "reprogramar" y el plazo de la zona original) y las firmas `rescheduleIfConfirmed` / `reschedule`.
- **Mirror**: `errors.ts:38-48`, `types/index.ts:130-144`
- **Validate**: `npx tsc --noEmit`

### Task 2: Persistencia atómica (TDD: tests primero)
- **Action**: `rescheduleIfConfirmed(id, changes)` en Supabase y local: `UPDATE ... WHERE id AND status='confirmed'` con `.select('id')`; devuelve `false` si no cambió nada; `23505` → `BookingDuplicateError`. Local: lanza el mismo error si ya hay otra confirmada en ese horario del cliente.
- **Mirror**: `SupabaseDataService.ts:235-245`, `:275-284`; `localStorage.ts:345`
- **Validate**: `npx vitest run tests/unit/core/services/SupabaseDataService.test.ts tests/unit/core/repositories`

### Task 3: `BookingModel.rescheduleBooking` (TDD: tests primero)
- **Action**: Orden: cliente requerido → `getById` → ajena/inexistente = `BookingNotFoundError` → ya cancelada → ya terminó → plazo contra la **original** (`BookingRescheduleNoticeError`) → destino futuro → destino distinto del actual (D6) → disponibilidad, duplicados y aforo **ignorando la propia cita** → `rescheduleIfConfirmed`; si no cambió, `BookingAlreadyCancelledError`. Añadir `canReschedule` (misma regla que `canCancel`).
- **Mirror**: `BookingModel.ts:91-121`, `:241-279`
- **Validate**: `npx vitest run tests/unit/core/models/BookingModel.test.ts`
- **Casos clave**: ajena → 404; cancelada; terminada; gym a 30 min y gabinete a 23 h rechazados; límite exacto permitido; destino en el pasado; mismo hueco; hueco no disponible; zona llena; duplicado con **otra** cita (sí) y con **la propia** (no); cambiar solo de zona en el mismo horario; carrera con una cancelación.

### Task 4: `BookingCommandsModel.rescheduleBooking` y handler (TDD)
- **Action**: Validar zona IANA y formatos, resolver entrenador, calcular `startsAt` y `clientTimezone` nuevos, delegar en el Model. **No** llamar a `consumeSessionForClient` ni a `restoreSession`. Handler: acción `reschedule`, campos obligatorios, 409 para plazo/duplicado/aforo/ya cancelada, 404 para ajena, 422 para comando inválido.
- **Mirror**: `BookingCommandsModel.ts:32-78`; `bookingsHandler.ts:54-76`, `:83-103`
- **Validate**: `npx vitest run tests/unit/core/models/BookingCommandsModel.test.ts tests/unit/server`
- **Casos clave**: el `clientId` del cuerpo se ignora; el programa y su sesión no cambian; `program_id` se conserva; zona inválida; fecha mal formada; entrenador inexistente.

### Task 5: Gateways e integración (TDD)
- **Action**: `reschedule` en `EdgeFunctionBookingCommands` y `LocalBookingCommands`. Integración con `LocalStorageDataService` real: mover conserva `program_id` y `used_sessions`; <1 h rechazado sin cambios; cita ajena rechazada; cancelada no se puede mover; **mover y luego cancelar devuelve la sesión una sola vez**.
- **Mirror**: `EdgeFunctionBookingCommands.ts:33-39`; `BookingFlow.integration.test.ts:491`
- **Validate**: `npx vitest run tests/unit/core/services tests/integration`

### Task 6: Verificación contra el stack local y despliegue de la función
- **Action**: `supabase start` + función servida (mismo método que en el hito 2): mover con éxito → 200 y `starts_at` correcto; sesión sin cambios; ajena → 404; <1 h → 409; duplicado → 409; mover una cita cancelada → 409. Mergear PR A (el workflow despliega la función) y comprobar en producción con logs y `list_edge_functions` que la versión subió.
- **Validate**: script de punta a punta local; logs de la función tras el despliegue

### PR B — Pantalla

### Task 7: Extraer `TimeSelectionView` (refactor con red de seguridad)
- **Action**: Mover a `src/components/TimeSelectionView.tsx` sin cambiar comportamiento. Test de componente primero (renderiza horarios por entrenador, deshabilita huecos llenos, llama a los callbacks) para que el movimiento tenga red.
- **Validate**: `npx vitest run tests/unit/components` y E2E de reservar si existe

### Task 8: `RescheduleViewModel` y `RescheduleDialog` (TDD)
- **Action**: VM con selección de fecha/entrenador/horario/zona, horarios sin contar la propia cita, `isSubmitting` (anti doble clic), error del backend como string y refresco de la lista al terminar. Diálogo con calendario + `TimeSelectionView` + confirmar; botón "Reprogramar" en `ClientAppointmentsView` solo si `canReschedule`; si no, el mismo texto de plazo.
- **Mirror**: `BookingViewModel.ts:128-174`; `ClientAppointmentsViewModel.ts`; `CancelAppointmentDialog.tsx`
- **Validate**: `npx vitest run tests/unit/core/view-models tests/unit/components`

### Task 9: E2E, documentación y cierre
- **Action**: Ampliar `e2e/client-appointments.spec.ts` (modo local): mover una cita a otra fecha y verla en la nueva; con menos de 1 h no aparece el botón. Actualizar `DEVELOPMENT.md` (orden: función y luego app), el PRD (hito 3 → `complete`, decisiones D1–D8) y registrar la evidencia en `.claude/tdd/`.
- **Validate**: bloque Validation completo

## Validation
```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
npx playwright test e2e/client-appointments.spec.ts
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| La app llama a `reschedule` antes de que la función lo conozca (422 "Comando inválido") | High si se mergea todo junto | 2 PRs: función primero, verificarla, y luego la pantalla (Tasks 6 y 7) |
| El cliente choca consigo mismo al mover (duplicado, aforo o disponibilidad cuentan su propia cita) | High | `ignoreBookingId` en las tres validaciones y tests de "cambiar solo de zona en el mismo horario" |
| Mover una cita que se canceló entre medias la "resucita" | Medium | `UPDATE` condicional a `status='confirmed'`; si no cambia, `BookingAlreadyCancelledError` (Task 2) |
| Dos operaciones simultáneas sobre el mismo horario del cliente | Medium | El índice único parcial lo impide; `23505` → `BookingDuplicateError` también en `UPDATE` |
| Sobreventa de cupos al mover (aforo no atómico) | Medium | Misma limitación que reservar (#178/#182); aceptado en el PRD |
| Sin rastro de la cita original (D5) | Medium | Decisión explícita; si se necesita auditoría, hito aparte con migración |
| El entrenador no se entera de que le movieron o quitaron una cita | Medium | Sin notificaciones en el MVP (D7); su vista se actualiza sola |
| La extracción de `TimeSelectionView` rompe reservar | Low | Test de componente primero y E2E de reservar si existe (Task 7) |
| Modo local no ejerce la garantía de servidor | High | Se declara; la regla vive igual en `BookingModel` y el servidor se prueba con Task 6 |
| Hora de la zona del cliente distinta a la del navegador al reprogramar | Low | Se envía la zona IANA actual y se actualiza `client_timezone` junto con `starts_at` |

## Acceptance
Estado a 2026-11-21. Evidencia detallada en `.claude/tdd/mis-citas-cliente-reprogramar-cita.tdd.md`.

- [x] D1–D8 tomadas como confirmadas: el usuario invocó `/ecc:tdd-workflow` sobre este plan ya mergeado (#214) y siguió adelante tras ver el PR del backend (#216), sin objeciones. No hubo una confirmación explícita ítem por ítem
- [x] Un cliente no puede mover una cita ajena, cancelada, terminada o fuera de plazo llamando a la API directamente: 404/409/422 verificados con la función real en el stack local (36 chequeos) y `PATCH` directo del cliente → 0 filas. **No se ejercitó contra producción** (sin JWT de cliente desde el sandbox)
- [x] Mover una cita es atómico: un único `UPDATE` condicional; el índice único frena el duplicado también en un `UPDATE` directo; no se toca la sesión del programa (verificado en local)
- [x] Mover y luego cancelar devuelve la sesión una sola vez (integración, E2E de punta a punta en local y tests unitarios)
- [x] Función desplegada y verificada antes de mergear la pantalla: `Supabase Functions Deploy` en verde, `bookings` en la versión 6 y el código desplegado contiene `reschedule`. **La llamada real a `reschedule` en producción sigue sin probarse**
- [x] `lint`, `tsc`, `vitest` (704 tests), `build` y el E2E (9 tests, modo local) pasan; sin `any`; lógica de negocio en Models y servidor (el ViewModel guarda estado de UI y los componentes solo lo consumen; la excepción menor es `canConfirm`, que repite como ayuda de interfaz la regla "no mover al mismo hueco" que ya aplican el Model y el servidor); dependencias inyectadas
