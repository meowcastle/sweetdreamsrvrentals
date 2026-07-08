const { test, expect } = require('@playwright/test');
const { App } = require('../fixtures/app');

test.describe('smoke', () => {
  let app;
  test.beforeEach(async ({ page }) => {
    app = new App(page);
    await app.goto();
  });

  test('page renders with no console errors', async () => {
    await expect(app.reserveOpener()).toBeVisible();
    app.assertNoPageErrors();
  });

  test('reserve modal opens and shows the required fields', async ({ page }) => {
    await app.openReserve();
    await expect(page.getByPlaceholder('Full name')).toBeVisible();
    await expect(page.getByPlaceholder('you@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('(541) 000-0000')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    app.assertNoPageErrors();
  });

  test('campground dropdown lists options and ends with Other', async ({ page }) => {
    await app.openReserve();
    const options = await page.locator('select option').allTextContents();
    expect(options.length).toBeGreaterThan(5);
    expect(options[options.length - 1]).toMatch(/other/i);
  });

  test('calendar opens to a two-month layout', async ({ page }) => {
    await app.openReserve();
    await app.openCalendar();
    const monthLabels = await page
      .locator('text=/\\b(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4}\\b/')
      .allTextContents();
    // Airbnb-style picker shows two months side by side.
    expect(monthLabels.length).toBeGreaterThanOrEqual(2);
    app.assertNoPageErrors();
  });
});
