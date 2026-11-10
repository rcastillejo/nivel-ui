# Retirar SDD (Spec Driven Development)

## Problem
Los agentes de IA que leen `CLAUDE.md` siguen creando `docs/specs/*.spec.md` por la sección 11 (SDD), aunque el mantenedor ya usa PRD + `/plan` (plugin ECC) como flujo de features. Esto genera documentación redundante que el mantenedor considera innecesaria y mantiene dos flujos contradictorios en el repo.

## Evidence
- Observación directa del mantenedor: los agentes crean specs, pero se usan otras skills que producen artefactos más funcionales.
- Existen en el repo `docs/specs/` (6 specs + plantilla + README) y `docs/adr/ADR-001-spec-driven-development.md`.
- Assumption — sin tickets ni métricas; solo observación del mantenedor.

## Users
- **Primary**: mantenedor único del repo y agentes de IA que leen `CLAUDE.md` al implementar features.
- **Not for**: colaboradores externos (no hay hoy).

## Hypothesis
We believe **retirar SDD de `CLAUDE.md` y archivar sus artefactos** will **eliminar la generación de specs innecesarias** for **el mantenedor y los agentes de IA**.
We'll know we're right when **una feature nueva se implementa sin crear ningún `docs/specs/*.spec.md` y `CLAUDE.md` no menciona SDD**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| Specs nuevas creadas por agentes | 0 en las próximas features | Revisión de `docs/specs/` en cada PR |
| Menciones de SDD en `CLAUDE.md` | 0 | Búsqueda de "SDD" / "Spec Driven" |

## Scope
**MVP** — Quitar la sección 11 de `CLAUDE.md` y el checklist SDD de la sección 9; reemplazar por una línea que indique el flujo vigente (PRD → `/plan` → implementación). Los specs y ADR-001 se dejan donde están por ahora, solo dejan de crearse.

**Out of scope**
- ADR-002 y plantilla de ADR — los ADR no son exclusivos de SDD.
- Migrar el contenido de las specs a PRDs — no se quiere más documentación.
- Cambios en código, tests o CI — no relacionados.
- Sección 10 de `CLAUDE.md` ("Ya Implementada") — fuera de este alcance.

## Delivery Milestones
<!-- Status: pending | in-progress | complete -->

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Dejar de crear specs | `CLAUDE.md` ya no instruye SDD y declara el flujo PRD → `/plan` | pending | — |
| 2 | Archivar artefactos SDD | Specs y ADR-001 movidos a `docs/archive/`; referencias en `docs/adr/README.md` y `.claude/prds/mis-citas-cliente.prd.md` actualizadas | pending | — |

## Open Questions
- [ ] Contradicción en las respuestas: "por ahora deja los specs y ADR" vs. "muévelas al archive". Se asume hito 1 ahora y hito 2 después; confirmar si el archivado va en el mismo PR.
- [ ] ¿Archivar ADR-001 sin cambios o marcarlo como `superseded`?
- [ ] ¿Limpiar las referencias a SDD en `docs/adr/README.md` y en `mis-citas-cliente.prd.md`?

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Enlaces rotos al mover specs/ADR | Media | Bajo | Buscar referencias a las rutas antes de mover |
| Agentes siguen creando specs por contexto previo | Baja | Bajo | Mención explícita en `CLAUDE.md` de que no se crean specs |

---
*Status: DRAFT — requirements only. Implementation planning pending via /plan.*
