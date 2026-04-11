# ADR-002: Estrategia de Despliegue a Producción para el MVP

**Fecha**: 2026-04-11
**Estado**: Proposed
**Autores**: rcastillejo
**Issues relacionados**: #79

---

## Contexto

Nivel Gym necesita liberar una versión inicial (MVP) del sistema de reservas para
**30 clientes y 2 entrenadores**. Actualmente el proyecto:

- Usa **Next.js 16** con App Router (requiere soporte completo de SSR/RSC para aprovechar sus
  capacidades)
- Persiste datos en **`localStorage`** (client-side only): cada usuario ve solo sus propios datos
- Tiene un script de deploy a **GitHub Pages** (`gh-pages`) configurado en `package.json`
- No tiene backend ni base de datos compartida

### El problema raíz

Un sistema de reservas de gimnasio es inherentemente **multi-usuario compartido**:
- El entrenador necesita ver las reservas de todos los clientes
- Los clientes necesitan ver la disponibilidad actualizada (qué zonas/horarios están llenos)
- `localStorage` es por-dispositivo y por-navegador: no cumple este requerimiento

Cualquier estrategia de despliegue que no resuelva el almacenamiento compartido no constituye
un MVP real, sino una demo.

### Escala del sistema

| Métrica | Valor |
|---------|-------|
| Usuarios clientes | 30 |
| Entrenadores | 2 |
| Total usuarios | ~32 |
| Reservas estimadas/día | ~30-60 (1-2 por cliente) |
| Concurrencia esperada | Baja (< 10 simultáneos) |

Esta escala es **muy pequeña** y encaja cómodamente en los tier gratuitos de cualquier
plataforma moderna.

---

## Decisión

Adoptamos **Opción C: Vercel + Supabase** como la arquitectura de despliegue del MVP, que
resuelve tanto el hosting del frontend Next.js como el almacenamiento de datos compartido
entre usuarios.

### Arquitectura Seleccionada

```
┌─────────────────────────────────────────────────────────┐
│                     Usuario Final                        │
│              (browser: Chrome, Safari, etc.)             │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│                      Vercel                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Next.js 16 App (Edge/Serverless)        │   │
│  │  - Server Components (RSC)                       │   │
│  │  - API Routes (si se necesitan)                  │   │
│  │  - Static Assets (Tailwind CSS, imágenes)        │   │
│  └─────────────────────────────────────────────────┘   │
│  CI/CD: Push a main → deploy automático                  │
└───────────────────────┬─────────────────────────────────┘
                        │ PostgreSQL / Supabase JS SDK
                        ▼
┌─────────────────────────────────────────────────────────┐
│                     Supabase                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │     Auth     │  │   Realtime   │  │
│  │  (reservas,  │  │  (clientes,  │  │  (opcional:  │  │
│  │  horarios,   │  │  entrenador) │  │  notif. live)│  │
│  │  zonas)      │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Cambios arquitectónicos necesarios en el código

Migrar de `LocalStorageDataService` a `SupabaseDataService` implementando la misma interfaz
`IDataService`, sin modificar Models ni ViewModels (principio OCP):

```
src/core/
├── repositories/
│   ├── LocalStorageDataService.ts    ← Se mantiene (desarrollo local)
│   └── SupabaseDataService.ts        ← NUEVO: implementa IDataService
└── types/
    └── index.ts                      ← Sin cambios (interfaces ya definidas)
```

---

## Opciones Evaluadas

### Opción A: GitHub Pages (situación actual)

**Descripción**: Exportación estática de Next.js (`next export`) desplegada en GitHub Pages.

**Costo**: $0/mes

**Pros**:
- Ya está configurado (`gh-pages` en `package.json`, homepage en GitHub Pages)
- Cero costo, cero configuración nueva
- Ideal para sitios puramente estáticos
- CDN global incluido

**Contras**:
- Solo soporta exportación estática: pierde App Router (RSC, Server Actions, API Routes)
- `localStorage` sigue siendo el almacenamiento → sin datos compartidos entre usuarios
- No es un MVP real: el entrenador no puede ver las reservas de los clientes
- Limitaciones de Next.js con `output: 'export'`: no hay middleware, no hay rutas dinámicas con ISR

**Razón de rechazo**: No resuelve el problema fundamental de datos compartidos. Es adecuado
para una demo/portfolio, no para un sistema de reservas real.

---

### Opción B: Vercel (solo frontend)

**Descripción**: Deploy del frontend Next.js en Vercel, manteniendo `localStorage`.

**Costo**: $0/mes (Free tier)

**Pros**:
- Soporte nativo de Next.js App Router (creado por el mismo equipo de Vercel)
- Deploy automático en cada push a `main`
- Preview deployments en cada PR
- Serverless Functions incluidas (Edge y Node.js)
- SSL/HTTPS automático
- CDN global (200+ edge locations)
- Analytics básicos incluidos

**Contras**:
- `localStorage` sigue siendo el almacenamiento → sin datos compartidos
- No es un MVP real por la misma razón que la Opción A

**Razón de rechazo**: Mejora el hosting pero no resuelve el problema raíz de datos compartidos.
Es un paso intermedio, no una solución completa.

---

### Opción C: Vercel + Supabase ✅ SELECCIONADA

**Descripción**: Next.js en Vercel + base de datos PostgreSQL + Auth en Supabase.

**Costo**: $0/mes (dentro de los tiers gratuitos para la escala del MVP)

| Componente | Tier | Límite gratuito | Uso estimado MVP |
|------------|------|-----------------|------------------|
| Vercel Free | Hobby | 100 GB bandwidth/mes, 100k serverless invocations/mes | < 5 GB, < 10k |
| Supabase Free | Free | 500 MB DB, 2 GB bandwidth, 50k auth users/mes | < 10 MB, 32 users |

**Pros**:
- Resuelve el problema raíz: datos compartidos entre los 32 usuarios
- Supabase incluye **autenticación** (email/password, magic links) sin costo adicional
- Supabase incluye **Realtime**: el entrenador puede ver reservas en tiempo real
- PostgreSQL es robusto y escalable cuando el negocio crezca
- SDK de JavaScript oficial (`@supabase/supabase-js`) con tipos TypeScript generados
- Row Level Security (RLS) de PostgreSQL permite políticas de acceso por rol (cliente vs entrenador)
- CI/CD nativo desde GitHub en Vercel
- Preview deployments en cada PR
- Supabase tiene interfaz de administración web (no se necesita cliente SQL)
- Migración gradual: `IDataService` ya está definida; solo se implementa `SupabaseDataService`

**Contras**:
- Requiere migrar `LocalStorageDataService` → `SupabaseDataService` (trabajo de desarrollo)
- Añade una dependencia externa (Supabase) al proyecto
- El tier gratuito de Supabase pausa proyectos inactivos después de 1 semana sin uso
  (solucionable con el plan Pro a $25/mes cuando sea necesario)
- Requiere configurar variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- La autenticación debe integrarse en el flujo de usuario (nueva pantalla de login)

**Cuando escalar (costo)**:

| Escenario | Plataforma | Costo |
|-----------|------------|-------|
| MVP (< 32 usuarios, desarrollo activo) | Vercel Free + Supabase Free | $0/mes |
| Crecimiento (> 500k req/mes en Vercel) | Vercel Pro + Supabase Free | $20/mes |
| Crecimiento (> 500 MB DB o sin pausa) | Vercel Free + Supabase Pro | $25/mes |
| Producción estable | Vercel Pro + Supabase Pro | $45/mes |

---

### Opción D: Railway / Render (alternativa fullstack)

**Descripción**: Plataformas PaaS que corren el servidor Next.js en contenedores + base de datos.

**Costo**: ~$5-15/mes (sin tier gratuito significativo para uso continuo)

**Pros**:
- Control total del servidor (útil si se necesita lógica server-side compleja)
- PostgreSQL incluido
- Railway tiene CLI amigable

**Contras**:
- Costo mensual desde el inicio (~$5/mes mínimo)
- Más complejidad de configuración que Vercel
- No tiene el mismo nivel de integración con Next.js que Vercel
- Overkill para 32 usuarios

**Razón de rechazo**: Tiene costo desde el inicio y mayor complejidad sin ventajas adicionales
sobre Vercel + Supabase para esta escala.

---

### Opción E: AWS / GCP / Azure

**Descripción**: Infraestructura cloud completa (EC2/Cloud Run + RDS/Cloud SQL).

**Costo**: $30-100+/mes

**Pros**:
- Máxima flexibilidad y control
- Escalabilidad prácticamente ilimitada
- SLAs de enterprise

**Contras**:
- Complejidad de configuración muy alta (VPC, IAM, load balancers, etc.)
- Costo desproporcionado para 32 usuarios
- Requiere DevOps/SRE dedicado
- Tiempo de setup de semanas, no horas

**Razón de rechazo**: Totalmente fuera de escala para un MVP con 32 usuarios. Se puede
considerar cuando el negocio escale significativamente.

---

## Consecuencias

### Positivas
- Los 32 usuarios comparten datos reales: el sistema funciona como un verdadero sistema de reservas
- Autenticación incluida: los usuarios tienen cuentas reales (no anónimas)
- El entrenador puede ver en tiempo real las reservas de los clientes
- Costo $0/mes para el MVP
- CI/CD automático: cada push a `main` despliega automáticamente
- La arquitectura MVVM permanece intacta: solo se agrega `SupabaseDataService`
- PostgreSQL permite queries complejas que localStorage no soporta (ej: "reservas de la zona gym esta semana")

### Negativas / Trade-offs
- **Trabajo de migración**: Implementar `SupabaseDataService` requiere una tarea de desarrollo
  (estimado: 1-3 días de trabajo)
- **Pausa por inactividad**: Supabase Free pausa proyectos sin actividad por 7 días; durante
  el desarrollo activo no es problema, pero hay que tenerlo en cuenta para el MVP en producción
- **Variables de entorno**: Se deben gestionar en Vercel Dashboard y no exponer en el repo
- **Autenticación**: Requiere una pantalla de login que actualmente no existe en el UI

### Neutras
- `LocalStorageDataService` se mantiene para desarrollo local y tests
- La arquitectura MVVM + Clean Architecture no cambia
- Los tests unitarios existentes no necesitan modificación (usan mocks de `IDataService`)

---

## Notas de Implementación

### Paso 1: Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Crear el schema de base de datos:

```sql
-- Tabla de reservas
create table bookings (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references auth.users(id),
  client_name text not null,
  trainer_id text not null,
  date date not null,
  time_slot text not null,
  zone text not null,
  status text default 'confirmed',
  created_at timestamptz default now()
);

-- Tabla de disponibilidad de entrenadores
create table trainer_schedules (
  id uuid default gen_random_uuid() primary key,
  trainer_id text not null,
  date date not null,
  available_slots jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Row Level Security
alter table bookings enable row level security;

-- Clientes solo ven sus reservas; entrenadores ven todas
create policy "clients see own bookings" on bookings
  for select using (auth.uid() = client_id);

create policy "trainers see all bookings" on bookings
  for select using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
      and raw_user_meta_data->>'role' = 'trainer'
    )
  );
```

### Paso 2: Implementar SupabaseDataService

Crear `src/core/repositories/SupabaseDataService.ts` implementando `IDataService`:

```typescript
// src/core/repositories/SupabaseDataService.ts
import { createClient } from '@supabase/supabase-js';
import type { IDataService } from '@/core/types';

export class SupabaseDataService implements IDataService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  bookings = {
    getByDate: async (date: string) => {
      const { data } = await this.supabase
        .from('bookings')
        .select('*')
        .eq('date', date);
      return data ?? [];
    },
    save: async (booking: Booking) => {
      await this.supabase.from('bookings').upsert(booking);
    },
    // ... resto de métodos
  };
}
```

### Paso 3: Configurar Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Conectar el proyecto
vercel link

# Agregar variables de entorno
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Paso 4: Variables de entorno locales

Agregar a `.env.local` (no commitear):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

Agregar `.env.local` a `.gitignore` (verificar que ya esté).

### Paso 5: Selector de DataService según entorno

```typescript
// src/core/providers/DataProvider.tsx
import { SupabaseDataService } from '@/core/repositories/SupabaseDataService';
import { LocalStorageDataService } from '@/core/repositories/LocalStorageDataService';

const dataService = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new SupabaseDataService()
  : new LocalStorageDataService();
```

### Tareas de implementación derivadas de este ADR

- [ ] Instalar `@supabase/supabase-js`
- [ ] Crear schema SQL en Supabase Dashboard
- [ ] Implementar `SupabaseDataService` (Issue nuevo recomendado)
- [ ] Agregar pantalla de login/autenticación (Issue nuevo recomendado)
- [ ] Configurar Vercel y conectar con el repositorio de GitHub
- [ ] Configurar variables de entorno en Vercel Dashboard
- [ ] Actualizar `DataProvider` para seleccionar el servicio según entorno
- [ ] Verificar que `.env.local` esté en `.gitignore`
