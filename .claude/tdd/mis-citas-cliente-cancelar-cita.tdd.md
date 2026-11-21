# TDD — Mis citas: cancelar cita (Hito 2)

**Plan de origen**: `.claude/plans/mis-citas-cliente-cancelar-cita.plan.md`
**Alcance de esta ejecución**: el plan ya estaba implementado (PRs #194–#198, #200–#202, #207–#209). Este informe mapea cada tarea del plan a los tests que la garantizan, cierra el hueco que faltaba (E2E del cliente, Task 7) y deja constancia de lo verificado. No se modificó código de producción.

## Qué evidencia hay y cuál no

| Evidencia | Estado |
|---|---|
| GREEN de toda la suite en esta ejecución | Sí (ver "Validación") |
| RED del E2E nuevo | Sí: se rompió a propósito el plazo de gimnasio (`CANCELLATION_NOTICE_MINUTES.gym` 60 → 5) y el E2E falló (`appointment-cancel-e2e-pronto` esperado 0, recibido 1); luego se restauró el valor y `src/` quedó sin diff |
| RED original de los tests unitarios y de integración | **No se volvió a capturar**: se escribieron durante la implementación en sesiones anteriores y aquí solo se ejecutaron en verde |
| Cobertura (porcentaje) | **No medible**: `@vitest/coverage-v8` no está instalado. No se informa ninguna cifra |

## Recorridos de usuario (del plan)

1. Como cliente, quiero cancelar una cita futura desde "Mis citas", para liberar el horario y recuperar la sesión de mi programa.
2. Como cliente, no puedo cancelar con menos de 1 h (gimnasio) o 24 h (gabinete) de anticipación, y la pantalla me explica por qué.
3. Como cliente, no puedo cancelar la cita de otra persona ni cancelar dos veces la misma (y la sesión no se devuelve dos veces).
4. Como sistema, las reglas se aplican en el servidor (Edge Function) con el reloj del servidor y `starts_at` en UTC.

## Tareas del plan → tests

| Tarea del plan | Test(s) | Tipo |
|---|---|---|
| Task 2 — tipos, errores y mapper | `tests/unit/core/mappers/BookingMapper.test.ts` | unit |
| Task 3 — conversión a UTC y zona IANA | `tests/unit/core/utils/timezone.test.ts` | unit |
| Task 3 — `canCancel`, `cancelBooking`, `createBooking` con zona | `tests/unit/core/models/BookingModel.test.ts` (`canCancel`, `cancelBooking`, `createBooking with client timezone`, `attachProgram`) | unit |
| Task 3 — crear/cancelar con consumo y devolución de sesión | `tests/unit/core/models/BookingCommandsModel.test.ts`, `tests/unit/core/models/ProgramModel.test.ts` (`restoreSession`) | unit |
| Task 3 — persistencia atómica | `tests/unit/core/services/SupabaseDataService.test.ts` (`cancelIfConfirmed`, `23505` → `BookingDuplicateError`, RPC `consume/restore_program_session`) | unit |
| Task 4 — Edge Function (handler y autenticación) | `tests/unit/server/bookingsHandler.test.ts`, `tests/unit/server/supabaseAuthenticator.test.ts` | unit |
| Task 5 — gateways | `tests/unit/core/services/EdgeFunctionBookingCommands.test.ts`, `tests/unit/core/services/LocalBookingCommands.test.ts` | unit |
| Task 5 — ViewModels | `tests/unit/core/view-models/ClientAppointmentsViewModel.test.ts`, `tests/unit/core/view-models/BookingViewModel.test.ts` | unit |
| Task 5 — componentes | `tests/unit/components/client/ClientAppointmentsView.test.tsx` | unit |
| Task 7 — integración Model → repositorio local | `tests/integration/BookingFlow.integration.test.ts` (bloque `LocalBookingCommands ↔ BookingCommandsModel ↔ LocalStorageDataService`) | integración |
| Task 7 — E2E | `e2e/client-appointments.spec.ts` (**nuevo**) | E2E |
| Task 6 — vía directa cerrada | Verificado a mano, no automatizado: migración `20261111000000_close_direct_writes.sql` (#209); en local, INSERT directo → 403, `rpc/restore_program_session` → `permission denied`, PATCH → 0 filas | manual |

## Escenarios del plan (Task 1) → garantía

| # | Qué se garantiza | Test | Tipo | Resultado |
|---|---|---|---|---|
| 1 | Cancelar con anticipación deja la cita como cancelada y devuelve la sesión | `BookingCommandsModel › cancelBooking › cancels the booking and gives back the program session`; integración `cancelar persiste el estado, devuelve la sesión…`; E2E `el cliente cancela una cita con anticipación…` | unit / integración / E2E | PASS |
| 2 | Gimnasio a menos de 1 h y gabinete a menos de 24 h se rechazan sin tocar la sesión | `BookingModel › cancelBooking › throws BookingCancellationNoticeError…` (2); `BookingCommandsModel › does not restore a session when the cancellation is rejected`; E2E (2 tests de plazo) | unit / E2E | PASS |
| 3 | El límite exacto (60 min / 24 h) se permite | `BookingModel › canCancel › allows … exactly …` (2) | unit | PASS |
| 4 | Una cita ya cancelada no se vuelve a cancelar ni devuelve otra sesión | `BookingModel › throws BookingAlreadyCancelledError…` (incl. carrera); integración `cancelar dos veces no devuelve la sesión dos veces` | unit / integración | PASS |
| 5 | Una cita ajena responde "no encontrada" (404), sin revelar su existencia | `BookingModel › throws BookingNotFoundError (not a permission error)…`; handler `maps a missing or foreign booking to 404`; integración `no deja cancelar una cita de otro cliente` | unit / integración | PASS |
| 6 | Sin `program_id` no hay devolución ni error | `BookingCommandsModel › cancels without restoring anything…`; integración `cancelar sin sesión consumida no falla…` | unit / integración | PASS |
| 7 | La reserva en una zona distinta de UTC guarda `starts_at` correcto | `BookingCommandsModel › computes startsAt in UTC from the client time zone…`; `timezone.test.ts` | unit | PASS |
| 8 | Una zona inválida se rechaza antes de tocar la base | `BookingCommandsModel › rejects an invalid time zone…`; handler 422 | unit | PASS |
| 9 | El doble clic no duplica la operación | `ClientAppointmentsViewModel › ignores a second confirmation while one is running`; `BookingViewModel › ignores repeated calls while a booking is in flight` | unit | PASS |
| 10 | Sin token o con rol incorrecto se rechaza (401/403) | `bookingsHandler › authentication and authorization` | unit | PASS |
| 11 | Cerrar la confirmación no cancela la cita | E2E `cerrar la confirmación no cancela la cita` | E2E | PASS |

## Validación (esta ejecución, rama sobre `main` = `980a132`)

| Comando | Resultado |
|---|---|
| `npm run lint` | 0 errores, 7 warnings previos y ajenos a este trabajo |
| `npx tsc --noEmit` | sin errores |
| `npx vitest run` | 36 archivos, **580 tests en verde** |
| `npm run build` | compila |
| `npx playwright test e2e/client-appointments.spec.ts` | **4 passed**, con `NEXT_PUBLIC_SUPABASE_URL` sin definir (modo local) |

## Huecos conocidos

- **Cobertura sin medir**: falta `@vitest/coverage-v8`. Instalarlo es un cambio de dependencias aparte.
- **E2E no corre en CI**: ningún workflow ejecuta Playwright. Hoy se ejecuta a mano con `npm run test:e2e`.
- **El E2E solo cubre el modo local**: ejercita la UI y la regla de plazo del Model, no la Edge Function ni RLS. Esa garantía de servidor se cubre con los tests del handler y con las pruebas manuales contra el stack local de Supabase y producción.
- **Entorno del sandbox**: el `@playwright/test` del proyecto busca otra versión de Chromium que la preinstalada; se ejecutó con una config temporal (`executablePath: /opt/pw-browsers/chromium`) que no se commitea. En una máquina normal basta `npx playwright install`.
- **Plan desactualizado en dos puntos**: Task 1 (spec SDD) quedó retirada por decisión del proyecto (`CLAUDE.md` §11), y el cierre de la vía directa (Task 6) se resolvió como migración en `supabase/migrations/` (#209), no como archivo en `supabase/cutover/`.
- **Sesiones del programa `prueba` en producción**: dato de prueba con `used_sessions` = 8 y todas sus reservas canceladas; sin corregir a la espera de decisión del propietario.

## Evidencia para el merge

Si este PR se aplasta con squash, copiar a la descripción: RED del E2E por mutación del plazo de gimnasio (falla), GREEN (4/4), suite completa 580/580, lint/tsc/build sin errores.
