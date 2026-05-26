import { expect, test } from '@playwright/test';

test('inquiry form renders Turnstile widget and required inputs', async ({
  page,
}) => {
  await page.goto('/inquiry');
  await expect(page.locator('form#inquiry-form')).toBeVisible();
  await expect(page.locator('input[name="email"][type="email"]')).toBeVisible();
  await expect(page.locator('input[name="phone"][type="tel"]')).toBeVisible();
  await expect(
    page.locator('.cf-turnstile[data-size="flexible"]'),
  ).toBeVisible();
  await expect(page.locator('noscript')).toHaveCount(1);
});

test('inquiry zh mirror is bilingual and links to zh privacy', async ({
  page,
}) => {
  await page.goto('/zh/inquiry');
  await expect(page.locator('main h1').first()).toContainText('在线询价');
  const privacyLink = page.locator('a[href="/zh/legal/privacy"]').first();
  await expect(privacyLink).toBeVisible();
});

test('client-side guard: submitting without Turnstile token shows error', async ({
  page,
}) => {
  await page.goto('/inquiry');
  await page.fill('input[name="from"]', 'NRT');
  await page.fill('input[name="to"]', 'Tokyo');
  await page.fill('input[name="date"]', '2026-08-01');
  await page.fill('input[name="time"]', '14:00');
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="phone"]', '09012345678');
  await page.locator('form#inquiry-form button[type="submit"]').click();
  await expect(page.locator('#inquiry-error')).toContainText(
    /認証|verification/i,
    {
      timeout: 5_000,
    },
  );
});

test('attribution module sets sessionStorage on visit', async ({ page }) => {
  await page.goto('/?utm_source=test&utm_medium=cpc');
  const firstTouch = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('sevenseat_attr_first') ?? 'null'),
  );
  expect(firstTouch?.source).toBe('test');
  expect(firstTouch?.medium).toBe('cpc');
});
