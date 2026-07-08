const { test, expect } = require('@playwright/test');
const { App } = require('../fixtures/app');
const { validateStore } = require('../fixtures/invariants');

test.describe('booking happy path', () => {
  let app;
  test.beforeEach(async ({ page }) => {
    app = new App(page);
    await app.goto();
    await app.clearStore();
    await page.reload();
    await app.waitReady();
  });

  test('completes a booking and writes a valid record', async () => {
    const count = await app.completeBooking({ trailer: 'Charlie', nights: 3 });
    expect(count).toBe(1);

    const bookings = await app.webBookings();
    const rec = bookings[0];
    expect(rec.trailer).toBe('charlie');
    expect(rec.nights).toBe(3);
    expect(rec.arrival).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rec.email).toBe('test@example.com');
    expect(rec.source).toBe('web');

    expect(validateStore(bookings)).toEqual([]);
    app.assertNoPageErrors();
  });

  test('records the combined campground + site value', async ({ page }) => {
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.pickValidRange(4);
    await app.fillGuest({ campground: 'Indian Mary', site: 'Site 42' });
    await app.checkAvailability();
    await app.continueButton().click();
    await app.payButton().click();
    await expect(page.getByText(/reservation confirmed|is reserved for/i)).toBeVisible();

    const [rec] = await app.webBookings();
    expect(rec.site).toContain('Indian Mary');
    expect(rec.site).toContain('Site 42');
  });

  test('remembers the guest on the next visit', async ({ page }) => {
    await app.completeBooking({ trailer: 'Ella', nights: 3, guest: { name: 'Dana Guest', email: 'dana@example.com', phone: '5415550111' } });
    await page.reload();
    await app.waitReady();
    await app.openReserve();
    await expect(page.getByPlaceholder('Full name')).toHaveValue('Dana Guest');
    await expect(page.getByPlaceholder('you@email.com')).toHaveValue('dana@example.com');
  });
});
