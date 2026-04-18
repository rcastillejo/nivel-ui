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

async function selectCalendarDate(page: Page, date: Date): Promise<void> {
  const dayNum = date.getDate();
  const currentMonth = new Date().getMonth();

  if (date.getMonth() !== currentMonth) {
    await page.click('.react-datepicker__navigation--next');
    await page.waitForTimeout(300);
  }

  const dayButton = page
    .locator(
      '.react-datepicker__day:not(.react-datepicker__day--outside-month):not(.react-datepicker__day--disabled)'
    )
    .filter({ hasText: new RegExp(`^${dayNum}$`) });

  await dayButton.click();
}

function makeGabineteBooking(id: string, dateISO: string) {
  return {
    id,
    clientId: 'client2',
    trainerId: 'trainer1',
    trainerName: 'Entrenador Diego Lamas',
    date: dateISO,
    time: '09:00',
    duration: 60,
    zone: 'gabinete',
    status: 'confirmed',
  };
}

function makeGymBookings(dateISO: string): object[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `cap-gym-${i + 1}`,
    clientId: `client${i + 1}`,
    trainerId: 'trainer1',
    trainerName: 'Entrenador Diego Lamas',
    date: dateISO,
    time: '09:00',
    duration: 60,
    zone: 'gym',
    status: 'confirmed',
  }));
}

// ---------------------------------------------------------------------------
// Suite: Gabinete — Capacidad máxima (1/1)
// ---------------------------------------------------------------------------

test.describe('Capacity Validation - Gabinete (max 1)', () => {
  test('muestra error cuando el Gabinete ya está reservado para ese slot', async ({ page }) => {
    const targetDate = getFutureDate(5);

    // Load page first so localStorage is initialized with default data
    await page.goto('/client');

    // Inject a confirmed gabinete booking for the target date at 09:00
    const extraBooking = makeGabineteBooking('cap-test-gabinete-1', targetDate.toISOString());
    await page.evaluate((booking) => {
      const existing = localStorage.getItem('nivel-bookings');
      const bookings = existing ? JSON.parse(existing) : [];
      bookings.push(booking);
      localStorage.setItem('nivel-bookings', JSON.stringify(bookings));
    }, extraBooking);

    // Reload so the DataProvider picks up the new booking
    await page.reload();

    // Select the target date
    await selectCalendarDate(page, targetDate);

    // Select trainer1's 09:00 slot (NOT disabled — gym still has capacity)
    await page.locator('[data-testid="trainer-slot-trainer1-09-00"]').click();

    // Select gabinete zone
    await page.locator('[data-testid="zone-gabinete"]').click();

    // Attempt to confirm
    await page.locator('[data-testid="confirm-booking"]').click();

    // Error should appear because gabinete is at capacity (1/1)
    await expect(page.locator('[data-testid="booking-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-error"]')).toContainText('Gabinete');
    await expect(page.locator('[data-testid="booking-error"]')).toContainText('1/1');
  });

  test('el error de aforo puede descartarse con el botón ×', async ({ page }) => {
    const targetDate = getFutureDate(5);

    await page.goto('/client');

    const extraBooking = makeGabineteBooking('cap-test-dismiss', targetDate.toISOString());
    await page.evaluate((booking) => {
      const existing = localStorage.getItem('nivel-bookings');
      const bookings = existing ? JSON.parse(existing) : [];
      bookings.push(booking);
      localStorage.setItem('nivel-bookings', JSON.stringify(bookings));
    }, extraBooking);

    await page.reload();
    await selectCalendarDate(page, targetDate);
    await page.locator('[data-testid="trainer-slot-trainer1-09-00"]').click();
    await page.locator('[data-testid="zone-gabinete"]').click();
    await page.locator('[data-testid="confirm-booking"]').click();

    // Error is visible
    await expect(page.locator('[data-testid="booking-error"]')).toBeVisible();

    // Dismiss it
    await page.locator('[data-testid="booking-error-dismiss"]').click();

    // Error is gone — form remains available for correction
    await expect(page.locator('[data-testid="booking-error"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="confirm-booking"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Suite: Slot deshabilitado — Ambas zonas llenas
// ---------------------------------------------------------------------------

test.describe('Slot Availability - Slot deshabilitado cuando ambas zonas están llenas', () => {
  test('el slot trainer1-09:00 está deshabilitado cuando Gym (10/10) y Gabinete (1/1) están llenos', async ({
    page,
  }) => {
    const targetDate = getFutureDate(5);

    await page.goto('/client');

    // Inject 10 gym + 1 gabinete for trainer1 at 09:00 on targetDate
    const gymBookings = makeGymBookings(targetDate.toISOString());
    const gabineteBooking = makeGabineteBooking('cap-gabinete-full', targetDate.toISOString());
    const allCapBookings = [...gymBookings, gabineteBooking];

    await page.evaluate((bookings) => {
      localStorage.setItem('nivel-bookings', JSON.stringify(bookings));
    }, allCapBookings);

    await page.reload();

    await selectCalendarDate(page, targetDate);

    // trainer1's 09:00 slot should be disabled — both zones at capacity
    await expect(page.locator('[data-testid="trainer-slot-trainer1-09-00"]')).toBeDisabled();
  });

  test('otros slots del mismo entrenador siguen disponibles cuando solo 09:00 está lleno', async ({
    page,
  }) => {
    const targetDate = getFutureDate(5);

    await page.goto('/client');

    const gymBookings = makeGymBookings(targetDate.toISOString());
    const gabineteBooking = makeGabineteBooking('cap-gabinete-full', targetDate.toISOString());
    const allCapBookings = [...gymBookings, gabineteBooking];

    await page.evaluate((bookings) => {
      localStorage.setItem('nivel-bookings', JSON.stringify(bookings));
    }, allCapBookings);

    await page.reload();

    await selectCalendarDate(page, targetDate);

    // 09:00 is disabled
    await expect(page.locator('[data-testid="trainer-slot-trainer1-09-00"]')).toBeDisabled();

    // 10:00 is still available (no bookings for this slot)
    await expect(page.locator('[data-testid="trainer-slot-trainer1-10-00"]')).toBeEnabled();
  });
});
