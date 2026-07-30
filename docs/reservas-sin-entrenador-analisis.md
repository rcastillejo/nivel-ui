# Análisis Funcional: Reserva de Citas en Nivel Gym
### ¿Debería el cliente elegir entrenador al reservar?

**Versión:** 1.0  
**Fecha:** Abril 2026  
**Audiencia:** Propietario / Administración del gimnasio

---

## El Contexto: ¿Cómo funciona hoy?

Actualmente, cuando un cliente reserva una cita en Nivel Gym, el flujo es el siguiente:

```
El cliente entra al sistema
        │
        ▼
📅 Elige una fecha en el calendario
        │
        ▼
👤 Ve la lista de entrenadores disponibles
   y elige a cuál quiere ir y a qué hora
        │
        ▼
🏋️ Elige la zona (Gym o Gabinete)
        │
        ▼
✅ Confirma su reserva
```

**La pregunta que se plantea:** ¿Es necesario que el cliente vea y elija al entrenador? ¿O sería mejor que simplemente elija una hora y el sistema (o el equipo del gimnasio) se encargue del resto?

---

## ¿Por qué considerar este cambio?

Mostrar los entrenadores tiene ventajas, pero también genera fricciones:

| Situación actual | Posible mejora |
|---|---|
| El cliente tiene que decidir quién lo atiende | El cliente solo elige cuándo ir |
| Si el entrenador favorito no está, el cliente puede desanimarse | Cualquier horario disponible sirve |
| La pantalla de reserva puede parecer compleja | Una grilla simple de horarios es más fácil |
| El gimnasio depende de que el cliente conozca a los entrenadores | El equipo se organiza internamente |

---

## Las Opciones Disponibles

Se evaluaron cuatro formas de manejar esta situación. A continuación se explica cada una en términos prácticos.

---

### Opción 1 — El sistema asigna un entrenador automáticamente

El cliente **no ve ni elige** a ningún entrenador. Simplemente ve los horarios disponibles y elige uno. El sistema, en el momento de confirmar, asigna automáticamente al entrenador que tenga menor carga ese día.

**Cómo lo viviría el cliente:**

```
📅 Elige la fecha
        │
        ▼
🕐 Ve los horarios disponibles
   ┌────────────────────────────────┐
   │  9:00 AM    10:00 AM           │
   │  11:00 AM   12:00 PM           │
   └────────────────────────────────┘
        │
        ▼
🏋️ Elige la zona (Gym o Gabinete)
        │
        ▼
✅ Confirma — El sistema asigna entrenador
        │
        ▼
📋 Reserva confirmada:
   "Tu sesión está agendada para el
    Lunes 7 de Abril a las 10:00 AM
    en el Gym ✅"
```

**Cómo lo viviría el entrenador:**

```
📆 Revisa su agenda como siempre
        │
        ▼
📋 Ve sus citas (asignadas automáticamente)
   — Nombre del cliente
   — Fecha y hora
   — Zona
        │
        ▼
✅ Sin cambios en su flujo de trabajo
```

**Regla de asignación automática:**
```
Horario seleccionado: 10:00 AM del Lunes

Entrenadores disponibles a esa hora:
  ├── Entrenador A → tiene 2 citas ese día
  ├── Entrenador B → tiene 1 cita ese día  ← se asigna (menor carga)
  └── Entrenador C → tiene 3 citas ese día
```

**Resumen:**

| ✅ Ventajas | ⚠️ Consideraciones |
|---|---|
| Experiencia muy simple para el cliente | El cliente no sabe con quién entrenará de antemano |
| Distribución equitativa de trabajo entre entrenadores | Si el cliente tiene preferencia, no puede expresarla |
| No cambia el flujo interno del entrenador | — |
| Confirmación inmediata | — |

---

### Opción 2 — Reserva por zona, sin entrenador asignado

El cliente reserva un lugar en una zona (Gym o Gabinete) en un horario. **No se asigna ningún entrenador.** Los entrenadores disponibles ven todos los clientes que llegaron a su zona y se organizan entre ellos para atenderlos.

Este modelo funciona como una **clase grupal** o un **piso de gimnasio abierto**.

**Cómo lo viviría el cliente:**

```
📅 Elige la fecha
        │
        ▼
🕐 Elige el horario
        │
        ▼
🏋️ Elige la zona (Gym o Gabinete)
        │
        ▼
✅ Confirma
        │
        ▼
📋 Reserva de espacio confirmada
   "Tienes un lugar reservado en el Gym
    el Lunes 7 de Abril a las 10:00 AM"
```

**Cómo lo viviría el entrenador:**

```
📆 Revisa la agenda del día
        │
        ▼
📋 Ve TODOS los clientes en la zona/horario
   ┌──────────────────────────────────────┐
   │  Lunes 7 de Abril — 10:00 AM         │
   │                                       │
   │  🏋️ GYM  (3 de 10 lugares ocupados)  │
   │  ├── 👤 María García                  │
   │  ├── 👤 Carlos López                  │
   │  └── 👤 Ana Martínez                  │
   │                                       │
   │  🚪 GABINETE (1 de 1 lugar)          │
   │  └── 👤 Pedro Ruiz                    │
   └──────────────────────────────────────┘
        │
        ▼
🤝 Los entrenadores coordinan entre ellos
   quién cubre cada zona ese horario
```

**Resumen:**

| ✅ Ventajas | ⚠️ Consideraciones |
|---|---|
| Máxima flexibilidad para el equipo del gimnasio | No queda registro de quién atendió a quién |
| Los entrenadores ven la demanda real por zona | Requiere coordinación manual entre el equipo |
| Modelo natural para clases grupales o gym libre | Si un entrenador falta, los clientes podrían quedar sin atención |
| Experiencia muy simple para el cliente | Hay que definir cuántos clientes caben por zona/horario |

---

### Opción 3 — Reserva pendiente, el gimnasio asigna después

El cliente reserva fecha, hora y zona. La reserva queda en estado **"pendiente"**. Un administrador o el equipo del gimnasio asigna el entrenador manualmente antes de la sesión y el cliente recibe confirmación.

**Flujo para el cliente:**

```
📅 Elige fecha + hora + zona
        │
        ▼
✅ Confirma → Reserva en estado "Pendiente"
        │
        ▼
⏳ Espera confirmación del gimnasio
        │
        ▼
📧 Recibe notificación cuando se le asigna entrenador
        │
        ▼
✅ Reserva confirmada
```

**Flujo para el gimnasio/admin:**

```
📋 Ve las reservas pendientes del día/semana
        │
        ▼
👤 Asigna entrenador disponible a cada reserva
        │
        ▼
✅ Reserva confirmada → Cliente notificado
```

**Resumen:**

| ✅ Ventajas | ⚠️ Consideraciones |
|---|---|
| Control total del gimnasio sobre quién atiende a quién | Requiere un panel de administración (no existe aún) |
| Permite ajustes manuales para casos especiales | El cliente no tiene confirmación inmediata |
| Flexibilidad total en la organización del equipo | Mayor carga operativa para el gimnasio |

---

### Opción 4 — El entrenador es opcional (recomendada como balance)

Por defecto, el cliente **no necesita elegir entrenador**. Sin embargo, si lo desea, puede expandir una sección opcional para indicar su preferencia. Si no tiene preferencia, el sistema asigna automáticamente.

**Flujo para el cliente:**

```
📅 Elige fecha
        │
        ▼
🕐 Elige horario disponible
        │
        ▼
        ┌────────────────────────────────────────┐
        │  ¿Tienes preferencia de entrenador?    │
        │  (opcional)                      ▼     │
        │                                        │
        │  ◉ Sin preferencia (recomendado)        │
        │  ○ Entrenador A                         │
        │  ○ Entrenador B                         │
        └────────────────────────────────────────┘
        │
        ▼
🏋️ Elige zona
        │
        ▼
✅ Confirma
        │
        ├── Con preferencia → se intenta asignar ese entrenador
        └── Sin preferencia → sistema asigna por menor carga
```

**Resumen:**

| ✅ Ventajas | ⚠️ Consideraciones |
|---|---|
| Simple por defecto, flexible para quien lo necesita | Ligeramente más complejo de construir |
| Clientes habituales pueden pedir a su entrenador favorito | Si el entrenador elegido no está disponible, hay que comunicarlo |
| No cambia el modelo de datos ni el flujo del entrenador | — |
| Mejor percepción de servicio personalizado | — |

---

## Comparativa de las 4 Opciones

| Criterio | Opción 1 Auto-asigna | Opción 2 Zona Libre | Opción 3 Admin Asigna | Opción 4 Opcional ⭐ |
|---|:---:|:---:|:---:|:---:|
| Experiencia simple para el cliente | ✅ | ✅ | ⚠️ | ✅ |
| Confirmación inmediata | ✅ | ✅ | ❌ | ✅ |
| Control del gimnasio sobre asignaciones | ⚠️ | ⚠️ | ✅ | ✅ |
| Registro de quién atendió | ✅ | ❌ | ✅ | ✅ |
| El cliente puede expresar preferencia | ❌ | ❌ | ❌ | ✅ |
| Esfuerzo para construirlo | Bajo | Medio | Alto | Medio |
| Cambios en el sistema actual | Mínimos | Medios | Grandes | Mínimos |

---

## Preguntas Clave para Decidir

Antes de elegir la opción, conviene responder estas preguntas sobre cómo opera el gimnasio:

**1. ¿Los clientes tienen entrenadores favoritos o asisten sin preferencia?**
- Si la mayoría tiene preferencia → considerar Opción 4
- Si la mayoría va sin preferencia → Opción 1 es suficiente

**2. ¿Cómo se organiza el equipo de entrenadores hoy?**
- ¿Cada entrenador tiene su propia agenda y clientes fijos? → Opción 1 o 4
- ¿Los entrenadores cubren zonas y atienden a quien llegue? → Opción 2

**3. ¿El gimnasio necesita saber, después de la sesión, qué entrenador atendió a cada cliente?**
- Sí (para reportes, evaluaciones, etc.) → evitar Opción 2
- No es necesario → Opción 2 es viable

**4. ¿Hay disponibilidad para gestionar asignaciones manualmente?**
- Sí, hay un administrador que puede hacerlo → Opción 3 viable
- No, se prefiere todo automático → Opción 1 o 4

---

## Recomendación

### Para empezar rápido: **Opción 1 — Asignación Automática**

Eliminar la selección de entrenador de la pantalla del cliente y dejar que el sistema asigne automáticamente. Es el cambio más rápido de implementar, no requiere rediseñar el sistema y simplifica de inmediato la experiencia.

### Para la mejor experiencia a largo plazo: **Opción 4 — Selección Opcional**

Ofrece lo mejor de ambos mundos: una experiencia simple por defecto, con la posibilidad de que clientes habituales expresen una preferencia. No requiere cambios profundos en el sistema.

### Si el modelo del gimnasio es "zona abierta": **Opción 2**

Si los entrenadores trabajan por zona y no tienen clientes asignados individualmente, la Opción 2 refleja mejor la realidad operativa del negocio.

---

## Próximo Paso

Con base en las preguntas anteriores, definir cuál opción se alinea mejor con el modelo de negocio y comunicarlo al equipo para proceder con la implementación.

---

*Documento elaborado en base al análisis técnico-funcional del sistema Nivel Gym — Abril 2026*
