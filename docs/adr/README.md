# Architecture Decision Records (ADRs)

Este directorio contiene los Architecture Decision Records de nivel-ui.

Un ADR documenta una **decisión arquitectónica importante**: el contexto que la motivó, la decisión tomada, las alternativas consideradas y las consecuencias esperadas.

## ¿Cuándo crear un ADR?

Crear un ADR cuando la decisión:
- Afecta la estructura de capas (MVVM, Clean Architecture)
- Introduce una nueva dependencia o patrón importante
- Cambia una convención establecida en el proyecto
- Involucra un trade-off no obvio

No crear un ADR para decisiones de implementación rutinarias.

## Índice

| ADR | Título | Estado | Fecha |
|-----|--------|--------|-------|
| [ADR-001](ADR-001-spec-driven-development.md) | Adoptar Spec Driven Development como metodología | Accepted | 2026-04-10 |
| [ADR-002](ADR-002-produccion-mvp-deployment.md) | Estrategia de Despliegue a Producción para el MVP | Proposed | 2026-04-11 |
| [ADR-003](ADR-003-arquitectura-capa-negocio-backend-mvp.md) | Arquitectura de Capa de Negocio Backend para el MVP | Proposed | 2026-04-18 |

## Cómo crear un ADR

1. Copia `TEMPLATE.adr.md` como `ADR-NNN-[titulo-en-kebab-case].md`
   - `NNN` es el siguiente número correlativo (3 dígitos: 001, 002, ...)
2. Rellena todas las secciones
3. Agrega una entrada a la tabla de Índice en este README
4. Abre un PR con el ADR (puede ir junto con la spec o la implementación)

## Ciclo de Vida de un ADR

```
Proposed → Accepted → (Deprecated | Superseded by ADR-NNN)
```

Los ADRs **nunca se eliminan**. Si una decisión cambia, el ADR original se marca como
`Deprecated` o `Superseded by ADR-NNN` y se crea un nuevo ADR con la nueva decisión.
