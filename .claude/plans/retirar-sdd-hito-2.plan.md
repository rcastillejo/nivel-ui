# Plan: Retirar SDD — Hito 2 (archivar specs y ADR-001)

**Source PRD**: `.claude/prds/retirar-sdd.prd.md`
**Selected Milestone**: 2 — Archivar artefactos SDD
**Complexity**: Small

## Summary
Mover `docs/specs/` y `ADR-001` a `docs/archive/` (conservando el historial con `git mv`) y arreglar los enlaces que se rompen. ADR-002 y la plantilla de ADR se quedan en `docs/adr/`. No hay código ni CI involucrado.

## Decisiones propuestas (confirmar o corregir)
| Pregunta abierta del PRD | Propuesta |
|---|---|
| ¿ADR-001 se archiva sin cambios o como `superseded`? | Archivarlo y cambiar solo su línea `Estado` a `Superseded` (una línea). Así el índice de ADR sigue siendo veraz |
| ¿Limpiar referencias a SDD en `docs/adr/README.md` y en `mis-citas-cliente.prd.md`? | Sí: actualizar enlaces y estado; no reescribir contenido |
| `TEMPLATE.spec.md` y el README de specs | Se archivan junto con las specs (un solo movimiento); no se borran |

## Estructura destino
Se espeja la estructura para que los enlaces entre specs y ADR-001 sigan válidos:
```
docs/archive/specs/   ← las 6 specs + TEMPLATE.spec.md + README.md
docs/archive/adr/     ← ADR-001-spec-driven-development.md
docs/adr/             ← ADR-002, TEMPLATE.adr.md, README.md (se quedan)
```

## Files to Change
| File | Action | Why |
|---|---|---|
| `docs/specs/*` (8 archivos) | MOVE → `docs/archive/specs/` | Specs del flujo retirado |
| `docs/adr/ADR-001-spec-driven-development.md` | MOVE → `docs/archive/adr/` + `Estado: Superseded` | Decisión de un flujo retirado |
| `auth`, `supabase-data-service`, `supabase-schema`, `vercel-deployment` (`.spec.md`) | UPDATE | 2 enlaces cada una: `../adr/ADR-002…` → `../../adr/ADR-002…` (8 en total) |
| `client-appointments.spec.md` | UPDATE | Enlace al PRD: `../../.claude/…` → `../../../.claude/…` |
| `booking-flow.spec.md` | SIN CAMBIO | Su enlace a ADR-001 (`../adr/ADR-001…`) sigue válido por la estructura espejo |
| `docs/archive/specs/README.md` | UPDATE | Aviso de una línea: archivado, flujo retirado (ver `CLAUDE.md` §11) |
| `docs/adr/README.md` | UPDATE | Fila de ADR-001 → enlace al archivo, estado `Superseded`; paso 4 de "Cómo crear un ADR" sin "junto con la spec" |
| `.claude/prds/mis-citas-cliente.prd.md` | UPDATE | Líneas 42 y 48: `docs/specs/` → `docs/archive/specs/` |
| `.claude/prds/retirar-sdd.prd.md` | UPDATE | Hito 2 `in-progress` con enlace a este plan; `complete` al cerrar |

## Tasks
### Task 1: Mover archivos
- **Action**: `mkdir -p docs/archive`; `git mv docs/specs docs/archive/specs`; `mkdir docs/archive/adr`; `git mv docs/adr/ADR-001-spec-driven-development.md docs/archive/adr/`.
- **Validate**: `git status` muestra solo renames (`R`), sin borrados ni altas sueltas.

### Task 2: Arreglar enlaces y estado
- **Action**: Aplicar las ediciones de la tabla anterior (enlaces, `Estado: Superseded`, aviso del README archivado, índice de ADR, PRD de "Mis citas").
- **Validate**: script de enlaces (abajo) sin rotos.

### Task 3: Cerrar el hito
- **Action**: Hito 2 a `complete` en el PRD.

## Validation
```bash
# Todos los enlaces relativos de los .md tocados deben apuntar a archivos que existan
python3 -I - <<'PY'
import re, pathlib
bad = []
for p in list(pathlib.Path("docs").rglob("*.md")) + list(pathlib.Path(".claude/prds").glob("*.md")):
    for m in re.finditer(r"\]\(([^)#\s]+)", p.read_text()):
        t = m.group(1)
        if t.startswith(("http", "mailto")): continue
        if not (p.parent / t).resolve().exists(): bad.append((str(p), t))
print("ROTOS:", bad if bad else "ninguno")
PY
ls docs docs/archive docs/adr
git status --short | head -30
npm run lint
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Enlaces rotos tras mover | Media | Estructura espejo + script de validación de enlaces |
| Pérdida de historial de los archivos | Baja | `git mv` (los renames se conservan en `git log --follow`) |
| ADR-002 (`Proposed`) queda enlazado desde specs archivadas | Baja | Los enlaces se corrigen a `../../adr/`; ADR-002 no se toca |

## Acceptance
- [ ] `docs/specs/` ya no existe; `docs/archive/specs/` y `docs/archive/adr/` contienen lo movido
- [ ] Script de enlaces: "ninguno" roto
- [ ] `docs/adr/` conserva ADR-002, plantilla y README; ADR-001 figura como `Superseded`
- [ ] Hito 2 `complete` en el PRD
