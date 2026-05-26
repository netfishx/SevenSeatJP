import { expect, test } from '@playwright/test';

const PAGES = [
  { path: '/', heading: /東京・京都・白馬/ },
  { path: '/about', heading: /会社概要/ },
  { path: '/airport-transfer', heading: /空港送迎/ },
  { path: '/charter', heading: /チャーター/ },
  { path: '/ski-hakuba', heading: /白馬スキー/ },
  { path: '/rental', heading: /レンタル/ },
  { path: '/pricing', heading: /料金一覧/ },
  { path: '/vehicles', heading: /車両ラインナップ/ },
  { path: '/faq', heading: /よくあるご質問/ },
  { path: '/inquiry', heading: /お問合せ/ },
  { path: '/legal/tokushoho', heading: /特定商取引法/ },
  { path: '/legal/privacy', heading: /プライバシー/ },
  { path: '/legal/cancel-policy', heading: /キャンセルポリシー/ },
  { path: '/zh/', heading: /东京 · 京都 · 白马/ },
  { path: '/zh/about', heading: /公司介绍/ },
  { path: '/zh/airport-transfer', heading: /机场接送/ },
  { path: '/zh/charter', heading: /私人包车/ },
  { path: '/zh/ski-hakuba', heading: /白马滑雪/ },
  { path: '/zh/rental', heading: /租车/ },
  { path: '/zh/pricing', heading: /价格一览/ },
  { path: '/zh/vehicles', heading: /车辆配置/ },
  { path: '/zh/faq', heading: /常见问题/ },
  { path: '/zh/inquiry', heading: /在线询价/ },
  { path: '/zh/legal/tokushoho', heading: /特定商取引法表记/ },
  { path: '/zh/legal/privacy', heading: /隐私政策/ },
  { path: '/zh/legal/cancel-policy', heading: /取消政策/ },
];

for (const page of PAGES) {
  test(`${page.path} renders and has no horizontal overflow`, async ({
    page: pw,
  }) => {
    const response = await pw.goto(page.path);
    expect(response?.status()).toBe(200);
    await expect(pw.locator('h1').first()).toContainText(page.heading);

    const overflow = await pw.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

// Regression guard: mobile menu button must stay within viewport bounds for
// every header that uses the mobile breakpoint. Previously, a longer zh
// site.name + whitespace-nowrap pushed it past the right edge so users on
// /zh/ couldn't open the nav. Runs only at <lg breakpoint where MobileMenu
// is the visible nav surface.
test('mobile menu button fits in viewport on /zh/', async ({
  page: pw,
  viewport,
}) => {
  if (!viewport || viewport.width >= 1024) {
    test.skip();
    return;
  }
  await pw.goto('/zh/');
  const menu = await pw.evaluate(() => {
    const r = document
      .querySelector('[data-mobile-menu] [data-mobile-toggle]')
      ?.getBoundingClientRect();
    return r ? { left: r.left, right: r.right, width: r.width } : null;
  });
  if (!menu) throw new Error('mobile menu toggle not found in DOM');
  expect(menu.right).toBeLessThanOrEqual(viewport.width);
  expect(menu.left).toBeGreaterThanOrEqual(0);
});

// Regression guard: the mobile menu panel must cover the full viewport even
// after the user has scrolled past the immersive-header fold (scrollY > 64).
// Bug history: the panel lived inside <header>; on scroll the header gained
// `backdrop-filter: blur(...)` which becomes a containing block for fixed
// descendants, collapsing the `fixed inset-0` panel to the header's height.
// Symptom: clicking the hamburger after scrolling did nothing visible.
test('mobile menu opens to full viewport after scroll', async ({
  page: pw,
  viewport,
}) => {
  if (!viewport || viewport.width >= 1024) {
    test.skip();
    return;
  }
  await pw.goto('/');
  await pw.evaluate(() => window.scrollTo(0, 400));
  await pw.locator('[data-mobile-toggle]').click();
  const panelRect = await pw.evaluate(() => {
    const r = document
      .querySelector('[data-mobile-panel]')
      ?.getBoundingClientRect();
    return r
      ? { top: r.top, left: r.left, width: r.width, height: r.height }
      : null;
  });
  if (!panelRect) throw new Error('mobile menu panel not found in DOM');
  expect(panelRect.top).toBeLessThanOrEqual(1);
  expect(panelRect.left).toBeLessThanOrEqual(1);
  expect(panelRect.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(panelRect.height).toBeGreaterThanOrEqual(viewport.height * 0.9);
});
