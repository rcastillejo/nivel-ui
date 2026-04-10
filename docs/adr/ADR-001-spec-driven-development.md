# ADR-001: Adoptar Spec Driven Development (SDD) como metodología de trabajo

**Fecha**: 2026-04-10
**Estado**: Accepted
**Autores**: rcastillejo
**Issues relacionados**: #77

---

## Contexto

El equipo de nivel-ui necesita una metodología de trabajo orientada a agentes de IA que cubra
el ciclo completo de desarrollo: requerimientos → análisis y diseño → implementación →
pruebas → monitoreo.

El mercado de 2025-2026 convergió hacia **Spec Driven Development (SDD)**: una metodología
donde la especificación formal es el artefacto central. Todo el ciclo se genera, valida y
ejecuta a partir de la spec.

El proyecto ya contaba con:
- `CLAUDE.md` como spec de arquitectura (seguida por agentes de IA)
- Vitest configurado para tests unitarios e integración
- Playwright configurado para E2E
- Arquitectura MVVM + Clean Architecture bien definida

Lo que faltaba era formalizar el **flujo de trabajo** que conecta los requerimientos (GitHub
Issues) con la implementación y los tests de manera coherente y reproducible.

## Decisión

Adoptamos **Spec Driven Development** como metodología principal de desarrollo en nivel-ui,
con los siguientes artefactos y flujo:

### Los 3 Artefactos del SDD en nivel-ui

1. **`docs/specs/[feature].spec.md`** — Spec por feature
   - Describe requerimientos, casos de uso (Gherkin), contratos TypeScript y criterios de
     aceptación medibles
   - Es el puente entre el issue de GitHub y el código

2. **`docs/adr/ADR-NNN-[decision].md`** — Architecture Decision Records
   - Documentan decisiones arquitectónicas importantes con su contexto y consecuencias
   - Nunca se eliminan; se deprecan o superseden

3. **Tests como spec ejecutable** (`tests/` y `e2e/`)
   - Los tests unitarios, de integración y E2E son la verificación automática de la spec
   - **Si todos los tests pasan → la spec se cumple**

### Flujo de Trabajo (Issue → PR)

```
1. GitHub Issue (requerimiento en lenguaje natural)
        │
        ▼
2. docs/specs/[feature].spec.md   ← Agente genera la spec desde el issue
   - Casos de uso Gherkin
   - Contratos TypeScript
   - Criterios de aceptación
        │
        ▼
3. docs/adr/ADR-NNN.md (si aplica) ← Para decisiones arquitectónicas
        │
        ▼
4. src/core/types/ (interfaces)    ← Contratos definidos en la spec
        │
        ▼
5. Implementación MVVM
   - src/core/models/              ← Lógica de negocio
   - src/core/view-models/         ← Estado de UI
   - src/components/               ← Presentación
        │
        ▼
6. Tests (la spec ejecutable)
   - tests/unit/                   ← Verifica reglas de negocio del Model
   - tests/integration/            ← Verifica flujo Model → Repository
   - e2e/                          ← Verifica criterios de aceptación de la UI
        │
        ▼
7. Pull Request + CI/CD
   - TypeScript check
   - Lint
   - Unit + Integration tests
   - E2E tests
```

### Regla de Oro

> **"La spec es la verdad; el código es su implementación; los tests son su prueba."**

### Cuándo crear una spec

| Situación | ¿Crear spec? |
|-----------|-------------|
| Nueva feature con lógica de negocio | ✅ Siempre |
| Bug fix menor (1-3 líneas) | ❌ No necesario |
| Refactor sin cambio de comportamiento | ❌ No necesario |
| Cambio de UI que afecta flujo de usuario | ✅ Sí |
| Nueva decisión arquitectónica | ✅ ADR (no spec) |

## Consecuencias

### Positivas
- Los agentes de IA tienen un artefacto estructurado para generar código más preciso y
  alineado con los requerimientos
- Las revisiones de PR pueden verificar spec vs. implementación explícitamente
- Los criterios de aceptación son verificables automáticamente mediante tests
- El contexto de "por qué" se preserva en ADRs (evita decisiones repetidas o conflictivas)
- Onboarding más rápido para nuevos colaboradores o agentes

### Negativas / Trade-offs
- Requiere disciplina para crear la spec antes (o durante) de implementar
- Features muy pequeñas pueden no justificar una spec completa
- Riesgo de que la spec quede desactualizada si no se mantiene al día con el código

### Neutras
- Los tests existentes no necesitan cambiar; ya son la spec ejecutable del código actual
- `CLAUDE.md` sigue siendo el contrato de arquitectura para los agentes (no reemplazado)
- El flujo de GitHub Issues → PR no cambia; solo se agrega la spec como artefacto intermedio

## Alternativas Consideradas

### Alternativa 1: Solo TDD (tests como única especificación)

- **Pros**: Más liviano; los tests ya existen y están configurados
- **Contras**: Los tests no capturan el "por qué"; son difíciles de leer para roles no
  técnicos; no cubren el ciclo de requerimientos → diseño
- **Razón de rechazo**: No cierra el ciclo desde el issue hasta el PR de forma explícita

### Alternativa 2: Documentación en Notion/Confluence

- **Pros**: Familiar para equipos; buen editor visual
- **Contras**: Desacoplado del código; se desactualiza; no es legible por agentes de IA
  directamente; no versionado en git
- **Razón de rechazo**: Las specs deben vivir junto al código para mantener coherencia

### Alternativa 3: OpenAPI / Contract-First para toda la app

- **Pros**: Estándar de industria; genera código automáticamente; herramientas maduras
- **Contras**: nivel-ui no expone una API pública actualmente; toda la persistencia es
  localStorage; overhead excesivo para el alcance actual
- **Razón de rechazo**: No aplica bien hasta que exista un backend con API HTTP

## Notas de Implementación

Los siguientes artefactos se crean como parte de este ADR:

```
docs/
├── specs/
│   ├── README.md                    ← Índice de specs + ciclo de vida
│   ├── TEMPLATE.spec.md             ← Plantilla para nuevas specs
│   └── booking-flow.spec.md         ← Primera spec real (flujo de reserva)
└── adr/
    ├── README.md                    ← Índice de ADRs + instrucciones
    ├── TEMPLATE.adr.md              ← Plantilla para nuevos ADRs
    └── ADR-001-spec-driven-development.md  ← Este documento
```

`CLAUDE.md` se actualiza con una nueva sección (§11) que describe el flujo SDD para que
los agentes sigan el proceso correctamente en futuras implementaciones.
