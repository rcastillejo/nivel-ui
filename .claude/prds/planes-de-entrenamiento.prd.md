# Planes de entrenamiento (reemplaza "Programa")

## Problema
El entrenador de Nivel Gym asigna a cada cliente un "Programa" de texto libre: sin tipos definidos, con sesiones y fechas ingresadas a mano. No existe un catálogo establecido, así que contar cuántos clientes hay por tipo de plan o por cantidad de sesiones se hace manualmente. Dejarlo así mantiene datos inconsistentes y obliga a contar a mano.

## Evidencia
- Assumption — needs validation via observación de uso con entrenadores (sin datos concretos por ahora).
- Contexto: se revisó el alcance y se orientó a lo que el cliente (el gimnasio) ya maneja: planes con tipos establecidos.

## Usuarios
- **Principal**: Entrenador, que asigna un plan a cada cliente y consulta cuántos clientes hay por plan.
- **Secundario**: Cliente. Solo cambia la terminología (Programa → Plan); el resto de su pantalla se mantiene, salvo inconsistencias.
- **No es para**: administración de pagos/precios.

## Reglas funcionales

### Catálogo de planes (6 tipos)
| Plan | Participantes | Sesiones | Fecha inicio | Fecha fin |
|---|---|---|---|---|
| Mensual | Personal | 8, 12 o 16 (se elige) | Manual | Calculada |
| Bimensual | Personal | 8, 12 o 16 (se elige) | Manual | Calculada |
| Trimestral | Personal | 8, 12 o 16 (se elige) | Manual | Calculada |
| DuoMensual | 2 personas simultáneas | 8, 12 o 16 (se elige) | Manual | Calculada |
| DuoTrimestral | 2 personas simultáneas | 8, 12 o 16 (se elige) | Manual | Calculada |
| Especial | Personal | Definidas manualmente (sin cantidad predefinida) | Manual | Calculada (30 días) |

- El nombre del plan define la duración (mensual, bimensual, trimestral); la cantidad de sesiones se elige aparte entre 8, 12 y 16.
- **Fecha fin**: se calcula en **bloques de 30 días** desde la fecha de inicio (ej.: inicia el 2 de noviembre, termina 30 días después). Mensual = 30 días; Bimensual = 60; Trimestral = 90; DuoMensual = 30; DuoTrimestral = 90; Especial = 30 (es mensual).
- **Mensaje de 12 sesiones**: el recuadro "sesiones recomendadas para resultados visibles" de la pantalla del cliente se **elimina**. Depende del entrenador y del cliente, y queda fuera de alcance.
- **Duo**: es un indicador de que participan 2 personas. Siempre hay un cliente **representante** (cliente registrado); las sesiones se cuentan solo a ese cliente. El acompañante **no es cliente registrado**: solo se guarda su nombre como dato **opcional**. Una reserva cubre a ambas personas. Cuenta como **2 cupos** de capacidad. El Duo es **solo para entrenamientos** (zona gimnasio): no se puede reservar en el gabinete.
- **Sesiones**: se descuentan **al reservar** (no existe un evento de asistencia). Se devuelven al **cancelar**. Al **reprogramar** el descuento se mantiene. Es el comportamiento actual.
- **Un solo plan activo por cliente.** Para pasar a otro plan, el cliente debe **terminar** el plan actual (no se migra a mitad de plan).
- **Reservar exige un plan activo.** Un cliente sin plan activo no puede reservar. (Cambia el comportamiento de hoy, que lo permite.)
- **Sesiones agotadas bloquean las reservas.** Con 0 sesiones disponibles el cliente no puede reservar hasta **renovar**. (Cambia el comportamiento de hoy, que no bloquea.)
- **Freezing (información del gimnasio, alcance por decidir)**: el plan puede pausarse. Días de freezing por plan: mensual **7**, bimensual **10**, trimestral **14**. Solo se da por viaje o enfermedad (podría darse por otros motivos) y se comunica por correo. Implica **bloquear** las reservas durante la pausa y **reprogramar** las fechas del plan. Ver preguntas abiertas.
- La fecha de inicio sigue la regla actual (no puede ser pasada: hoy debe ser mañana o después).
- Los programas existentes (fase de prueba) se migran o se descartan.

### Visualización (por entrenador)
1. **Planes**: se muestran los 6 planes.
2. **Dentro de un plan**: tabla de 2 columnas, *sesiones* y *clientes* (ej.: 8 sesiones → 5 clientes; 12 → 3; 16 → 6). Para Especial se agrupa por el total de sesiones definido.
3. **Dentro de un grupo de sesiones**: lista de clientes con *sesiones tomadas / sesiones del plan*. Un Duo ocupa **una sola fila**: se muestra el nombre del cliente representante y, si existe, el del acompañante (opcional).
4. La navegación Plan → sesiones → clientes aplica igual a cada plan.

## Hipótesis
Creemos que **un catálogo fijo de 6 planes con vistas de navegación plan → sesiones → clientes** resolverá **el conteo manual y los datos inconsistentes** para **los entrenadores**.
Sabremos que acertamos cuando **el entrenador ve la cantidad de clientes por plan sin contar a mano**.

## Métricas de éxito
| Métrica | Meta | Cómo se mide |
|---|---|---|
| Conteo de clientes por plan sin trabajo manual | TBD — needs validation via prueba con entrenadores | Verificación directa en la pantalla |
| Planes asignados desde los 6 tipos | 100% de planes nuevos | Revisión de datos |

## Alcance
**MVP** — Los 6 tipos de plan con sesiones 8/12/16 (y manual en Especial), fecha fin calculada, y las tres vistas de navegación (planes → sesiones → clientes), más el cambio de nombre Programa → Plan en la pantalla del cliente y la eliminación de su mensaje de 12 sesiones.

**Fuera de alcance**
- Pagos y precios — fuera del enfoque actual.
- Cambios a la vista del cliente más allá del nombre — se mantiene como hoy.
- Vista general del gimnasio (todos los entrenadores) — aumentaría la complejidad.

## Hitos de entrega
| # | Hito | Resultado | Estado | Plan |
|---|---|---|---|---|
| 1 | Catálogo de planes y asignación | El entrenador asigna uno de los 6 tipos a un cliente, con fecha fin calculada | pending | — |
| 2 | Plan Duo | Un Duo con representante, una reserva para 2 personas en el gimnasio, 2 cupos, sesiones al representante | pending | — |
| 2b | Reglas de reserva por plan | Solo se reserva con plan activo y sesiones disponibles; al agotarse se debe renovar; solo se cambia de plan al terminar el actual | pending | — |
| 3 | Vistas Plan → Sesiones → Clientes | El entrenador ve clientes por plan y sesiones tomadas/total sin contar a mano | pending | — |
| 4 | Renombre y migración | Pantalla del cliente dice "Plan"; datos de prueba migrados o descartados | pending | — |

## Preguntas abiertas
**Para resolver antes de /plan**
- [ ] **"Terminar" el plan**: el gimnasio respondió que es más complejo por el **freezing** (ver abajo). Sigue sin definirse si terminar es agotar sesiones, pasar la fecha fin (ya ajustada por freezing) o lo que ocurra primero, y qué pasa con las sesiones no usadas al llegar a la fecha.
- [ ] **Freezing (pausa del plan)**: ¿entra en el MVP o es un hito posterior?
- [ ] **Freezing, reglas por definir** (TBD — needs validation con el gimnasio):
  - ¿Los días de freezing se pueden dividir en varias pausas o se toman de una vez?
  - ¿Aplica igual a DuoMensual, DuoTrimestral (se asume mensual y trimestral) y a Especial (se asume mensual)?
  - ¿Quién lo registra? Se comunica por correo; se asume que el entrenador lo registra en el sistema.
  - Motivos: hoy viajes y enfermedad; "podría darse por otros temas". ¿Se registra el motivo?
  - ¿Qué pasa con las reservas ya hechas durante la pausa?

**Resueltas**
- [x] Renovar: al terminar el plan, el cliente puede elegir cualquier plan.
- [x] "Solo para entrenamientos" = zona gimnasio.
- [x] Duo solo en zona gimnasio, 2 cupos.
- [x] Reservar exige plan activo.
- [x] Sesiones agotadas: se bloquea y debe renovar.
- [x] Cambio de plan: solo cuando el actual terminó.
- [x] Alcance de las vistas: por entrenador. No habrá vista general del gimnasio (aumentaría la complejidad).
- [x] Duraciones: Bimensual 60 días, Trimestral 90, Especial 30 (mensual).
- [x] Mensaje del hito de 12 sesiones: se elimina del cliente.
- [x] Fecha fin: bloques de 30 días desde el inicio.
- [x] Descuento de sesión: al reservar; se devuelve al cancelar; reprogramar lo mantiene.
- [x] Acompañante de Duo: no es cliente registrado; nombre opcional, se muestra en las vistas junto al del cliente.

## Riesgos
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Bloquear reservas sin plan o sin sesiones cambia el comportamiento actual y puede dejar clientes sin poder reservar | Media | Alto | Definir qué es "terminar" y cómo se renueva antes de /plan; avisar a los entrenadores |
| Pérdida de datos al migrar programas | Baja | Bajo (fase de prueba) | Migrar o descartar según se decida |

---
*Status: DRAFT — requirements only. Implementation planning pending via /plan.*
