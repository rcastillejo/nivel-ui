# Mis citas (gestión de reservas del cliente)

## Problem
Los clientes de Nivel Gym no pueden ver las citas que reservaron ni reprogramarlas o cancelarlas. Hoy tendrían que coordinar con el entrenador para consultar una cita, y con el administrador del sistema para reprogramar o cancelar. Dejarlo sin resolver mantiene una coordinación manual que no escala y hace que los cupos liberados por cancelaciones no se aprovechen a tiempo.

## Evidence
- Conversaciones con los entrenadores identificaron esta falta (observación cualitativa, sin citas textuales ni datos).
- Assumption — needs validation via user research (entrevistas con entrenadores y clientes piloto) y analytics post-lanzamiento (el producto aún no está en producción).

## Users
- **Primary**: cliente del gimnasio, autenticado con Google. Lo dispara la necesidad de consultar una cita próxima o de cambiarla o cancelarla.
- **Not for**: entrenadores y administrador (sin cambios de funcionalidad en esta iniciativa).

## Hypothesis
We believe **una sección "Mis citas" donde el cliente ve, reprograma y cancela sus citas** will **eliminar la coordinación manual con entrenadores y administrador** for **los clientes del gimnasio**.
We'll know we're right when **TBD — métrica y meta pendientes de definir** (candidatas: % de cancelaciones y reprogramaciones hechas en autoservicio; nº de mensajes de coordinación por semana).

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| % de cambios/cancelaciones en autoservicio | TBD | Analytics post-lanzamiento |
| Mensajes de coordinación entrenador-cliente por semana | TBD | Entrevistas con entrenadores |

## Scope
**MVP**
- El cliente ve sus citas próximas y su historial. Las citas pasadas son solo de lectura.
- El cliente cancela una cita futura.
- El cliente reprograma una cita futura: puede cambiar horario, entrenador y zona.
- Reglas de anticipación mínima para cancelar y reprogramar: 1 h en zona gym, 24 h en zona gabinete.
- La reprogramación respeta el aforo y la disponibilidad de entrenadores **con las mismas validaciones que la reserva actual** (sin cambiar la regla de aforo; ver [#182](https://github.com/rcastillejo/nivel-ui/issues/182)).

**Out of scope**
- Notificaciones por email o WhatsApp — diferido.
- Panel de entrenador o administrador para gestionar citas de clientes — diferido.
- Pagos o reembolsos — fuera de este producto por ahora.
- Corregir la regla de aforo y garantizarla (junto con la anticipación mínima) en el servidor — diferido: [#182](https://github.com/rcastillejo/nivel-ui/issues/182) (inconsistencia y conteo limitado por RLS) y [#178](https://github.com/rcastillejo/nivel-ui/issues/178) (validación atómica en Supabase).
- Citas pasadas: no se pueden cancelar ni reprogramar, solo ver.

## Delivery Milestones
| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Ver mis citas | El cliente consulta sus citas próximas y su historial | complete | [client-appointments.spec.md](../../docs/archive/specs/client-appointments.spec.md) |
| 2 | Cancelar cita | El cliente cancela una cita futura respetando la anticipación mínima | pending | — |
| 3 | Reprogramar cita | El cliente mueve una cita futura (horario, entrenador, zona) respetando anticipación, aforo y disponibilidad | pending | — |

## Open Questions
- [x] ¿El aforo y la anticipación deben garantizarse del lado servidor? **Decisión: no en este alcance.** Se mantiene el aforo actual (validación en el cliente, igual que reservar) y la garantía en servidor queda en [#182](https://github.com/rcastillejo/nivel-ui/issues/182) y [#178](https://github.com/rcastillejo/nivel-ui/issues/178). La anticipación de 1 h / 24 h también queda solo en el cliente y se puede saltar llamando a la API directamente.
- [x] ¿El aforo del gym es global (10 por hueco) o por entrenador? **Por entrenador**, según `docs/archive/specs/booking-flow.spec.md` y `ZONE_CONFIG`. La inconsistencia de `BookingModel.validateCapacity` (cuenta global) se corrige en [#182](https://github.com/rcastillejo/nivel-ui/issues/182).
- [ ] ¿Reprogramar modifica la misma reserva o crea una nueva? ¿Debe quedar rastro de la cita original?
- [ ] ¿La anticipación se mide contra la cita original, la nueva o ambas? Al pasar de gym a gabinete, ¿aplican 24 h al nuevo hueco?
- [ ] ¿En qué zona horaria se evalúan los cortes y la división entre próximas y pasadas? ¿Una cita es "pasada" al empezar o al terminar?
- [ ] ¿Cancelar devuelve la sesión del programa? ¿Reprogramar consume otra? ¿Qué pasa con cancelaciones fuera de plazo?
- [ ] ¿Se puede reprogramar a otra fecha o solo a otro horario del mismo día? ¿Hay límite de reprogramaciones por cita?
- [ ] ¿El historial muestra las citas canceladas? ¿Hace falta distinguir "completada" o "no asistió"?
- [ ] ¿Cómo se entera el entrenador de una cancelación o reprogramación, si no hay notificaciones en el MVP?
- [ ] ¿Qué se hace con las reservas existentes (duplicadas, pasadas aún confirmadas, creadas sin control de aforo)?
- [ ] ¿La feature debe funcionar también en modo local (sin Google ni identidad real) o solo con el backend real?
- [ ] ¿Cómo ve el cliente una cita cancelada por el entrenador?
- [ ] Definir métrica y meta de la hipótesis.
- [ ] Naming: `SPEC.md` ya usa "Mis citas Reservadas" para la vista de aforo por horario del entrenador. Distinguir ambos nombres para evitar confusión.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sobreventa de cupos al reprogramar: hoy el cliente solo ve sus propias reservas, así que el aforo no se valida bien (crítico en gabinete, capacidad 1) | High | High | Se acepta el aforo actual en este alcance; seguimiento en [#182](https://github.com/rcastillejo/nivel-ui/issues/182) y [#178](https://github.com/rcastillejo/nivel-ui/issues/178). No hay reservas de gabinete en producción todavía |
| Dos clientes toman el último cupo a la vez (sin garantías de concurrencia) | Medium | High | Garantía de consistencia en el servidor |
| La regla de 1 h / 24 h solo se aplica en el cliente y se puede saltar | High | Medium | Aplicar la regla donde no se pueda evadir |
| Zona horaria inconsistente en los cortes y en próximas/pasadas | Medium | Medium | Definir zona horaria de referencia del gimnasio |
| Reprogramar no atómico: el cliente puede perder la cita o quedar con dos | Medium | High | Operación única y atómica |
| Sesiones de programa mal contabilizadas al cancelar o reprogramar | High | Medium | Definir la regla de negocio antes de implementar |
| Disponibilidad de entrenador por fecha poco fiable: se podrían ofrecer huecos inexistentes | Medium | Medium | Validar disponibilidad en la reprogramación |
| Entrenador sin aviso de cambios (sin notificaciones ni auditoría) | Medium | Medium | Visibilidad mínima para el entrenador o notificación en un hito posterior |
| Datos existentes inconsistentes (duplicados, pasadas sin cerrar) | Medium | Low/Medium | Revisar y depurar antes del lanzamiento |
| No se puede probar de punta a punta en modo local | High | Low | Probar contra el backend real |

---
*Status: DRAFT — requirements only. Implementation planning pending via /plan.*
