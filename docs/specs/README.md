# Feature Specs

Este directorio contiene las especificaciones de features de nivel-ui, siguiendo la metodología **Spec Driven Development (SDD)**.

Cada spec describe:
- **Por qué** se necesita la feature (contexto + issue)
- **Qué** hace (casos de uso en Gherkin)
- **Cómo** debe implementarse (contratos TypeScript)
- **Cómo se verifica** (criterios de aceptación → tests ejecutables)

## Índice

| Spec | Feature | Estado | Issue |
|------|---------|--------|-------|
| [booking-flow.spec.md](booking-flow.spec.md) | Flujo de Reserva del Cliente | implemented | — |
| [supabase-schema.spec.md](supabase-schema.spec.md) | Schema SQL y Migraciones en Supabase | draft | TBD |
| [supabase-data-service.spec.md](supabase-data-service.spec.md) | SupabaseDataService — Capa de Persistencia | draft | TBD |
| [auth.spec.md](auth.spec.md) | Autenticación de Usuarios con Supabase Auth | draft | TBD |
| [vercel-deployment.spec.md](vercel-deployment.spec.md) | Configurar Despliegue en Vercel | draft | TBD |

## Ciclo de Vida de una Spec

```
draft → review → accepted → implemented → deprecated
```

| Estado | Significado |
|--------|-------------|
| `draft` | En elaboración, puede cambiar |
| `review` | Pendiente de revisión/aprobación |
| `accepted` | Aprobada, lista para implementar |
| `implemented` | Implementada y verificada por tests |
| `deprecated` | Reemplazada por otra spec |

## Cómo crear una spec

1. Copia `TEMPLATE.spec.md` como `[feature-name].spec.md`
2. Rellena todas las secciones del template
3. Cambia el estado a `draft`
4. Abre un PR con la spec para revisión **antes de implementar**
5. Una vez aprobada, cambia a `accepted` e implementa
6. Al terminar la implementación, cambia a `implemented`

## Regla de Oro

> **"La spec es la verdad; el código es su implementación; los tests son su prueba."**
>
> Si todos los tests del criterio de aceptación pasan → la spec se cumple.
