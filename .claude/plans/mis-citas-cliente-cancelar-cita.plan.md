# Plan: Mis citas — Cancelar cita (Hito 2)

**Source PRD**: `.claude/prds/mis-citas-cliente.prd.md`
**Selected Milestone**: 2 — Cancelar cita
**Complexity**: Medium

## Summary
El cliente cancela una cita futura desde `/client/citas`, respetando la anticipación mínima (1 h gym, 24 h gabinete). La regla vive en `BookingModel.cancelBooking`; el estado de UI (cancelando, error, confirmación) en `ClientAppointmentsViewModel`; la persistencia reutiliza `IBookingRepository.getById/update` y la policy RLS ya existente `bookings: client cancel` (sin migración). Reprogramar queda para el hito 3.

## Decisiones asumidas (confirmar antes de implementar)
Preguntas abiertas del PRD que este hito necesita fijar. Se propone el default más pequeño y reversible:

| # | Pregunta | Default propuesto |
|---|---|---|
| D1 | ¿La anticipación se mide contra el inicio de la cita? | Sí: `inicio_cita − ahora ≥ 1 h (gym) / 24 h (gabinete)`. Exactamente en el límite se permite |
| D2 | Zona horaria | Hora local del navegador, igual que el hito 1 (limitación conocida) |
| D3 | ¿Cancelar devuelve la sesión del programa? | **No** en este hito. No existe `ProgramModel.restoreSession…` y la regla de negocio no está definida. Se documenta en la spec como pendiente |
| D4 | Cancelar = misma fila con `status = 'cancelled'` (no se borra) | Sí; ya aparece en Historial con etiqueta "Cancelada" (hito 1) y deja rastro |
| D5 | Cancelación fuera de plazo | Se bloquea con error de dominio; el botón se oculta/deshabilita y se muestra el motivo |
| D6 | Aviso al entrenador | Fuera de alcance (sin notificaciones); riesgo ya registrado en el PRD |
| D7 | Garantía en servidor de la anticipación | Fuera de alcance (#182/#178); solo cliente, como dice el PRD |

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
| `docs/specs/client-appointments-cancel.spec.md` | CREATE | SDD: Gherkin, contratos y criterios (copiar `TEMPLATE.spec.md`); estado `draft` → `implemented` al final |
| `.claude/prds/mis-citas-cliente.prd.md` | UPDATE | Fila hito 2: `pending` → `in-progress` y enlace al plan |
| `src/core/types/index.ts` | UPDATE | `CANCELLATION_NOTICE_MINUTES: Record<ZoneType, number>` (gym 60, gabinete 1440); `CancellationEligibility` si la UI necesita el motivo |
| `src/core/types/errors.ts` | UPDATE | `BookingNotFoundError`, `BookingCancellationNoticeError(zone, minNoticeMinutes)`, y reutilizar `BookingValidationError` para "ya cancelada / ya pasada / ajena" |
| `src/core/models/BookingModel.ts` | UPDATE | `cancelBooking(bookingId, clientId, now): Promise<Booking>` y `canCancel(booking, now): boolean` (puro) |
| `src/core/view-models/ClientAppointmentsViewModel.ts` | UPDATE | `cancelBooking(id)`, `cancellingId`, `canCancel(booking)`, recarga tras éxito; error traducido a string |
| `src/components/client/ClientAppointmentsView.tsx` | UPDATE | Botón "Cancelar" solo en próximas, diálogo de confirmación, mensaje de plazo |
| `src/components/client/CancelAppointmentDialog.tsx` | CREATE | Confirmación (mirar `src/components/ConfirmationModal.tsx`); sin lógica de negocio |
| `tests/unit/core/models/BookingModel.test.ts` | UPDATE | Reglas de cancelación |
| `tests/unit/core/view-models/ClientAppointmentsViewModel.test.ts` | UPDATE | Estado y errores |
| `tests/unit/components/client/ClientAppointmentsView.test.tsx` | UPDATE | Botón, diálogo, estados |
| `tests/integration/BookingFlow.integration.test.ts` | UPDATE | Cancelar con `LocalStorageDataService` real |
| `e2e/client-appointments.spec.ts` | CREATE | Cancelar una cita (si hay modo local/mocked viable; ver Riesgos) |

Sin cambios en `IBookingRepository` (ISP/OCP: `getById` + `update` bastan), sin migración SQL.

## Tasks
### Task 1: Spec (SDD)
- **Action**: Crear `docs/specs/client-appointments-cancel.spec.md` desde `TEMPLATE.spec.md` con D1–D7, escenarios Gherkin (cancelar OK; gym a <1 h bloqueado; gabinete a <24 h bloqueado; cita pasada; ya cancelada; cita ajena; error de red) y `data-testid`. Actualizar el PRD.
- **Mirror**: `docs/specs/client-appointments.spec.md`
- **Validate**: revisión humana de D1–D7 antes de seguir.

### Task 2: Tipos y errores
- **Action**: Constante de anticipación por zona y errores de dominio nuevos.
- **Mirror**: `ZONE_CONFIG`, `errors.ts`
- **Validate**: `npx tsc --noEmit`

### Task 3: Model (TDD: tests primero)
- **Action**: `cancelBooking`: validar ids → `getById` (no existe o `clientId` distinto → `BookingNotFoundError`) → ya cancelada/terminada → `BookingValidationError` → aplicar plazo por zona → `update(id, {status:'cancelled'})` → devolver cita actualizada. `canCancel` puro y reutilizado por el VM.
- **Mirror**: `getClientAppointments`
- **Validate**: `npx vitest run tests/unit/core/models/BookingModel.test.ts`

### Task 4: ViewModel (TDD)
- **Action**: `cancelBooking(id)` con `cancellingId`, error string, y `load` posterior; `canCancel(booking)` delegando al Model; el `clientId` sale del usuario autenticado ya cargado.
- **Mirror**: `ClientAppointmentsViewModel.load`
- **Validate**: `npx vitest run tests/unit/core/view-models/ClientAppointmentsViewModel.test.ts`

### Task 5: Componentes
- **Action**: Botón + diálogo de confirmación; `data-testid`: `appointment-cancel-{id}`, `cancel-dialog`, `cancel-confirm`, `cancel-dismiss`, `cancel-error`, `appointment-cancel-blocked-{id}`.
- **Mirror**: `ClientAppointmentsView.tsx`, `ConfirmationModal.tsx`
- **Validate**: `npx vitest run tests/unit/components/client`

### Task 6: Integración y E2E
- **Action**: Integración Model→`LocalStorageDataService` (persiste `cancelled`, aparece en historial, no libera otra cita ajena). E2E del flujo si es viable.
- **Mirror**: `BookingFlow.integration.test.ts:432`
- **Validate**: `npx vitest run tests/integration` y `npx playwright test e2e/client-appointments.spec.ts --trace off`

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
| Plazo 1 h / 24 h solo en cliente (evadible vía API) | High | Aceptado en el PRD (#182/#178); documentar en la spec |
| Cancelar no devuelve la sesión del programa (D3) y el cliente puede percibirlo como pérdida | Medium | Confirmar D3 antes de implementar; si se decide devolver, añadir `ProgramModel` método y ampliar el alcance |
| Zona horaria del navegador distorsiona el corte | Medium | Reloj inyectado, tests con `fixedNow`; zona del gimnasio queda para otro hito |
| Doble clic / carrera: cancelar dos veces | Low | `cancellingId` deshabilita el botón; el Model rechaza "ya cancelada" |
| RLS: `WITH CHECK (status='cancelled')` permite a un cliente editar otros campos al cancelar | Low | Enviar solo `status`; endurecimiento server-side en #178 |
| E2E difícil sin backend real/Google | High | Si no hay modo local autenticable, cubrir con integración + componente y anotarlo en la spec |
| Entrenador no se entera de la cancelación | Medium | Fuera de alcance; riesgo ya en el PRD |

## Acceptance
- [ ] D1–D7 confirmadas por el usuario
- [ ] Spec creada y en `implemented`
- [ ] Todas las tareas completas y tests de Model/VM/componente/integración en verde
- [ ] `lint`, `tsc`, `vitest` y `build` pasan
- [ ] Patrones reutilizados, sin `any`, sin cambios en `IBookingRepository`
