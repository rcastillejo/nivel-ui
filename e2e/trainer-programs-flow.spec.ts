import { test, expect, Page } from '@playwright/test';

// Helpers
// Cambio minimo para forzar los wf

function getFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

async function clearProgramStorage(page: Page) {
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter(k => k.includes('program') || k.includes('Program'))
      .forEach(k => localStorage.removeItem(k));
  });
}

async function navigateToPrograms(page: Page) {
  await page.goto('/trainer');
  await page.click('[data-testid="tab-programs"]');
  await expect(page.locator('[data-testid="program-list-view"]')).toBeVisible();
}

async function fillCreateProgramForm(
  page: Page,
  opts: {
    name?: string;
    sessions?: number;
    startDate?: string;
    endDate?: string;
    description?: string;
    clientCheckboxTestId?: string;
  } = {}
) {
  const {
    name = 'Plan de Prueba E2E',
    sessions = 12,
    startDate = getFutureDate(1),
    endDate = getFutureDate(90),
    description = 'Descripción de prueba para el plan E2E',
    clientCheckboxTestId,
  } = opts;

  if (name) {
    await page.fill('[data-testid="input-program-name"]', name);
  }
  if (sessions) {
    await page.fill('[data-testid="input-total-sessions"]', String(sessions));
  }
  if (startDate) {
    await page.fill('[data-testid="input-start-date"]', startDate);
  }
  if (endDate) {
    await page.fill('[data-testid="input-end-date"]', endDate);
  }
  if (description) {
    await page.fill('[data-testid="input-description"]', description);
  }
  if (clientCheckboxTestId) {
    await page.check(`[data-testid="${clientCheckboxTestId}"]`);
  } else {
    // Select the first available client checkbox
    const firstCheckbox = page.locator('[data-testid^="client-checkbox-"]').first();
    const count = await firstCheckbox.count();
    if (count > 0) {
      await firstCheckbox.check();
    }
  }
}

// ---------------------------------------------------------------------------
// Suite: Ver lista de programas activos
// ---------------------------------------------------------------------------

test.describe('Program List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trainer');
    await clearProgramStorage(page);
    await page.reload();
    await page.click('[data-testid="tab-programs"]');
  });

  test('muestra estado vacío cuando no hay programas activos', async ({ page }) => {
    await expect(page.locator('[data-testid="active-programs-empty"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-programs-empty"]')).toContainText(
      'No hay programas activos'
    );
  });

  test('muestra el contador de programas activos en el heading', async ({ page }) => {
    await expect(page.locator('[data-testid="active-programs-count"]')).toContainText(
      'Programas Activos (0)'
    );
  });

  test('no muestra la sección historial cuando no hay programas expirados', async ({ page }) => {
    await expect(page.locator('[data-testid="historical-programs-section"]')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Suite: Crear programa — Happy Path
// ---------------------------------------------------------------------------

test.describe('Create Program - Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trainer');
    await clearProgramStorage(page);
    await page.reload();
    await page.click('[data-testid="tab-programs"]');
  });

  test('navega al tab Programas y muestra el formulario y la lista', async ({ page }) => {
    await expect(page.locator('[data-testid="section-program-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-create-program"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-program-form"]')).toBeVisible();
  });

  test('botón Crear Programa está deshabilitado con formulario vacío', async ({ page }) => {
    await expect(page.locator('[data-testid="btn-submit-program"]')).toBeDisabled();
  });

  test('actualiza la frecuencia semanal estimada al completar fechas y sesiones', async ({ page }) => {
    await page.fill('[data-testid="input-total-sessions"]', '12');
    await page.fill('[data-testid="input-start-date"]', getFutureDate(1));
    await page.fill('[data-testid="input-end-date"]', getFutureDate(85));

    const freqDisplay = page.locator('[data-testid="weekly-frequency-display"]');
    await expect(freqDisplay).not.toContainText('—');
    await expect(freqDisplay).toContainText('sesiones/semana');
  });

  test('el botón Limpiar resetea todos los campos', async ({ page }) => {
    await page.fill('[data-testid="input-program-name"]', 'Nombre temporal');
    await page.fill('[data-testid="input-total-sessions"]', '10');

    await page.click('[data-testid="btn-clear-form"]');

    await expect(page.locator('[data-testid="input-program-name"]')).toHaveValue('');
    await expect(page.locator('[data-testid="input-total-sessions"]')).toHaveValue('');
  });

  test('crea programa exitosamente y muestra banner de éxito', async ({ page }) => {
    await fillCreateProgramForm(page, { name: 'Plan E2E Exitoso' });

    await expect(page.locator('[data-testid="btn-submit-program"]')).toBeEnabled();
    await page.click('[data-testid="btn-submit-program"]');

    await expect(page.locator('[data-testid="create-program-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-program-success"]')).toContainText(
      'Plan E2E Exitoso'
    );
  });

  test('el nuevo programa aparece en la lista de programas activos tras crearlo', async ({ page }) => {
    await fillCreateProgramForm(page, { name: 'Plan Listado' });
    await page.click('[data-testid="btn-submit-program"]');

    // Wait for success banner
    await expect(page.locator('[data-testid="create-program-success"]')).toBeVisible();

    // The active programs grid should now contain the new program card
    await expect(page.locator('[data-testid="active-programs-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid^="program-card-"]')).toBeVisible();
    await expect(page.locator('[data-testid^="program-card-name-"]')).toContainText('Plan Listado');
  });

  test('cada tarjeta activa muestra el botón Renovar Programa', async ({ page }) => {
    await fillCreateProgramForm(page, { name: 'Plan Con Botón Renovar' });
    await page.click('[data-testid="btn-submit-program"]');
    await expect(page.locator('[data-testid="create-program-success"]')).toBeVisible();

    await expect(page.locator('[data-testid^="renew-program-btn-"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Suite: Validaciones de formulario
// ---------------------------------------------------------------------------

test.describe('Create Program - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trainer');
    await clearProgramStorage(page);
    await page.reload();
    await page.click('[data-testid="tab-programs"]');
  });

  test('el botón Crear Programa está deshabilitado sin clientes seleccionados', async ({ page }) => {
    await page.fill('[data-testid="input-program-name"]', 'Plan sin cliente');
    await page.fill('[data-testid="input-total-sessions"]', '10');
    await page.fill('[data-testid="input-start-date"]', getFutureDate(1));
    await page.fill('[data-testid="input-end-date"]', getFutureDate(60));
    await page.fill('[data-testid="input-description"]', 'Descripción válida');
    // No client selected
    await expect(page.locator('[data-testid="btn-submit-program"]')).toBeDisabled();
  });

  test('el botón Crear Programa está deshabilitado sin fechas', async ({ page }) => {
    await page.fill('[data-testid="input-program-name"]', 'Plan sin fechas');
    await page.fill('[data-testid="input-total-sessions"]', '10');
    await page.fill('[data-testid="input-description"]', 'Descripción válida');
    const firstCheckbox = page.locator('[data-testid^="client-checkbox-"]').first();
    if (await firstCheckbox.count() > 0) {
      await firstCheckbox.check();
    }
    // No dates filled
    await expect(page.locator('[data-testid="btn-submit-program"]')).toBeDisabled();
  });

  test('el botón Crear Programa está deshabilitado si endDate <= startDate', async ({ page }) => {
    const sameDay = getFutureDate(5);
    await page.fill('[data-testid="input-program-name"]', 'Plan fechas iguales');
    await page.fill('[data-testid="input-total-sessions"]', '10');
    await page.fill('[data-testid="input-start-date"]', sameDay);
    await page.fill('[data-testid="input-end-date"]', sameDay);
    await page.fill('[data-testid="input-description"]', 'Descripción válida');
    const firstCheckbox = page.locator('[data-testid^="client-checkbox-"]').first();
    if (await firstCheckbox.count() > 0) {
      await firstCheckbox.check();
    }
    await expect(page.locator('[data-testid="btn-submit-program"]')).toBeDisabled();
  });

  test('el botón Crear Programa está deshabilitado con nombre vacío', async ({ page }) => {
    await page.fill('[data-testid="input-total-sessions"]', '10');
    await page.fill('[data-testid="input-start-date"]', getFutureDate(1));
    await page.fill('[data-testid="input-end-date"]', getFutureDate(60));
    await page.fill('[data-testid="input-description"]', 'Descripción válida');
    const firstCheckbox = page.locator('[data-testid^="client-checkbox-"]').first();
    if (await firstCheckbox.count() > 0) {
      await firstCheckbox.check();
    }
    await expect(page.locator('[data-testid="btn-submit-program"]')).toBeDisabled();
  });

  test('el botón Crear Programa está deshabilitado con descripción vacía', async ({ page }) => {
    await page.fill('[data-testid="input-program-name"]', 'Plan sin descripción');
    await page.fill('[data-testid="input-total-sessions"]', '10');
    await page.fill('[data-testid="input-start-date"]', getFutureDate(1));
    await page.fill('[data-testid="input-end-date"]', getFutureDate(60));
    // No description
    const firstCheckbox = page.locator('[data-testid^="client-checkbox-"]').first();
    if (await firstCheckbox.count() > 0) {
      await firstCheckbox.check();
    }
    await expect(page.locator('[data-testid="btn-submit-program"]')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Suite: Bloqueo si cliente ya tiene programa activo
// ---------------------------------------------------------------------------

test.describe('Active Program Conflict', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trainer');
    await clearProgramStorage(page);
    await page.reload();
    await page.click('[data-testid="tab-programs"]');
  });

  test('muestra error ActiveProgramAlreadyExistsError si el cliente ya tiene programa activo', async ({ page }) => {
    // Create first program
    const firstCheckbox = page.locator('[data-testid^="client-checkbox-"]').first();
    const hasClients = (await firstCheckbox.count()) > 0;
    test.skip(!hasClients, 'No hay clientes activos en el sistema de datos');

    await fillCreateProgramForm(page, { name: 'Primer Programa' });
    await page.click('[data-testid="btn-submit-program"]');
    await expect(page.locator('[data-testid="create-program-success"]')).toBeVisible();

    // Try to create second program for same client
    await fillCreateProgramForm(page, { name: 'Segundo Programa — Debe Fallar' });
    await page.click('[data-testid="btn-submit-program"]');

    await expect(page.locator('[data-testid="create-program-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-program-error"]')).toContainText(
      'ya tiene un programa activo'
    );
  });

  test('el formulario sigue disponible tras el error para corrección', async ({ page }) => {
    const firstCheckbox = page.locator('[data-testid^="client-checkbox-"]').first();
    const hasClients = (await firstCheckbox.count()) > 0;
    test.skip(!hasClients, 'No hay clientes activos en el sistema de datos');

    // Create first program
    await fillCreateProgramForm(page, { name: 'Primer Programa Conflict' });
    await page.click('[data-testid="btn-submit-program"]');
    await expect(page.locator('[data-testid="create-program-success"]')).toBeVisible();

    // Try duplicate
    await fillCreateProgramForm(page, { name: 'Segundo Programa Conflict' });
    await page.click('[data-testid="btn-submit-program"]');

    // Error is visible but form is still accessible
    await expect(page.locator('[data-testid="create-program-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-program-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-clear-form"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Suite: Renovar programa
// ---------------------------------------------------------------------------

test.describe('Renew Program', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trainer');
    await clearProgramStorage(page);
    await page.reload();
    await page.click('[data-testid="tab-programs"]');

    // Create a program to renew
    const firstCheckbox = page.locator('[data-testid^="client-checkbox-"]').first();
    const hasClients = (await firstCheckbox.count()) > 0;
    if (hasClients) {
      await fillCreateProgramForm(page, { name: 'Plan Para Renovar' });
      await page.click('[data-testid="btn-submit-program"]');
      await expect(page.locator('[data-testid="create-program-success"]')).toBeVisible();
    }
  });

  test('botón "Renovar Programa" abre el modal con la información del programa', async ({ page }) => {
    const renewBtn = page.locator('[data-testid^="renew-program-btn-"]').first();
    const hasProg = (await renewBtn.count()) > 0;
    test.skip(!hasProg, 'No hay programas activos para renovar');

    await renewBtn.click();

    await expect(page.locator('[data-testid="renew-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="renew-modal-program-name"]')).toContainText(
      'Plan Para Renovar'
    );
    await expect(page.locator('[data-testid="renew-modal-clients"]')).toBeVisible();
    await expect(page.locator('[data-testid="renew-modal-sessions-used"]')).toBeVisible();
  });

  test('modal muestra el input de sesiones nuevas pre-cargado con el total del programa', async ({ page }) => {
    const renewBtn = page.locator('[data-testid^="renew-program-btn-"]').first();
    const hasProg = (await renewBtn.count()) > 0;
    test.skip(!hasProg, 'No hay programas activos para renovar');

    await renewBtn.click();
    await expect(page.locator('[data-testid="renew-modal"]')).toBeVisible();

    const inputValue = await page.locator('[data-testid="input-new-sessions"]').inputValue();
    expect(Number(inputValue)).toBeGreaterThan(0);
  });

  test('el botón × cierra el modal sin renovar', async ({ page }) => {
    const renewBtn = page.locator('[data-testid^="renew-program-btn-"]').first();
    const hasProg = (await renewBtn.count()) > 0;
    test.skip(!hasProg, 'No hay programas activos para renovar');

    await renewBtn.click();
    await expect(page.locator('[data-testid="renew-modal"]')).toBeVisible();

    await page.click('[data-testid="renew-modal-close-x"]');
    await expect(page.locator('[data-testid="renew-modal"]')).not.toBeVisible();
  });

  test('el botón Cancelar cierra el modal sin renovar', async ({ page }) => {
    const renewBtn = page.locator('[data-testid^="renew-program-btn-"]').first();
    const hasProg = (await renewBtn.count()) > 0;
    test.skip(!hasProg, 'No hay programas activos para renovar');

    await renewBtn.click();
    await expect(page.locator('[data-testid="renew-modal"]')).toBeVisible();

    await page.click('[data-testid="renew-modal-cancel"]');
    await expect(page.locator('[data-testid="renew-modal"]')).not.toBeVisible();
  });

  test('renueva programa exitosamente y el modal se cierra', async ({ page }) => {
    const renewBtn = page.locator('[data-testid^="renew-program-btn-"]').first();
    const hasProg = (await renewBtn.count()) > 0;
    test.skip(!hasProg, 'No hay programas activos para renovar');

    await renewBtn.click();
    await expect(page.locator('[data-testid="renew-modal"]')).toBeVisible();

    await page.fill('[data-testid="input-new-sessions"]', '20');
    await page.click('[data-testid="renew-modal-submit"]');

    await expect(page.locator('[data-testid="renew-modal"]')).not.toBeVisible();
  });

  test('el programa renovado aparece como activo en la lista', async ({ page }) => {
    const renewBtn = page.locator('[data-testid^="renew-program-btn-"]').first();
    const hasProg = (await renewBtn.count()) > 0;
    test.skip(!hasProg, 'No hay programas activos para renovar');

    await renewBtn.click();
    await page.fill('[data-testid="input-new-sessions"]', '20');
    await page.click('[data-testid="renew-modal-submit"]');

    await expect(page.locator('[data-testid="renew-modal"]')).not.toBeVisible();
    // A program card (the renewed one) should still be in the active grid
    await expect(page.locator('[data-testid="active-programs-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid^="program-card-name-"]').filter({ hasText: 'Plan Para Renovar' })).toBeVisible();
  });

  test('el programa anterior aparece en el historial tras renovar', async ({ page }) => {
    const renewBtn = page.locator('[data-testid^="renew-program-btn-"]').first();
    const hasProg = (await renewBtn.count()) > 0;
    test.skip(!hasProg, 'No hay programas activos para renovar');

    await renewBtn.click();
    await page.fill('[data-testid="input-new-sessions"]', '15');
    await page.click('[data-testid="renew-modal-submit"]');

    await expect(page.locator('[data-testid="renew-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="historical-programs-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="historical-programs-table"]')).toBeVisible();
  });

  test('el botón Renovar está deshabilitado si newSessions < 1', async ({ page }) => {
    const renewBtn = page.locator('[data-testid^="renew-program-btn-"]').first();
    const hasProg = (await renewBtn.count()) > 0;
    test.skip(!hasProg, 'No hay programas activos para renovar');

    await renewBtn.click();
    await expect(page.locator('[data-testid="renew-modal"]')).toBeVisible();

    await page.fill('[data-testid="input-new-sessions"]', '0');
    await expect(page.locator('[data-testid="renew-modal-submit"]')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Suite: Navegación de tabs
// ---------------------------------------------------------------------------

test.describe('Trainer Dashboard Navigation', () => {
  test('puede navegar entre los tres tabs del dashboard', async ({ page }) => {
    await page.goto('/trainer');

    await page.click('[data-testid="tab-appointments"]');
    await expect(page.locator('[data-testid="tab-programs"]')).toBeVisible();

    await page.click('[data-testid="tab-schedule"]');
    await expect(page.locator('[data-testid="tab-programs"]')).toBeVisible();

    await page.click('[data-testid="tab-programs"]');
    await expect(page.locator('[data-testid="section-program-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-create-program"]')).toBeVisible();
  });
});
