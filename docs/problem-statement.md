# Problem Statement — Nivel Gym Booking System

## El Problema

**Nivel Gym** es un gimnasio pequeño en crecimiento con **2 entrenadores** y **30 clientes activos**. El equipo necesita un sistema digital para gestionar reservas de sesiones de entrenamiento, pero el prototipo actual tiene una limitación crítica: **los datos viven solo en el dispositivo del usuario** (localStorage), lo que hace imposible la coordinación entre clientes y entrenadores.

### Síntomas concretos

| Síntoma | Impacto |
|---------|---------|
| Cada dispositivo tiene su propia "vista" de reservas | Los entrenadores no ven las reservas hechas por los clientes |
| No hay autenticación | Cualquier persona puede acceder como cliente o entrenador |
| El control de aforo opera solo con datos locales | Doble reserva posible entre dispositivos distintos |
| Los datos se pierden al borrar el navegador | Pérdida de historial de reservas y programas |

---

## Audiencia Objetivo

| Rol | Cantidad | Necesidad principal |
|-----|----------|---------------------|
| **Entrenadores** | 2 (Diego Lamas, Jeanpierre Casas) | Ver citas del día, gestionar horarios, crear programas de entrenamiento |
| **Clientes** | 30 | Reservar sesiones, ver su programa activo, conocer disponibilidad real |

---

## Estado Actual (MVP Local)

El sistema funciona en modo **single-device demo**:

- ✅ Reserva de sesiones con selección de fecha, horario, entrenador y zona (Gym / Gabinete)
- ✅ Control de aforo: Gym (máx. 10/slot/entrenador), Gabinete (máx. 1/slot global)
- ✅ Gestión de programas de entrenamiento (crear, renovar, historial)
- ✅ Vista de citas del entrenador con filtros por horario y zona
- ✅ Arquitectura MVVM + Clean Architecture lista para escalar
- ❌ Sin backend compartido — datos no sincronizados entre usuarios
- ❌ Sin autenticación — sin roles, sin protección de rutas

---

## Estado Objetivo (MVP de Producción)

Migrar a una arquitectura compartida **sin costo operativo** para el MVP:

```
Cliente/Entrenador (browser)
    ↕ HTTPS
Vercel (Next.js 16, App Router)
    ↕ Supabase SDK
Supabase (PostgreSQL + Auth + RLS)
```

### Capacidades requeridas

1. **Autenticación**: Login con email + contraseña vía Supabase Auth
2. **Roles**: Cliente → ruta `/client`, Entrenador → ruta `/trainer`
3. **Datos compartidos**: Reservas y programas visibles para todos los usuarios autorizados
4. **Seguridad por fila (RLS)**: Clientes ven solo sus propias reservas; entrenadores ven todo
5. **Deploy automático**: Merge a `main` → deploy en Vercel sin intervención manual

---

## Restricciones Técnicas

| Restricción | Justificación |
|-------------|---------------|
| **Costo $0/mes** | El gimnasio es un negocio en etapa MVP, sin presupuesto para infraestructura |
| **Stack actual** | Next.js 16 + TypeScript + MobX ya en producción; no cambiar framework |
| **IDataService existente** | `LocalStorageDataService` e `IDataService` deben mantenerse; `SupabaseDataService` es una nueva implementación que coexiste |
| **Supabase Free tier** | Pausa tras 7 días de inactividad; aceptable para MVP con 30 usuarios |
| **GitHub Actions** | CI/CD ya configurado; el nuevo deploy debe integrarse sin reemplazar el flujo |

---

## Métricas de Éxito del MVP de Producción

| Métrica | Criterio de aceptación |
|---------|------------------------|
| **Disponibilidad** | El sistema responde a peticiones HTTP con status 200 en producción |
| **Autenticación** | Un cliente puede iniciar sesión y hacer una reserva; un entrenador puede ver la reserva |
| **Integridad de datos** | La misma reserva es visible desde dos dispositivos distintos tras reload |
| **Control de aforo** | No es posible crear dos reservas de Gabinete para el mismo slot desde dispositivos distintos |
| **Costo** | Infraestructura Vercel + Supabase en tier gratuito (≤ $0/mes) |

---

## Hoja de Ruta — Dependencias entre Features

Los artefactos SDD en `docs/specs/` siguen este orden de implementación:

```
1. supabase-schema.spec.md      → Tablas, RLS, seed data
        ↓
2. supabase-data-service.spec.md → SupabaseDataService implements IDataService
        ↓
3. auth.spec.md                 → AuthViewModel, login page, route guards
        ↓
4. vercel-deployment.spec.md    → Variables de entorno, security headers, smoke tests
```

---

## ADRs Relacionados

- [ADR-001 — Spec Driven Development](./adr/ADR-001-spec-driven-development.md): Define el flujo de trabajo y los artefactos SDD que rigen este proyecto.
- [ADR-002 — Deployment MVP (Vercel + Supabase)](./adr/ADR-002-produccion-mvp-deployment.md): Justifica la elección de Vercel + Supabase sobre alternativas como Railway, PlanetScale o AWS.
