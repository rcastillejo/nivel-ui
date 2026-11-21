import { test, expect, Page } from '@playwright/test';

// Flujo del cliente: "Mis citas" y cancelación. Corre en modo local (sin Supabase): cualquier
// correo que no sea de entrenador entra como cliente `client1`, y las reservas viven en
// localStorage. La garantía de servidor (Edge Function) se prueba con Vitest y contra Supabase.

const CLIENT_ID = 'client1';

interface SeedBooking {
  id: string;
  startsAt: Date;
  zone?: 'gym' | 'gabinete';
}

function toSeed({ id, startsAt, zone = 'gym' }: SeedBooking) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    id,
    clientId: CLIENT_ID,
    trainerId: 'trainer1',
    trainerName: 'Entrenador Prueba',
    // date: medianoche local del día de la cita; time: hora local de inicio
    date: new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate()).toISOString(),
    time: `${pad(startsAt.getHours())}:${pad(startsAt.getMinutes())}`,
    duration: 60,
    zone,
    status: 'confirmed',
    startsAt: startsAt.toISOString(),
  };
}

function inFuture(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function loginAsClient(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="login-email"]', 'cliente.e2e@nivel.gym');
  await page.fill('[data-testid="login-password"]', 'cualquier-clave');
  await page.click('[data-testid="login-submit"]');
  await expect(page).toHaveURL(/\/client$/);
}

// Un `goto` recargaría la página y perdería la sesión local; se navega por el enlace de la app.
async function openMyAppointments(page: Page, bookings: SeedBooking[]) {
  await loginAsClient(page);
  await page.evaluate((rows) => localStorage.setItem('nivel-bookings', JSON.stringify(rows)), bookings.map(toSeed));
  await page.getByRole('link', { name: 'Mis citas' }).click();
  await expect(page).toHaveURL(/\/client\/citas$/);
  await expect(page.locator('[data-testid="appointments-loading"]')).toHaveCount(0);
}

test.describe('Mis citas — cancelar', () => {
  test('el cliente cancela una cita con anticipación y pasa al historial como cancelada', async ({ page }) => {
    await openMyAppointments(page, [{ id: 'e2e-futura', startsAt: inFuture(3 * 24 * 60) }]);

    const upcoming = page.locator('[data-testid="appointments-upcoming"]');
    await expect(upcoming.locator('[data-testid="appointment-item-e2e-futura"]')).toBeVisible();

    await page.click('[data-testid="appointment-cancel-e2e-futura"]');
    await expect(page.locator('[data-testid="cancel-dialog"]')).toBeVisible();
    await page.click('[data-testid="cancel-confirm"]');

    await expect(page.locator('[data-testid="cancel-dialog"]')).toHaveCount(0);
    await expect(upcoming.locator('[data-testid="appointment-item-e2e-futura"]')).toHaveCount(0);

    const history = page.locator('[data-testid="appointments-history"]');
    await expect(history.locator('[data-testid="appointment-item-e2e-futura"]')).toBeVisible();
    await expect(history.locator('[data-testid="appointment-status-e2e-futura"]')).toHaveText('Cancelada');

    const stored = await page.evaluate(() =>
      (JSON.parse(localStorage.getItem('nivel-bookings') ?? '[]') as Array<{ id: string; status: string }>)
        .find((b) => b.id === 'e2e-futura')?.status
    );
    expect(stored).toBe('cancelled');
  });

  test('cerrar la confirmación no cancela la cita', async ({ page }) => {
    await openMyAppointments(page, [{ id: 'e2e-futura', startsAt: inFuture(3 * 24 * 60) }]);

    await page.click('[data-testid="appointment-cancel-e2e-futura"]');
    await page.click('[data-testid="cancel-dismiss"]');

    await expect(page.locator('[data-testid="cancel-dialog"]')).toHaveCount(0);
    const upcoming = page.locator('[data-testid="appointments-upcoming"]');
    await expect(upcoming.locator('[data-testid="appointment-status-e2e-futura"]')).toHaveText('Confirmada');
  });

  test('una cita de gimnasio a menos de 1 hora no se puede cancelar y se explica el motivo', async ({ page }) => {
    await openMyAppointments(page, [{ id: 'e2e-pronto', startsAt: inFuture(30), zone: 'gym' }]);

    await expect(page.locator('[data-testid="appointment-item-e2e-pronto"]')).toBeVisible();
    await expect(page.locator('[data-testid="appointment-cancel-e2e-pronto"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="appointment-cancel-blocked-e2e-pronto"]')).toContainText('1 hora');
  });

  test('una cita de gabinete a menos de 24 horas no se puede cancelar', async ({ page }) => {
    await openMyAppointments(page, [{ id: 'e2e-gabinete', startsAt: inFuture(23 * 60), zone: 'gabinete' }]);

    await expect(page.locator('[data-testid="appointment-cancel-e2e-gabinete"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="appointment-cancel-blocked-e2e-gabinete"]')).toContainText('24 horas');
  });
});
