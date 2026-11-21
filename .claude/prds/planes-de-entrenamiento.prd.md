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
| Especial | Personal | Definidas manualmente (sin cantidad predefinida) | Manual | Derivada |

- El nombre del plan define la duración (mensual, bimensual, trimestral); la cantidad de sesiones se elige aparte entre 8, 12 y 16.
- **Duo**: es un indicador de que participan 2 personas. Siempre hay un cliente **representante**; las sesiones se cuentan solo a ese cliente. Una reserva cubre a ambas personas. Cuenta como **2 cupos** de capacidad (pendiente de confirmar).
- Se mantiene la regla de **un solo plan activo por cliente**. Un cliente puede migrar de plan.
- La fecha de inicio sigue la regla actual (no puede ser pasada: hoy debe ser mañana o después).
- Los programas existentes (fase de prueba) se migran o se descartan.
- El descuento de sesión y el manejo de sesiones agotadas se mantienen como hoy (ver Preguntas abiertas).

### Visualización (por entrenador)
1. **Planes**: se muestran los 6 planes.
2. **Dentro de un plan**: tabla de 2 columnas, *sesiones* y *clientes* (ej.: 8 sesiones → 5 clientes; 12 → 3; 16 → 6). Para Especial se agrupa por el total de sesiones definido.
3. **Dentro de un grupo de sesiones**: lista de clientes con *sesiones tomadas / sesiones del plan*. Un Duo ocupa **una sola fila** (el representante).
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
**MVP** — Los 6 tipos de plan con sesiones 8/12/16 (y manual en Especial), fecha fin calculada, y las tres vistas de navegación (planes → sesiones → clientes), más el cambio de nombre Programa → Plan en la pantalla del cliente.

**Fuera de alcance**
- Pagos y precios — fuera del enfoque actual.
- Cambios a la vista del cliente más allá del nombre — se mantiene como hoy.

## Hitos de entrega
| # | Hito | Resultado | Estado | Plan |
|---|---|---|---|---|
| 1 | Catálogo de planes y asignación | El entrenador asigna uno de los 6 tipos a un cliente, con fecha fin calculada | pending | — |
| 2 | Plan Duo | Un Duo con representante, una reserva para 2 personas, 2 cupos, sesiones al representante | pending | — |
| 3 | Vistas Plan → Sesiones → Clientes | El entrenador ve clientes por plan y sesiones tomadas/total sin contar a mano | pending | — |
| 4 | Renombre y migración | Pantalla del cliente dice "Plan"; datos de prueba migrados o descartados | pending | — |

## Preguntas abiertas
**Pendientes de confirmar con el gimnasio**
- [ ] Un Duo cuenta como 2 cupos de capacidad (por ahora asumido). ¿El gabinete, con capacidad 1, admite un Duo?
- [ ] ¿Un cliente sin plan puede reservar? (hoy puede)
- [ ] Qué ocurre al agotarse las sesiones (por ahora, como hoy)
- [ ] La vista es por entrenador, no de todo el gimnasio (por ahora asumido)
- [ ] ¿Se permite cambiar de plan y se mantiene un solo plan activo? (por ahora asumido)

**Para resolver antes de /plan**
- [ ] **Fecha fin**: la respuesta fue "explica la primera pregunta". Interpretado como duración por tipo de plan: Mensual 1 mes, Bimensual 2, Trimestral 3, DuoMensual 1, DuoTrimestral 3. ¿Meses calendario o bloques de 30 días? ¿Se confirma?
- [ ] **Fecha fin de Especial**: se "deriva", pero ¿de qué (sesiones, regla fija)? TBD.
- [ ] **Momento del descuento**: se dijo "como hoy, al asistir", pero hoy la sesión se descuenta **al reservar** (se devuelve al cancelar). ¿Se mantiene al reservar o pasa a al asistir?
- [ ] ¿Qué pasa con el hito de 12 sesiones de la pantalla del cliente (hoy fijo) según el plan?
- [ ] Un Duo: ¿cómo se identifica a la segunda persona (¿es cliente registrado?) y cómo se muestra en las vistas?

## Riesgos
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Reglas de Duo (cupos, gabinete) distintas a lo asumido | Media | Alto | Confirmar con el gimnasio antes del hito 2 |
| Descuento al reservar vs al asistir mal interpretado | Media | Alto | Resolver la pregunta abierta antes de /plan |
| Fecha fin ambigua (meses vs 30 días) | Media | Medio | Confirmar regla de cálculo |
| Pérdida de datos al migrar programas | Baja | Bajo (fase de prueba) | Migrar o descartar según se decida |

---
*Status: DRAFT — requirements only. Implementation planning pending via /plan.*
