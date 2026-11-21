# Plan: Retirar SDD — Hito 1 (dejar de crear specs y quitar workflows de Claude)

**Source PRD**: `.claude/prds/retirar-sdd.prd.md`
**Selected Milestone**: 1 — Dejar de crear specs
**Complexity**: Small

## Summary
Quitar el flujo SDD de `CLAUDE.md` (sección 11) y reemplazarlo por el flujo vigente (PRD → `/plan` → implementación). Además, eliminar los workflows que hacen que Claude comente o revise en GitHub (`claude.yml` y `claude-code-review.yml`), que ya no se necesitan; el segundo además se basa en specs y en archivos que no existen. Specs y ADR-001 no se tocan (hito 2).

## Files to Change
| File | Action | Why |
|---|---|---|
| `CLAUDE.md` | UPDATE | Reemplazar sección 11 (líneas 372 al final) por "Flujo de Trabajo de Features" |
| `.github/workflows/claude-code-review.yml` | DELETE | Revisión automática de PR contra specs; cita `requirements.md`, `design.md` y `tasks.md`, que no existen |
| `.github/workflows/claude.yml` | DELETE | Responde a menciones `@claude` en issues y PR; ya no se usa |
| `.claude/prds/retirar-sdd.prd.md` | UPDATE | Incluir los workflows en el alcance y marcar el hito 1 como `complete` al terminar |

Ningún otro archivo del repo referencia esos dos workflows (verificado con búsqueda).

## Tasks
### Task 1: Reemplazar la sección 11 de `CLAUDE.md`
- **Action**: Borrar desde `## 11. Flujo de Trabajo SDD (Spec Driven Development)` hasta el final. Poner `## 11. Flujo de Trabajo de Features` con el flujo `/plan-prd → /plan → implementación → PR` (artefactos en `.claude/prds/` y `.claude/plans/`), la regla "no crear `docs/specs/*.spec.md`", ADR solo para decisiones arquitectónicas puntuales, y los checklists de las secciones 1 a 9. Sin las palabras "SDD" ni "Spec Driven".
- **Validate**: `grep -nEi "SDD|spec.driven" CLAUDE.md` sin resultados.

### Task 2: Eliminar los workflows de Claude
- **Action**: `git rm .github/workflows/claude.yml .github/workflows/claude-code-review.yml`.
- **Validate**: `ls .github/workflows` ya no los lista; `ci.yml`, `deploy.yml`, `supabase-migrate.yml` y `sync-lockfile.yml` quedan intactos.

### Task 3: Actualizar el PRD
- **Action**: Alcance y fila del hito 1 con los workflows; al cerrar, estado `complete`.

## Validation
```bash
grep -nEi "SDD|spec.driven" CLAUDE.md
ls .github/workflows
git diff --stat main                      # solo CLAUDE.md, los 2 workflows y el PRD
npm run lint
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Se pierde la respuesta a `@claude` en GitHub | Cierta (es lo pedido) | Intencional; se puede restaurar desde git |
| Secret `CLAUDE_CODE_OAUTH_TOKEN` queda sin uso | Cierta | Eliminarlo a mano en Settings → Secrets (no se puede desde el repo); `GIT_HUB_PAT` se conserva porque lo usa `sync-lockfile.yml` |
| Agentes con contexto previo siguen creando specs | Baja | Regla explícita en la nueva sección 11 |

## Acceptance
- [ ] `CLAUDE.md` sin menciones de SDD; nueva sección 11 con el flujo PRD → `/plan`
- [ ] `claude.yml` y `claude-code-review.yml` eliminados
- [ ] `docs/specs/` y ADR-001 intactos
- [ ] Validación pasa
