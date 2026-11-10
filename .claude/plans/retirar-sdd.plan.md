# Plan: Retirar SDD — Hito 1 (dejar de crear specs)

**Source PRD**: `.claude/prds/retirar-sdd.prd.md`
**Selected Milestone**: 1 — Dejar de crear specs
**Complexity**: Small

## Summary
Eliminar de `CLAUDE.md` la sección 11 (flujo SDD) y reemplazarla por una nota breve del flujo vigente (PRD → `/plan` → implementación) que indique explícitamente no crear `docs/specs/*.spec.md`. Los specs y ADR-001 no se tocan (eso es el hito 2).

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Naming | `CLAUDE.md` (secciones `## N. Título`) | Secciones numeradas en español, separadas por `---` |
| Docs | `CLAUDE.md:372-436` | Bloque a reemplazar: `## 11. Flujo de Trabajo SDD` hasta el fin del archivo |
| Tests | — | No aplica: es un cambio solo de documentación; no existe patrón de tests para docs |

Hallazgo: el PRD mencionaba "el checklist SDD de la sección 9", pero la sección 9 (Checklist General) **no** contiene ítems SDD. El único checklist SDD está dentro de la sección 11, así que se elimina junto con ella.

## Files to Change
| File | Action | Why |
|---|---|---|
| `CLAUDE.md` | UPDATE | Reemplazar sección 11 por "Flujo de Trabajo de Features" (PRD → `/plan`) |
| `.claude/prds/retirar-sdd.prd.md` | UPDATE | Fila del hito 1: `pending` → `in-progress` y enlace al plan; corregir nota sobre la sección 9 |

## Tasks
### Task 1: Reemplazar la sección 11 de `CLAUDE.md`
- **Action**: Borrar desde `## 11. Flujo de Trabajo SDD (Spec Driven Development)` hasta el final y poner `## 11. Flujo de Trabajo de Features` con: (a) flujo `PRD (/plan-prd) → plan (/plan) → implementación → PR`, artefactos en `.claude/prds/` y `.claude/plans/`; (b) regla explícita: no crear `docs/specs/*.spec.md`; (c) los ADR siguen para decisiones arquitectónicas puntuales (ADR-002). Sin mencionar "SDD" ni "Spec Driven" para cumplir la métrica de 0 menciones. Los tests siguen según secciones 5–7.
- **Mirror**: formato de secciones existentes en `CLAUDE.md`.
- **Validate**: `grep -nEi "SDD|spec.driven" CLAUDE.md` no devuelve resultados.

### Task 2: Actualizar el PRD
- **Action**: Hito 1 a `in-progress` con enlace a este plan (ya aplicado). Al terminar, pasarlo a `complete`.
- **Mirror**: formato de la tabla de hitos de `mis-citas-cliente.prd.md`.
- **Validate**: revisión visual del diff.

## Validation
```bash
grep -nEi "SDD|spec.driven" CLAUDE.md          # debe estar vacío
git diff --stat                                  # solo CLAUDE.md y los artefactos de .claude/
npm run lint                                     # sin cambios de código; confirma que no se rompe nada
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Agentes con contexto previo siguen creando specs | Baja | Regla explícita de "no crear specs" en la nueva sección 11 |
| `CLAUDE.md` menciona rutas de `docs/specs` sin contexto | Baja | La nota solo nombra la ruta para prohibir su creación |
| Contradicción con el hito 2 (archivar) | Baja | Hito 2 queda pendiente; este plan no mueve archivos |

## Acceptance
- [ ] `CLAUDE.md` no menciona SDD ni "Spec Driven"
- [ ] La nueva sección 11 declara el flujo PRD → `/plan` y prohíbe crear specs
- [ ] `docs/specs/` y ADR-001 intactos
- [ ] Validación pasa
