const { test, expect } = require('@playwright/test');
const { App } = require('../fixtures/app');

test.describe('required fields gate the booking', () => {
  let app;
  test.beforeEach(async ({ page }) => {
    app = new App(page);
    await app.goto();
    await app.clearStore();
    await page.reload();
    await app.waitReady();
  });

  test('cannot check availability before picking dates', async () => {
    await app.openReserve();
    // No dates chosen yet.
    await expect(app.primaryCta()).toHaveText(/pick your dates first/i);
    await app.primaryCta().click();
    // Still not available; nothing gets booked.
    expect(await app.isAvailable()).toBe(false);
  });

  test('dates chosen but empty details → CTA asks for details and blocks', async ({ page }) => {
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.pickValidRange(3);
    // Leave name/email/phone/campground empty.
    await expect(app.primaryCta()).toHaveText(/fill in your details/i);
    await app.primaryCta().click();
    await expect(page.getByText(/a few details needed/i)).toBeVisible();
    expect(await app.isAvailable()).toBe(false);
    expect((await app.webBookings()).length).toBe(0);
  });

  test('invalid email is rejected', async ({ page }) => {
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.pickValidRange(3);
    await app.fillGuest({ email: 'not-an-email', campground: 'Indian Mary' });
    await app.primaryCta().click();
    await expect(page.getByText(/a few details needed/i)).toBeVisible();
  });

  test('"Other" campground requires the site/address field', async ({ page }) => {
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.pickValidRange(3);
    await app.fillGuest({ campground: '', site: '' });
    // Select the "Other" option explicitly.
    await page.locator('select').selectOption('__other').catch(async () => {
      const optionValues = await page.locator('select option').evaluateAll((os) => os.map((o) => o.value));
      const other = optionValues.find((v) => /other/i.test(v)) || optionValues[optionValues.length - 1];
      await page.locator('select').selectOption(other);
    });
    await page.getByPlaceholder('Full name').fill('Test Guest');
    await page.getByPlaceholder('you@email.com').fill('test@example.com');
    await page.getByPlaceholder('(541) 000-0000').fill('5415550100');
    // Site left blank → should be treated as missing.
    await app.primaryCta().click();
    await expect(page.getByText(/a few details needed/i)).toBeVisible();

    // Now provide the site → it should pass.
    await page.getByPlaceholder('Site number or address').fill('Boondock pullout, mile 12');
    await app.primaryCta().click();
    await expect(app.continueButton()).toBeVisible({ timeout: 8000 });
  });

  test('all fields present → availability passes', async () => {
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.pickValidRange(3);
    await app.fillGuest({ campground: 'Indian Mary' });
    await app.checkAvailability();
    await expect(app.continueButton()).toBeVisible({ timeout: 8000 });
    app.assertNoPageErrors();
  });
});
