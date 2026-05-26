import { expect, test } from '@playwright/test';

test('inquiry page surfaces direct contact channels above the form', async ({
  page,
}) => {
  await page.goto('/inquiry');
  // Direct LINE link, WeChat ID, mail link all visible before the form.
  await expect(
    page.locator('a[href^="https://line.me/R/ti/p/@sevenseatjp"]').first(),
  ).toBeVisible();
  await expect(
    page.locator('a[href="mailto:contact@sevenseatjp.com"]').first(),
  ).toBeVisible();
  await expect(
    page.getByText('sevenseatjp', { exact: false }).first(),
  ).toBeVisible();

  // Form + Turnstile widget render.
  await expect(page.locator('form#inquiry-form')).toBeVisible();
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

test('inquiry channel selection toggles the email field', async ({ page }) => {
  await page.goto('/inquiry');
  // Default channel on ja is LINE; email field should be hidden.
  await expect(page.locator('#email-field')).toBeHidden();

  // Switching to Mail reveals the email field. The radio input is sr-only,
  // so check() needs `force: true` since the visible affordance is the
  // wrapping label.
  await page
    .locator('input[name="channel"][value="mail"]')
    .check({ force: true });
  await page
    .locator('input[name="channel"][value="mail"]')
    .dispatchEvent('change');
  await expect(page.locator('#email-field')).toBeVisible();
  await expect(page.locator('input[name="email"][type="email"]')).toBeVisible();
});

test('client-side guard: submitting without Turnstile token shows error', async ({
  page,
}) => {
  await page.goto('/inquiry');
  await page.fill('input[name="from"]', 'NRT');
  await page.fill('input[name="to"]', 'Tokyo');
  await page.fill('input[name="date"]', '2026-08-01');
  await page.fill('input[name="time"]', '14:00');
  await page.fill('input[name="passengers"]', '2');
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="phone"]', '09012345678');

  // Strip any Turnstile response token the dummy widget may have auto-filled
  // so we exercise the client-side guard (token absent → turnstile_failed).
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLInputElement>('input[name="cf-turnstile-response"]')
      .forEach((el) => {
        el.value = '';
      });
  });

  await page.locator('form#inquiry-form button[type="submit"]').click();
  await expect(page.locator('#inquiry-error')).toContainText(
    /認証|认证|verification/i,
    { timeout: 5_000 },
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
