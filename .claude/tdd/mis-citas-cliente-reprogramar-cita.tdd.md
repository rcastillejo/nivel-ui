# TDD — Mis citas: reprogramar cita (Hito 3) — PR A: backend

**Plan de origen**: `.claude/plans/mis-citas-cliente-reprogramar-cita.plan.md` (Tasks 1 a 6)
**Alcance de esta ejecución**: backend de reprogramar. La pantalla (Tasks 7 a 9) va en un PR aparte, después de desplegar y verificar la función.

## Interpretación y desviaciones

| Tema | Qué se hizo |
|---|---|
| Decisiones D1–D8 | El plan las dejaba como propuestas a confirmar. El usuario invocó `/ecc:tdd-workflow` sobre el plan ya mergeado (#214), y se tomó como visto bueno a las propuestas tal como están escritas. Si alguna debe cambiar, se corrige antes de la pantalla |
| RED sin commit propio | El hook de pre-commit del repo ejecuta la suite completa, así que un commit con tests en rojo no es posible sin `--no-verify`, que no se usó. El RED se ejecutó y se documenta abajo; el commit es único y en verde |
| Modo local y duplicados | El plan decía que el repositorio local lanzaría el error de duplicado. No hace falta: `BookingModel` ya valida duplicados antes de escribir y el modo local no tiene concurrencia. Se dejó `rescheduleIfConfirmed` local sin esa comprobación |
| Refactor extra | `BookingCommandsModel.createBooking` extrajo su validación a un método privado `resolveSlot`, compartido con `rescheduleBooking`. Comportamiento sin cambios (sus tests siguen en verde) |

## Recorridos de usuario (del plan)

1. Como cliente, quiero mover una cita futura a otra fecha, horario, entrenador y/o zona, para no tener que cancelar y volver a reservar.
2. Como cliente, no puedo reprogramar con menos de 1 h (gimnasio) o 24 h (gabinete) de anticipación respecto a la cita original.
3. Como cliente, no puedo mover la cita de otra persona, una cancelada o una ya terminada, ni chocar con otra cita mía.
4. Como sistema, la operación es atómica, conserva el programa y no consume ni devuelve sesiones.

## RED (antes de tocar código de producción)

Comando: `npx vitest run` sobre los 7 archivos de tests tocados.

| Archivo | Resultado antes de implementar |
|---|---|
| `tests/unit/core/models/BookingModel.test.ts` | 23 fallan |
| `tests/integration/BookingFlow.integration.test.ts` | 10 fallan |
| `tests/unit/core/models/BookingCommandsModel.test.ts` | 7 fallan |
| `tests/unit/server/bookingsHandler.test.ts` | 7 fallan |
| `tests/unit/core/services/SupabaseDataService.test.ts` | 5 fallan |
| `tests/unit/core/services/EdgeFunctionBookingCommands.test.ts` | 2 fallan |
| `tests/unit/core/services/LocalBookingCommands.test.ts` | 1 falla |
| **Total** | **55 fallan, 187 pasan** |

Causa de todos los fallos: `TypeError: ... is not a function` en `rescheduleBooking`, `canReschedule`, `rescheduleIfConfirmed` y `reschedule`, que no existían. Los tests nuevos del handler que ya pasaban en RED son los negativos que hoy se rechazan por "comando inválido" (403 de rol, 422 por campos faltantes), comportamiento que debe mantenerse.

## GREEN

| Comando | Resultado |
|---|---|
| Mismos 7 archivos | 242 de 242 pasan |
| `npx vitest run` (suite completa) | 36 archivos, **641 tests** pasan (580 anteriores + 61 nuevos) |
| `npx tsc --noEmit` | sin errores (hubo que añadir `reschedule: vi.fn()` a dos mocks de `IBookingCommands`) |
| `npm run lint` | 0 errores, 7 warnings previos |

## Verificación contra el stack local con la Edge Function real

`supabase start -x vector` (el contenedor de logs no arrancó y no hace falta), `npm run build:functions` y `supabase functions serve bookings`; script de punta a punta contra `127.0.0.1`: **36 chequeos, todos PASS**.

| Garantía | Resultado |
|---|---|
| Sin token → 401; entrenador → 403; comando incompleto → 422 | PASS |
| Reprogramar → 200, **misma fila** (mismo `id`), fecha/hora/`starts_at` UTC correctos (10:00 Lima = 15:00Z), zona horaria y `program_id` conservados | PASS |
| La sesión del programa **no cambia** al reprogramar; no se crea otra reserva | PASS |
| Cita ajena → 404 sin cambios; mismo hueco → 422; zona inválida → 422; horario que el entrenador no ofrece → 422 | PASS |
| Cambiar entrenador y zona a la vez; el nombre del entrenador se actualiza | PASS |
| Mover a un horario donde el cliente ya tiene otra cita → 409 `BookingDuplicateError`, sin mover | PASS |
| El índice único `uq_bookings_client_slot_confirmed` también frena un `UPDATE` directo (`23505`) | PASS |
| Gym a 30 min → 409 `BookingRescheduleNoticeError` ("…reprogramar…"); gabinete a 23 h → 409 | PASS |
| Gym a 2 h → 200: el destino no exige plazo; sin tocar la sesión | PASS |
| Reprogramar y luego cancelar devuelve **una** sesión; cancelar otra vez → 409 sin devolver otra | PASS |
| Reprogramar una cita cancelada → 409 y no se reactiva | PASS |
| `PATCH` directo del cliente a su reserva → 0 filas (RLS tras la migración de cierre) | PASS |

## Tareas del plan → tests

| Tarea | Tests |
|---|---|
| Task 1 — tipos, error y contrato | Cubierto por `tsc` y por los tests de las demás tareas |
| Task 2 — persistencia atómica | `SupabaseDataService.test.ts › rescheduleIfConfirmed` (5); integración local |
| Task 3 — `BookingModel.rescheduleBooking` y `canReschedule` | `BookingModel.test.ts › canReschedule` (3), `› rescheduleBooking` (20) |
| Task 4 — `BookingCommandsModel` y handler | `BookingCommandsModel.test.ts › rescheduleBooking` (7), `bookingsHandler.test.ts › reschedule` y validación (13) |
| Task 5 — gateways e integración | `EdgeFunctionBookingCommands.test.ts` (2), `LocalBookingCommands.test.ts` (1), `BookingFlow.integration.test.ts › Reservar y reprogramar` (10) |
| Task 6 — stack local | Script de punta a punta (36 chequeos); el despliegue y la comprobación en producción se registran tras el merge |

## Cobertura y huecos conocidos

- **Cobertura sin medir**: falta `@vitest/coverage-v8`; no se informa ninguna cifra.
- **Aforo no atómico**: la validación de cupo sigue siendo "leer y luego escribir" (#178/#182), igual que reservar. Dos clientes que tomen a la vez el último cupo pueden pasar los dos.
- **Sin prueba de concurrencia de reprogramar**: la atomicidad se verificó por el `UPDATE` condicional y por el índice único, no con peticiones simultáneas.
- **El script de punta a punta vive fuera del repo** (directorio temporal de la sesión); no se versiona ni corre en CI.
- **Pendiente tras el merge**: desplegar la función, comprobar la versión nueva y probar `reschedule` en producción antes de mergear la pantalla.

## Evidencia para el merge

Si este PR se aplasta con squash, copiar a la descripción: RED 55 fallos por `is not a function`, GREEN 641 tests, 36 chequeos de punta a punta con la función real en local, `tsc` y lint sin errores.
