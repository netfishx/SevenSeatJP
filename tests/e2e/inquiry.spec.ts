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

  // Form visible; section 1 visible; sections 2 and 3 hidden until Continue.
  await expect(page.locator('form#inquiry-form')).toBeVisible();
  await expect(page.locator('section[data-section="1"]')).toBeVisible();
  await expect(page.locator('section[data-section="2"]')).toBeHidden();
  await expect(page.locator('section[data-section="3"]')).toBeHidden();

  // Turnstile widget exists in DOM (mounted by the CF script) even while
  // section 3 is hidden.
  await expect(page.locator('.cf-turnstile[data-size="flexible"]')).toHaveCount(
    1,
  );
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

test('inquiry progressive disclosure reveals sections on Continue', async ({
  page,
}) => {
  await page.goto('/inquiry');
  // Fill section 1 required fields, then click Continue.
  await page.fill('input[name="from"]', 'NRT');
  await page.fill('input[name="to"]', 'Tokyo');
  await page.fill('input[name="date"]', '2099-08-01');
  await page.fill('input[name="time"]', '14:00');
  await page.fill('input[name="passengers"]', '2');

  await page.locator('section[data-section="1"] [data-next="2"]').click();
  await expect(page.locator('section[data-section="2"]')).toBeVisible();
  await expect(page.locator('section[data-section="3"]')).toBeHidden();

  // Section 2 only has optional fields; Continue reveals section 3 immediately.
  await page
    .locator('section[data-section="2"] [data-next="3"]')
    .first()
    .click();
  await expect(page.locator('section[data-section="3"]')).toBeVisible();
});

test('inquiry channel selection toggles the email field', async ({ page }) => {
  await page.goto('/inquiry');
  // Walk through sections 1 and 2 to reveal section 3 (channel selector).
  await page.fill('input[name="from"]', 'NRT');
  await page.fill('input[name="to"]', 'Tokyo');
  await page.fill('input[name="date"]', '2099-08-01');
  await page.fill('input[name="time"]', '14:00');
  await page.fill('input[name="passengers"]', '2');
  await page.locator('section[data-section="1"] [data-next="2"]').click();
  await page
    .locator('section[data-section="2"] [data-next="3"]')
    .first()
    .click();

  // Default channel on ja is LINE; email field hidden.
  await expect(page.locator('#email-field')).toBeHidden();

  // Switching to Mail reveals the email field. The radio input is sr-only,
  // so check() needs `force: true`; dispatch the change event the JS listens
  // for since the click happens on the visible label, not the input.
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
  await page.fill('input[name="date"]', '2099-08-01');
  await page.fill('input[name="time"]', '14:00');
  await page.fill('input[name="passengers"]', '2');
  await page.locator('section[data-section="1"] [data-next="2"]').click();
  await page
    .locator('section[data-section="2"] [data-next="3"]')
    .first()
    .click();
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
