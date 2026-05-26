import { expect, test } from '@playwright/test';

test('LangSwitch keeps query and adds /zh prefix when switching to zh', async ({
  page,
}) => {
  await page.goto('/airport-transfer?utm_source=test');

  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

  const zhSwitch = page.locator('[data-lang-switch][href^="/zh/"]').first();
  await expect(zhSwitch).toHaveAttribute(
    'href',
    '/zh/airport-transfer?utm_source=test',
  );

  await zhSwitch.click();
  await page.waitForURL('**/zh/airport-transfer**');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  expect(page.url()).toContain('utm_source=test');
});

test('LangSwitch carries location.hash on click', async ({ page }) => {
  await page.goto('/airport-transfer#pricing');
  const zhSwitch = page.locator('[data-lang-switch][href^="/zh/"]').first();
  await zhSwitch.click();
  await page.waitForURL(
    (url) => url.pathname === '/zh/airport-transfer' && url.hash === '#pricing',
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});

test('hreflang triple present on home', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator('link[rel="alternate"][hreflang="ja"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('link[rel="alternate"][hreflang="zh"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('link[rel="alternate"][hreflang="x-default"]'),
  ).toHaveCount(1);
});
