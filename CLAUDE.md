# CLAUDE.md — Guía para Agentes de IA en nivel-ui

Este archivo define las reglas y convenciones que los agentes de IA deben seguir al proponer o implementar cambios en este proyecto.

## Contexto del Proyecto

**Nivel Gym** es un sistema de reservas de gimnasio construido con:
- **Next.js 16** + App Router
- **TypeScript** (strict)
- **MobX** para estado reactivo
- **Tailwind CSS** para estilos
- **Arquitectura MVVM + Clean Architecture**

---

## 1. Arquitectura — MVVM + Clean Architecture

### Capas obligatorias

```
Presentation  →  ViewModel  →  Model  →  Repository
(src/components, src/app)  (src/core/view-models)  (src/core/models)  (src/core/repositories)
```

### Reglas de arquitectura

- **NUNCA** acceder al repositorio directamente desde un componente o ViewModel. Siempre ir por el Model.
- **NUNCA** poner lógica de negocio en componentes React. Esa lógica va en el Model.
- **NUNCA** poner lógica de UI (loading, error state) en el Model. Esa lógica va en el ViewModel.
- Los **componentes** solo consumen el ViewModel a través de hooks (`useBookingViewModel`, etc.) y muestran datos.
- Los **ViewModels** usan `makeAutoObservable` de MobX y coordinan los Models.
- Los **Models** implementan las reglas de negocio y lanzan `DomainError`s.
- Los **Repositories** solo hacen persistencia (localStorage, API, etc.).

### Checklist de arquitectura para cada cambio

- [ ] ¿El cambio respeta las 4 capas? (Presentation → ViewModel → Model → Repository)
- [ ] ¿La lógica de negocio está solo en `src/core/models/`?
- [ ] ¿El estado de UI (loading, error) está solo en `src/core/view-models/`?
- [ ] ¿Los componentes consumen solo el ViewModel y no el Model directamente?
- [ ] ¿Las nuevas dependencias son inyectadas (no instanciadas dentro de la clase)?
- [ ] ¿Los errores de dominio extienden la clase base en `src/core/types/errors.ts`?

---

## 2. Principios SOLID

### Single Responsibility Principle (SRP)
- Cada clase tiene **una sola razón para cambiar**.
- `BookingModel` → solo lógica de reservas; `BookingViewModel` → solo estado de UI de reservas.
- Si una clase hace más de una cosa, dividirla.

### Open/Closed Principle (OCP)
- Usar interfaces para extender sin modificar.
- Nueva fuente de datos → nueva implementación de `IDataService`, sin tocar el Model.

### Liskov Substitution Principle (LSP)
- Cualquier implementación de `IBookingRepository` debe ser intercambiable sin romper el sistema.

### Interface Segregation Principle (ISP)
- No agregar métodos a `IBookingRepository` que solo necesita `ITrainerRepository`.
- Interfaces pequeñas y específicas por dominio.

### Dependency Inversion Principle (DIP)
- Las clases de alto nivel dependen de **interfaces**, no de implementaciones concretas.
- `BookingModel` depende de `IDataService`, no de `LocalStorageDataService`.

### Checklist SOLID para cada cambio

- [ ] ¿La clase nueva/modificada tiene una sola responsabilidad?
- [ ] ¿Se extiende funcionalidad sin modificar código existente (nueva clase/implementación)?
- [ ] ¿Las dependencias se inyectan via constructor?
- [ ] ¿Se depende de interfaces (`I...`) en lugar de clases concretas?
- [ ] ¿Las interfaces son pequeñas y específicas?

---

## 3. Convenciones de Naming

Seguir siempre el patrón establecido:

| Elemento        | Convención             | Ejemplo                    |
|-----------------|------------------------|----------------------------|
| Interfaces      | Prefijo `I`            | `IBookingRepository`       |
| Models          | Sufijo `Model`         | `BookingModel`             |
| ViewModels      | Sufijo `ViewModel`     | `BookingViewModel`         |
| Components      | PascalCase             | `BookingWizard`            |
| Providers       | Sufijo `Provider`      | `DataProvider`             |
| Hooks           | Prefijo `use`          | `useBookingViewModel`      |
| Errores         | Sufijo `Error`         | `BookingCapacityError`     |
| Archivos types  | `index.ts` o `*.ts`    | `src/core/types/index.ts`  |

---

## 4. TypeScript

- **Nunca usar `any`**. Usar tipos precisos o `unknown` con type guard.
- Todos los métodos públicos deben tener tipos de retorno explícitos.
- Usar `interface` para formas de objetos; `type` para uniones/alias.
- Preferir tipos de dominio sobre primitivos donde sea posible (ej: `ZoneType` en lugar de `string`).

### Checklist TypeScript

- [ ] ¿No hay usos de `any` sin justificación?
- [ ] ¿Los métodos públicos tienen tipos de retorno explícitos?
- [ ] ¿Los nuevos tipos/interfaces están en `src/core/types/`?

---

## 5. Pruebas Unitarias

> **Estado actual**: No hay framework de testing instalado. Se recomienda agregar **Vitest** + **@testing-library/react**.

### Qué probar con pruebas unitarias

- **Models**: Todas las reglas de negocio (validaciones, cálculos, errores de dominio).
- **ViewModels**: Estado observable, acciones, computed values.
- **Repositories**: Lógica de persistencia (con mocks del storage).
- **Utilidades**: Funciones puras.

### Estructura de archivos de test

Los tests viven en carpetas **separadas** de `src/`. El código de producción en `src/` no debe mezclarse con archivos de test.

```
nivel-ui/
├── src/                          ← SOLO código de producción
│   └── core/
│       ├── models/
│       │   └── BookingModel.ts
│       └── view-models/
│           ├── BookingViewModel.ts
│           └── TrainerViewModel.ts
│
├── tests/                        ← Tests unitarios e integración
│   ├── unit/
│   │   └── core/
│   │       ├── models/
│   │       │   └── BookingModel.test.ts
│   │       └── view-models/
│   │           ├── BookingViewModel.test.ts
│   │           └── TrainerViewModel.test.ts
│   └── integration/
│       └── BookingFlow.integration.test.ts
│
└── e2e/                          ← Tests funcionales / E2E (Playwright)
    ├── booking-flow.spec.ts
    ├── trainer-flow.spec.ts
    └── capacity.spec.ts
```

### Ejemplo de test unitario para BookingModel

```typescript
// tests/unit/core/models/BookingModel.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BookingModel } from '@/core/models/BookingModel';
import { BookingCapacityError } from '@/core/types/errors';

const mockDataService = {
  bookings: {
    getByDate: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  },
  trainers: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getSchedule: vi.fn().mockResolvedValue(null),
  }
};

describe('BookingModel.validateBooking', () => {
  it('lanza error si el nombre del cliente está vacío', async () => {
    const model = new BookingModel(mockDataService as any);
    await expect(model.createBooking({
      clientName: '',
      trainerId: '1',
      // ...
    })).rejects.toThrow('El nombre del cliente es requerido');
  });

  it('lanza BookingCapacityError si la zona está llena', async () => {
    // arrange: mock retorna 10 reservas existentes
    // act + assert: expect BookingCapacityError
  });
});
```

### Checklist de pruebas unitarias

- [ ] ¿Cada método público del Model tiene al menos un test?
- [ ] ¿Los casos de error (DomainErrors) están cubiertos?
- [ ] ¿El ViewModel se testea con el Model mockeado?
- [ ] ¿Los tests son deterministas (sin dependencias de tiempo real o localStorage)?
- [ ] ¿Los tests siguen el patrón Arrange-Act-Assert?

---

## 6. Pruebas de Integración

### Qué probar con pruebas de integración

- Flujo completo desde ViewModel hasta Repository (sin mock del repositorio).
- Comportamiento del `LocalStorageDataService` con el `BookingModel`.
- Interacción entre Provider y ViewModel.

### Ejemplo

```typescript
// tests/integration/BookingFlow.integration.test.ts
it('crea una reserva y la persiste en localStorage', async () => {
  const dataService = new LocalStorageDataService();
  await dataService.initialize();
  const model = new BookingModel(dataService);

  const booking = await model.createBooking({ /* datos válidos */ });

  const saved = await dataService.bookings.getAll();
  expect(saved).toContainEqual(expect.objectContaining({ id: booking.id }));
});
```

### Checklist de pruebas de integración

- [ ] ¿El flujo Model → Repository está cubierto con datos reales?
- [ ] ¿Se testea la inicialización del `DataProvider`?
- [ ] ¿Se limpia el estado (localStorage mock) entre tests?

---

## 7. Pruebas Funcionales (E2E)

> Se recomienda **Playwright** para pruebas E2E del flujo de reserva completo.

### Qué probar con E2E

- Flujo de reserva completo: seleccionar fecha → horario → entrenador → zona → confirmar.
- Flujo del entrenador: registrar disponibilidad → ver citas.
- Validaciones visibles en la UI.
- Responsive (mobile/tablet/desktop).

### Estructura sugerida

```
e2e/
├── booking-flow.spec.ts    ← Flujo de reserva del cliente
├── trainer-flow.spec.ts    ← Flujo del entrenador
└── capacity.spec.ts        ← Validaciones de aforo
```

### Ejemplo Playwright

```typescript
// e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test('cliente puede crear una reserva exitosamente', async ({ page }) => {
  await page.goto('/client');

  // Seleccionar fecha
  await page.click('[data-testid="calendar-day-15"]');

  // Seleccionar entrenador y horario
  await page.click('[data-testid="trainer-slot-trainer1-09:00"]');

  // Seleccionar zona
  await page.click('[data-testid="zone-gym"]');

  // Confirmar
  await page.click('[data-testid="confirm-booking"]');

  // Verificar éxito
  await expect(page.locator('[data-testid="success-modal"]')).toBeVisible();
});
```

> Nota: Agregar atributos `data-testid` a los componentes clave para facilitar las pruebas E2E.

### Checklist de pruebas funcionales

- [ ] ¿El happy path de reserva está cubierto en E2E?
- [ ] ¿Los flujos de error (zona llena, fecha pasada) están cubiertos?
- [ ] ¿Los componentes clave tienen `data-testid`?
- [ ] ¿Las pruebas corren en CI (GitHub Actions)?

---

## 8. Manejo de Errores

- Los errores de dominio **siempre** extienden `Error` y se definen en `src/core/types/errors.ts`.
- Solo el **Model** lanza errores de dominio.
- El **ViewModel** los captura y los traduce a `string` para la UI.
- Los **componentes** nunca manejan lógica de errores, solo los muestran.
- Nunca usar `console.error` en producción sin manejo adecuado.

### Checklist de manejo de errores

- [ ] ¿Los nuevos errores de dominio están en `src/core/types/errors.ts`?
- [ ] ¿El ViewModel captura y traduce correctamente los errores?
- [ ] ¿Los componentes muestran `viewModel.error` sin lógica adicional?

---

## 9. Checklist General para Cada PR/Cambio

Antes de proponer o aprobar cualquier cambio, verificar:

### Arquitectura
- [ ] Respeta las 4 capas MVVM + Clean Architecture
- [ ] Sin lógica de negocio en componentes o ViewModels
- [ ] Dependencias inyectadas via constructor

### SOLID
- [ ] Una responsabilidad por clase
- [ ] Depende de interfaces, no implementaciones concretas
- [ ] Extensible sin modificar código existente

### TypeScript
- [ ] Sin uso de `any`
- [ ] Tipos de retorno explícitos en métodos públicos
- [ ] Nuevos tipos en `src/core/types/`

### Naming
- [ ] Sigue convenciones del proyecto (prefijos I, sufijos Model/ViewModel/Provider)

### Pruebas
- [ ] Tests unitarios para lógica nueva en Models y ViewModels
- [ ] Tests de integración para flujos críticos
- [ ] Tests E2E para cambios en la UI del flujo principal

### Errores
- [ ] Errores de dominio en `src/core/types/errors.ts`
- [ ] ViewModel traduce errores a mensajes de UI
- [ ] Componentes solo muestran mensajes

### Calidad
- [ ] `npm run lint` pasa sin errores
- [ ] `npm run build` pasa sin errores de TypeScript

---

## 10. Configuración de Testing (Ya Implementada)

### Instalar Vitest + Testing Library

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

### Instalar Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Scripts sugeridos en package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:integration": "vitest --project integration",
    "test:e2e": "playwright test",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

## 11. Flujo de Trabajo SDD (Spec Driven Development)

> **Ver ADR-001** (`docs/adr/ADR-001-spec-driven-development.md`) para el contexto completo de esta decisión.

### Regla de Oro

> **"La spec es la verdad; el código es su implementación; los tests son su prueba."**

### Los 3 Artefactos del SDD

| Artefacto | Ubicación | Propósito |
|-----------|-----------|-----------|
| Feature Spec | `docs/specs/[feature].spec.md` | Requerimientos, casos de uso (Gherkin), contratos TypeScript, criterios de aceptación |
| ADR | `docs/adr/ADR-NNN-[decision].md` | Decisiones arquitectónicas con contexto y consecuencias |
| Tests | `tests/` y `e2e/` | La spec ejecutable — si pasan, la spec se cumple |

### Flujo de Trabajo por Feature

```
GitHub Issue
    │
    ▼
1. Crear docs/specs/[feature].spec.md
   - Copiar TEMPLATE.spec.md
   - Definir casos de uso en Gherkin
   - Definir contratos TypeScript
   - Definir criterios de aceptación
    │
    ▼
2. (Opcional) Crear docs/adr/ADR-NNN.md
   - Solo si hay una decisión arquitectónica importante
    │
    ▼
3. Implementar siguiendo la spec y el CLAUDE.md
   - Model → ViewModel → Repository → Componentes
    │
    ▼
4. Crear tests (la spec ejecutable)
   - tests/unit/  → Verifica reglas de negocio del Model
   - tests/integration/ → Verifica flujo Model → Repository
   - e2e/ → Verifica criterios de aceptación de la UI
    │
    ▼
5. Pull Request
   - Cambiar estado de la spec a implemented
   - CI ejecuta todos los tests automáticamente
```

### Cuándo Crear una Spec

| Situación | ¿Crear spec? |
|-----------|-------------|
| Nueva feature con lógica de negocio | ✅ Siempre |
| Cambio de UI que afecta flujo de usuario | ✅ Sí |
| Bug fix menor (1-3 líneas) | ❌ No necesario |
| Refactor sin cambio de comportamiento | ❌ No necesario |
| Nueva decisión arquitectónica | ✅ ADR (no spec) |

### Checklist SDD para Cada PR con Feature Nueva

- [ ] ¿Existe `docs/specs/[feature].spec.md` con estado `implemented`?
- [ ] ¿Los casos de uso Gherkin de la spec tienen tests E2E o unitarios correspondientes?
- [ ] ¿Los contratos TypeScript de la spec coinciden con los tipos en `src/core/types/`?
- [ ] ¿Si hubo decisión arquitectónica, existe el ADR correspondiente?
