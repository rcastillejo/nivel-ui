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

// Primer día laborable a partir de `daysAhead` días (los entrenadores no atienden domingos)
function nextWeekday(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

// El calendario (react-datepicker) abre en el mes actual: se avanza hasta el mes de la fecha
async function pickCalendarDay(page: Page, date: Date) {
  const today = new Date();
  const monthsAhead = (date.getFullYear() - today.getFullYear()) * 12 + (date.getMonth() - today.getMonth());
  for (let i = 0; i < monthsAhead; i++) {
    await page.locator('.react-datepicker__navigation--next').click();
  }
  const day = String(date.getDate()).padStart(3, '0');
  await page.locator(`.react-datepicker__day--${day}:not(.react-datepicker__day--outside-month)`).click();
}

test.describe('Mis citas — reprogramar', () => {
  test('el cliente mueve una cita a otra fecha y horario y la sigue viendo como confirmada', async ({ page }) => {
    await openMyAppointments(page, [{ id: 'e2e-futura', startsAt: inFuture(3 * 24 * 60) }]);
    const newDate = nextWeekday(5);

    await page.click('[data-testid="appointment-reschedule-e2e-futura"]');
    await expect(page.locator('[data-testid="reschedule-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="reschedule-current"]')).toContainText('Entrenador Prueba');

    await pickCalendarDay(page, newDate);
    await page.click('[data-testid="time-slot-trainer1-10:00"]');
    await page.click('[data-testid="zone-gym"]');
    await page.click('[data-testid="time-selection-confirm"]');

    await expect(page.locator('[data-testid="reschedule-dialog"]')).toHaveCount(0);
    const item = page
      .locator('[data-testid="appointments-upcoming"]')
      .locator('[data-testid="appointment-item-e2e-futura"]');
    await expect(item).toContainText('10:00');
    await expect(item.locator('[data-testid="appointment-status-e2e-futura"]')).toHaveText('Confirmada');

    const stored = await page.evaluate(() =>
      (JSON.parse(localStorage.getItem('nivel-bookings') ?? '[]') as Array<{ id: string; time: string; date: string; status: string }>)
        .filter((b) => b.id === 'e2e-futura')
        .map((b) => ({ time: b.time, day: new Date(b.date).getDate(), status: b.status }))
    );
    expect(stored).toEqual([{ time: '10:00', day: newDate.getDate(), status: 'confirmed' }]);
  });

  test('cerrar el diálogo no cambia la cita', async ({ page }) => {
    await openMyAppointments(page, [{ id: 'e2e-futura', startsAt: inFuture(3 * 24 * 60) }]);
    const before = await page.locator('[data-testid="appointment-item-e2e-futura"]').textContent();

    await page.click('[data-testid="appointment-reschedule-e2e-futura"]');
    await expect(page.locator('[data-testid="reschedule-dialog"]')).toBeVisible();
    await page.click('[data-testid="reschedule-close"]');

    await expect(page.locator('[data-testid="reschedule-dialog"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="appointment-item-e2e-futura"]')).toHaveText(before ?? '');
  });

  test('no se puede confirmar hasta elegir horario y zona', async ({ page }) => {
    await openMyAppointments(page, [{ id: 'e2e-futura', startsAt: inFuture(3 * 24 * 60) }]);

    await page.click('[data-testid="appointment-reschedule-e2e-futura"]');
    await pickCalendarDay(page, nextWeekday(5));

    await expect(page.locator('[data-testid="time-selection-confirm"]')).toHaveCount(0);
    await page.click('[data-testid="time-slot-trainer1-10:00"]');
    await expect(page.locator('[data-testid="time-selection-confirm"]')).toBeDisabled();
    await page.click('[data-testid="zone-gym"]');
    await expect(page.locator('[data-testid="time-selection-confirm"]')).toBeEnabled();
  });

  test('una cita de gimnasio a menos de 1 hora no ofrece reprogramar', async ({ page }) => {
    await openMyAppointments(page, [{ id: 'e2e-pronto', startsAt: inFuture(30), zone: 'gym' }]);

    await expect(page.locator('[data-testid="appointment-item-e2e-pronto"]')).toBeVisible();
    await expect(page.locator('[data-testid="appointment-reschedule-e2e-pronto"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="appointment-cancel-blocked-e2e-pronto"]')).toContainText('reprogramar');
  });

  test('una cita de gabinete a menos de 24 horas no ofrece reprogramar', async ({ page }) => {
    await openMyAppointments(page, [{ id: 'e2e-gabinete', startsAt: inFuture(23 * 60), zone: 'gabinete' }]);

    await expect(page.locator('[data-testid="appointment-reschedule-e2e-gabinete"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="appointment-cancel-blocked-e2e-gabinete"]')).toContainText('24 horas');
  });
});
