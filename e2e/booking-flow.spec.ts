import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFutureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  // Skip Sunday — trainers have no available slots on Sundays
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function clearBookingStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('nivel-bookings');
    localStorage.removeItem('nivel-programs');
  });
}

async function selectCalendarDate(page: Page, date: Date): Promise<void> {
  const dayNum = date.getDate();
  const currentMonth = new Date().getMonth();

  // Navigate to next month if the target date is in the next month
  if (date.getMonth() !== currentMonth) {
    await page.click('.react-datepicker__navigation--next');
    await page.waitForTimeout(300);
  }

  // Find day button by exact text, excluding outside-month and disabled days
  const dayButton = page
    .locator(
      '.react-datepicker__day:not(.react-datepicker__day--outside-month):not(.react-datepicker__day--disabled)'
    )
    .filter({ hasText: new RegExp(`^${dayNum}$`) });

  await dayButton.click();
}

// ---------------------------------------------------------------------------
// Suite: Happy Path — Flujo completo de reserva
// ---------------------------------------------------------------------------

test.describe('Booking Flow - Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/client');
    await clearBookingStorage(page);
    await page.reload();
  });

  test('muestra el calendario al cargar la página del cliente', async ({ page }) => {
    await expect(page.locator('.react-datepicker')).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: '¿Cuándo quieres entrenar?' })).toBeVisible();
  });

  test('seleccionar fecha muestra la cuadrícula de horarios de los entrenadores', async ({ page }) => {
    const targetDate = getFutureDate(5);
    await selectCalendarDate(page, targetDate);

    await expect(page.locator('h2').filter({ hasText: '¿Qué horario prefieres?' })).toBeVisible();
    await expect(page.locator('[data-testid^="trainer-section-"]').first()).toBeVisible();
  });

  test('seleccionar un slot muestra la selección de zona', async ({ page }) => {
    const targetDate = getFutureDate(5);
    await selectCalendarDate(page, targetDate);

    // Click the first available slot for trainer1
    await page.locator('[data-testid^="trainer-slot-trainer1-"]').first().click();

    // Zone selection should appear
    await expect(page.locator('[data-testid="zone-gym"]')).toBeVisible();
    await expect(page.locator('[data-testid="zone-gabinete"]')).toBeVisible();
  });

  test('el botón confirmar está deshabilitado hasta seleccionar zona', async ({ page }) => {
    const targetDate = getFutureDate(5);
    await selectCalendarDate(page, targetDate);

    await page.locator('[data-testid^="trainer-slot-trainer1-"]').first().click();

    await expect(page.locator('[data-testid="confirm-booking"]')).toBeDisabled();
  });

  test('seleccionar zona habilita el botón confirmar', async ({ page }) => {
    const targetDate = getFutureDate(5);
    await selectCalendarDate(page, targetDate);

    await page.locator('[data-testid^="trainer-slot-trainer1-"]').first().click();
    await page.locator('[data-testid="zone-gym"]').click();

    await expect(page.locator('[data-testid="confirm-booking"]')).toBeEnabled();
  });

  test('reserva exitosa muestra el modal de confirmación', async ({ page }) => {
    const targetDate = getFutureDate(5);
    await selectCalendarDate(page, targetDate);

    await page.locator('[data-testid^="trainer-slot-trainer1-"]').first().click();
    await page.locator('[data-testid="zone-gym"]').click();
    await page.locator('[data-testid="confirm-booking"]').click();

    await expect(page.locator('[data-testid="success-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-modal"]')).toContainText('¡Reserva Confirmada!');
  });

  test('cerrar el modal de éxito resetea el wizard al calendario', async ({ page }) => {
    const targetDate = getFutureDate(5);
    await selectCalendarDate(page, targetDate);

    await page.locator('[data-testid^="trainer-slot-trainer1-"]').first().click();
    await page.locator('[data-testid="zone-gym"]').click();
    await page.locator('[data-testid="confirm-booking"]').click();

    await expect(page.locator('[data-testid="success-modal"]')).toBeVisible();
    await page.locator('[data-testid="success-modal-close"]').click();

    // Modal closes and calendar is visible again
    await expect(page.locator('[data-testid="success-modal"]')).not.toBeVisible();
    await expect(page.locator('.react-datepicker')).toBeVisible();
  });

  test('se puede reservar con el Gabinete como zona', async ({ page }) => {
    const targetDate = getFutureDate(5);
    await selectCalendarDate(page, targetDate);

    await page.locator('[data-testid^="trainer-slot-trainer1-"]').first().click();
    await page.locator('[data-testid="zone-gabinete"]').click();
    await page.locator('[data-testid="confirm-booking"]').click();

    await expect(page.locator('[data-testid="success-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-modal"]')).toContainText('Gabinete');
  });
});

// ---------------------------------------------------------------------------
// Suite: Navegación — Wizard steps
// ---------------------------------------------------------------------------

test.describe('Booking Flow - Navegación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/client');
    await clearBookingStorage(page);
    await page.reload();
  });

  test('la cuadrícula de horarios no se muestra antes de elegir fecha', async ({ page }) => {
    await expect(page.locator('[data-testid^="trainer-section-"]')).not.toBeVisible();
  });

  test('ambos entrenadores aparecen en la cuadrícula de horarios', async ({ page }) => {
    const targetDate = getFutureDate(5);
    await selectCalendarDate(page, targetDate);

    await expect(page.locator('[data-testid="trainer-section-trainer1"]')).toBeVisible();
    await expect(page.locator('[data-testid="trainer-section-trainer2"]')).toBeVisible();
  });

  test('Modificar Selección oculta el panel de confirmación', async ({ page }) => {
    const targetDate = getFutureDate(5);
    await selectCalendarDate(page, targetDate);

    await page.locator('[data-testid^="trainer-slot-trainer1-"]').first().click();
    await expect(page.locator('[data-testid="zone-gym"]')).toBeVisible();

    await page.locator('[data-testid="modify-selection"]').click();

    // Confirmation section is hidden after clicking modify
    await expect(page.locator('[data-testid="confirm-booking"]')).not.toBeVisible();
  });
});
