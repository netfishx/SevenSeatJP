# SevenSeatJP 网站 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 spec `docs/superpowers/specs/2026-05-25-sevenseatjp-design.md` 实现日本 7 座出行预约网站(中日双语、9 + 1 + 3 页、Cloudflare Pages 部署、询价表单 → Resend 双邮件 + Turnstile + UTM 归因)。

**Architecture:** Astro 6 纯静态构建 + Cloudflare Pages,询价表单走独立 Pages Function(`functions/api/inquiry.ts`)。内容用 Content Collections + Zod schema,翻译 inline 双语 YAML。Tailwind v4 CSS-first(@theme tokens)。i18n 默认 ja + `/zh/` 子路径,每页只写一份组件、镜像页两行引用。E2E 用 Playwright 走 `wrangler pages dev` 真实 Function。

**Tech Stack:** Astro 6 · Tailwind v4 · Cloudflare Pages + Functions · Resend · @react-email · Cloudflare Turnstile · Bun · Biome · Playwright · Zod 4

**版本策略:plan 编写当日(2026-05-26)的具体最新版本**——package.json 用 caret(`^x.y.z`)允许 minor 升级,lockfile 锁定确切版本。执行者若发现 plan 已过时(npm view 显示更高 major),先确认是否安全升级再改 plan。

---

## 全局横切要求(每个 task 都必须遵守)

这些是 plan 通用硬规则,**不需要在每个 task 重复列出**,但执行任一 task 时都受这些约束。Task acceptance 不写,但 Task 16 上线验收会逐项核对。

### 响应式 / 移动端

- **mobile-first**:Tailwind v4 默认 mobile;`sm:` (640px+) / `md:` (768px+) / `lg:` (1024px+) 渐进增强,**不要桌面思维倒推**
- **viewport meta** 已在 BaseLayout 内(`width=device-width, initial-scale=1`),所有页面继承
- **横向不溢出**:任何 page 在 `375px`(iPhone SE)宽度下都不能出现横向滚动条;任何 page 在 `768px`(平板)宽度下都不能出现内容贴边/挤压
- **触摸目标 ≥ 44×44px**(WCAG 2.5.5):所有可点击元素至少 `min-h-11 min-w-11`(Tailwind v4 中 `h-11` = 44px),含按钮、链接、表单控件、LangSwitch、卡片整体可点击区域
- **避免 hover-only 信息暴露**:任何 hover 才显示的内容也必须在 tap 或聚焦时可见(用 `focus-visible:`、`active:`)
- **图片响应式**:用 Astro `<Image>` 组件自动 srcset + webp;`sizes` 按容器宽度配(e.g. `sizes="(min-width: 768px) 33vw, 100vw"`)
- **字体子集化**:Noto Serif/Sans JP woff2 子集到日中文常用字符(Task 16),避免移动 4G 加载完整字体集
- **避免横向 scroll-snap 大转盘**:首屏轮播限制到一屏可见数量,小屏直接堆叠

### 表单专项(影响 Task 12)

- 数字字段:`<input type="number" inputmode="numeric">`(人数/行李)
- 电话:`<input type="tel" inputmode="tel" autocomplete="tel-national">`
- 邮箱:`<input type="email" inputmode="email" autocomplete="email">`
- 姓名:`autocomplete="name"`
- 日期:`<input type="date">`(原生 picker)
- 时间:`<input type="time">`(原生)
- 备注:`<textarea>` 默认 `rows="4"`,移动端不要 `rows="10"` 顶满屏
- 提交按钮 `disabled` 状态加 `aria-busy="true"` + 视觉 spinner
- Turnstile widget 用 `data-size="flexible"`(或 normal),避免在 320-360px 宽度溢出

### 可访问性(a11y)

- 所有图片 `alt`(装饰图用 `alt=""`)
- form `<label for=>` 关联或 `<label>` 包裹;`aria-describedby` 关联错误信息
- 颜色对比度:文本对背景 ≥ 4.5:1(`#ede9d8` on `#0a0a0b` ≈ 15:1 ✓;金色 `#c9a96e` on `#0a0a0b` ≈ 8:1 ✓)
- 键盘可达:Tab 顺序合理,`:focus-visible` 可见焦点环
- `prefers-reduced-motion`:任何 transition / 动画 ≥ 200ms 的都要在 `@media (prefers-reduced-motion: reduce)` 下置零

### 性能预算

- 营销页 JS:**< 30 KB gzipped**(不算 Turnstile,Turnstile 只在询价页加载)
- 单页 CSS:**< 50 KB gzipped**(Tailwind v4 + 自定义 token)
- LCP(`/`、`/zh/`):**< 2.5s** on Slow 4G(Lighthouse mobile)
- Hero 图(若有):预压缩 + AVIF/WebP + 关键尺寸 srcset

### 测试覆盖(影响 Task 15)

- Playwright `playwright.config.ts` 必须含**两个 projects**:`chromium-desktop`(1280×720)+ `chromium-mobile`(`devices['iPhone 14']`,390×844)
- `pages.spec.ts` 在两个 project 都跑,确保 375-390px 与 1280px 都不破

---

## 任务依赖图

```
1 (骨架) → 2 (CF 部署) → 3 (i18n) → 4 (Collections) → 5 (BaseLayout+UTM) → 6 (UI tokens+组件)
                                                                                  ↓
                                                                  7 (HomePage)
                                                                  8 (About+FAQ)
                                                                  9 (Airport+Ski)
                                                                  10 (Charter+Rental+Pricing+Vehicles)
                                                                  11 (Legal 3 页)
                                                                  12 (Form 前端+Schema)
                                                                                  ↓
                                                                  13 (Function+邮件) ← 12
                                                                                  ↓
                                                                  14 (SEO 完整化) ← 7-13
                                                                  15 (E2E + CI) ← 13, 14
                                                                  16 (性能+上线冒烟) ← 15  [user-gate]
```

W1 ≈ Task 1-6 · W2 ≈ Task 7-13 · W3 ≈ Task 14-16。

---

### Task 1: 项目骨架与工具链

**Goal:** 仓库可 `bun install` + `bun run lint` + `astro check`,环境变量样例齐全,`.gitignore` 完整。

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `biome.json`
- Create: `astro.config.mjs`
- Create: `src/styles/globals.css`
- Create: `.gitignore`
- Create: `.env.local.example`
- Create: `.dev.vars.example`
- Create: `src/pages/index.astro`(临时占位,验证 build)

**Acceptance Criteria:**
- [ ] `bun install` 无错误
- [ ] `bun run build` 输出 `dist/index.html` 含 "SevenSeatJP" 字样
- [ ] `bun run lint` 通过(Biome,空跑也算 pass)
- [ ] `bun run typecheck` 通过(`astro check`)
- [ ] `.gitignore` 含 `node_modules`、`dist`、`.wrangler`、`.env.local`、`.env.*.local`、`.dev.vars`、`.dev.vars.*`

**Verify:** `bun install && bun run build && bun run lint && bun run typecheck` → 4 命令全部 exit 0

**Steps:**

- [ ] **Step 1: 创建 `package.json`(版本号取自 2026-05-26 npm 当前最新)**

```json
{
  "name": "sevenseatjp",
  "type": "module",
  "private": true,
  "scripts": {
    "dev:web":   "astro dev",
    "dev":       "bun run build && wrangler pages dev dist --port 4321 --compatibility-flag=nodejs_compat",
    "build":     "astro check && astro build",
    "preview":   "wrangler pages dev dist --port 4321 --compatibility-flag=nodejs_compat",
    "lint":      "biome check .",
    "format":    "biome check --write .",
    "typecheck": "astro check",
    "test:e2e":  "playwright test"
  },
  "dependencies": {
    "astro": "^6.3.7",
    "@astrojs/sitemap": "^3.7.2",
    "zod": "^4.4.3",
    "resend": "^6.12.4",
    "@react-email/components": "^1.0.12",
    "@react-email/render": "^2.0.8",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.15",
    "@cloudflare/workers-types": "^4.20260525.1",
    "@playwright/test": "^1.60.0",
    "@tailwindcss/vite": "^4.3.0",
    "tailwindcss": "^4.3.0",
    "typescript": "^6.0.3",
    "wrangler": "^4.94.0"
  }
}
```

> **若执行者发现 npm 上已经有更新版本**:用 `bun add <pkg>@latest` 升级单个依赖,确认 build 通过后**回填具体版本号到 plan 这段**,而不是留下 `^latest` 字面。

> **注意几个 spec 时期就需注意的 major 跨越**:Biome 已是 v2(plan 之前提的 1.9.x 已过时)、wrangler v4、TypeScript 6、Resend SDK v6。`onRequestPost` API、Tailwind v4 `@theme`、Astro 6 静态 + Pages Functions 路径在这些版本下都已稳定。

- [ ] **Step 2: 创建 `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

- [ ] **Step 3: 创建 `biome.json`(Biome v2 格式)**

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "files": {
    "includes": ["**", "!!dist", "!!.astro", "!!.wrangler", "!!node_modules"]
  },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always" } }
}
```

> Biome v2 `files.ignore` 已废弃,改用 `files.includes` 配合 `!!` negation glob;`$schema` 用本地路径避免 schema 与 SDK 版本漂移。

- [ ] **Step 4: 创建 `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  site: 'https://sevenseatjp.com',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'zh'],
    routing: { prefixDefaultLocale: false },
  },
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 5: 创建 `src/styles/globals.css`(Tailwind v4 + token 占位)**

```css
@import "tailwindcss";

@theme {
  --color-bg:           #0a0a0b;
  --color-surface:      #14141a;
  --color-border:       #2a2a32;
  --color-text:         #ede9d8;
  --color-text-muted:   #9a9486;
  --color-gold:         #c9a96e;
  --color-gold-dark:    #9c7f4f;
  --color-accent:       #e8d9a0;
  --font-display:       "Noto Serif JP", "Source Han Serif SC", serif;
  --font-body:          "Noto Sans JP", "Source Han Sans SC", system-ui, sans-serif;
  --radius-card:        12px;
  --shadow-card:        0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.4);
}
```

- [ ] **Step 6: 创建 `src/pages/index.astro` 临时占位**

```astro
---
import '@/styles/globals.css';
---
<!doctype html>
<html lang="ja">
  <head><meta charset="utf-8" /><title>SevenSeatJP</title></head>
  <body><h1>SevenSeatJP</h1></body>
</html>
```

- [ ] **Step 7: 创建 `.gitignore`**

```
node_modules/
dist/
.astro/
.wrangler/
.env.local
.env.*.local
.dev.vars
.dev.vars.*
playwright-report/
test-results/
*.log
.DS_Store
```

- [ ] **Step 8: 创建 `.env.local.example` 与 `.dev.vars.example`**

```
# .env.local.example  —— Astro build-time,本地复制为 .env.local
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

```
# .dev.vars.example  —— wrangler runtime,本地复制为 .dev.vars
# 本地用 Resend 测试地址跑代码链路;真实邮箱送达在 Task 16(生产域名)做
RESEND_API_KEY=re_dev_xxx
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
COMPANY_INBOX=delivered+internal@resend.dev
INQUIRY_FROM_EMAIL=onboarding@resend.dev
```

- [ ] **Step 9: 安装依赖并跑 verify**

```bash
bun install            # 按 package.json 里固定的 caret 版本解析,bun.lockb 锁定确切版本
bun run build
bun run lint
bun run typecheck
```

期望:`dist/index.html` 生成,grep "SevenSeatJP" 命中;`bun.lockb` 已生成并 commit。**主版本号已锁定在 package.json**(`^6.3.7` 等),`bun.lockb` 进一步锁定 patch + transitive deps。

**若 build fail**(如 Astro 6.x 接口与 plan 假设不符):
1. 跑 `bun update --latest <pkg>` 试最新 minor/patch
2. 看 Astro 官方迁移指南
3. 修复后**回填新版本号到 package.json + 本 plan Step 1 的 JSON 块**(保持 plan 与代码一致)

- [ ] **Step 10: 提交(必须含 `bun.lockb`,否则 lockfile 承诺落空)**

```bash
git add package.json bun.lockb tsconfig.json biome.json astro.config.mjs \
  src/styles/globals.css src/pages/index.astro \
  .gitignore .env.local.example .dev.vars.example
git commit -m "feat: bootstrap Astro 6 + Tailwind v4 + Biome v2 toolchain"
```

> `bun.lockb` 是二进制锁文件,确保跨机器/CI 装出来的 transitive deps 与本机一致。CI 跑 `bun install --frozen-lockfile` 时会校验。

---

### Task 2: CF Pages 部署配置 + 首次部署(仅 `*.pages.dev`)

**Goal:** 仓库连到 Cloudflare Pages,生产 + Preview 部署链路打通,占位首页**仅在 `<project>.pages.dev` 默认子域 + PR preview** 可访问。**不绑定 custom domain `sevenseatjp.com`**——避免占位首页暴露给搜索引擎与潜在客户;custom domain 切换放到 Task 16。

**Files:**
- Create: `public/_headers`
- Create: `public/robots.txt`
- Create: `public/favicon.svg`(临时纯色 SVG 占位)
- Modify: `src/pages/index.astro`(加少量 Tailwind class 验证样式生效)

**Acceptance Criteria:**
- [ ] CF Pages dashboard 已创建项目,Build cmd = `bun run build`,Output = `dist/`,Functions dir 自动识别,兼容性 flag 含 `nodejs_compat`
- [ ] Production env 已配 `PUBLIC_TURNSTILE_SITE_KEY`(可先填 dummy,真实 key 由 Task 16 替换);Preview env 配 dummy
- [ ] 推 main → 部署到 `<project>.pages.dev`,占位首页可访问
- [ ] 开一个 throwaway PR → 生成 preview URL,占位首页可访问
- [ ] curl `<project>.pages.dev/robots.txt` 返回 200
- [ ] **未绑定 custom domain**(Settings → Custom domains 应为空,直到 Task 16)

**Verify:** 浏览器打开 `<project>.pages.dev` + preview URL,看到 "SevenSeatJP" + 深色背景;`curl -I https://<project>.pages.dev/robots.txt` 200

**Steps:**

- [ ] **Step 1: `public/_headers`(含临时 `X-Robots-Tag: noindex` —— Task 14 SEO 完整化时移除)**

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com;
```

> `X-Robots-Tag: noindex` 是占位阶段双保险:即使 robots.txt 被忽略、即使 pages.dev 子域被外链发现,搜索引擎也不会索引。Task 14 替换为正式 robots.txt + 移除此行。

- [ ] **Step 2: `public/robots.txt`(占位阶段全 Disallow,Task 14 切回正式)**

```
User-agent: *
Disallow: /
```

> 占位阶段不放出 `Allow: /` 和 sitemap URL——避免占位首页 + 待完成结构被索引。Task 14 SEO 完整化时改为:
> ```
> User-agent: *
> Allow: /
>
> Sitemap: https://sevenseatjp.com/sitemap-index.xml
> ```

- [ ] **Step 3: 占位 `public/favicon.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0a0a0b"/><text x="16" y="22" font-size="18" text-anchor="middle" fill="#c9a96e" font-family="serif">7S</text></svg>
```

- [ ] **Step 4: `src/pages/index.astro` 加 Tailwind class 验证**

```astro
---
import '@/styles/globals.css';
---
<!doctype html>
<html lang="ja">
  <head><meta charset="utf-8" /><title>SevenSeatJP</title></head>
  <body class="min-h-screen bg-bg text-text flex items-center justify-center font-display text-4xl text-gold">
    SevenSeatJP
  </body>
</html>
```

- [ ] **Step 5: 提交并推送**

```bash
git add public/_headers public/robots.txt public/favicon.svg src/pages/index.astro
git commit -m "feat: add CF Pages headers, robots, placeholder home"
git remote add origin <github-url-tbd-by-user>
git push -u origin main
```

(若 `<github-url-tbd-by-user>` 未提供,停下询问用户;不要假设 URL)

- [ ] **Step 6: CF Pages dashboard 配置(手动 + 截图验证)**

dashboard 步骤:Create project → Connect to Git → 选仓库 → Framework preset = Astro → Build cmd `bun run build` → Output `dist` → Environment variables: 加 `PUBLIC_TURNSTILE_SITE_KEY`(**Production 和 Preview 都先用 dummy `1x00000000000000000000AA`**,真实 site key 由 Task 16 替换)→ Settings → Functions → Compatibility flags 加 `nodejs_compat`(Production + Preview)→ **不绑定 custom domain**(留给 Task 16)

- [ ] **Step 7: 验证部署**

```bash
curl -sI https://<your-project>.pages.dev/ | head -5
curl -sI https://<your-project>.pages.dev/robots.txt | head -5
```

期望:两者均 200。

---

### Task 3: i18n 路由 + helpers

**Goal:** ja 根路径 / zh 子路径双语路由生效;`t()` / `getLocaleFromUrl` / `getCanonicalUrl` / `getLanguageSwitchUrl` helper 全部实现;两个语言镜像的占位首页都返回 200。

**Files:**
- Create: `src/i18n/ja.json`
- Create: `src/i18n/zh.json`
- Create: `src/i18n/t.ts`
- Create: `src/lib/alternate.ts`
- Create: `src/pages/zh/index.astro`(zh 占位)
- Modify: `src/pages/index.astro`(用 t() 输出文案)

**Acceptance Criteria:**
- [ ] `bun run typecheck` 通过(zh.json 漏 key 会被 `satisfies` 编译报错)
- [ ] `/` 渲染含 `home.title` 的日文
- [ ] `/zh/` 渲染含同 key 的中文
- [ ] `getCanonicalUrl(new URL('https://x/zh/about'), 'ja')` === `/about`
- [ ] `getCanonicalUrl(new URL('https://x/about'), 'zh')` === `/zh/about`

**Verify:** `bun run build && grep -q "ja\|日本" dist/index.html && grep -q "zh\|中文" dist/zh/index.html`

**Steps:**

- [ ] **Step 1: `src/i18n/ja.json`(初始最小集,Task 后续添加)**

```json
{
  "site.name": "SevenSeatJP",
  "home.title": "東京・京都・白馬の高級ハイヤー手配",
  "home.subtitle": "中国語対応・空港送迎・チャーター・スキー送迎",
  "nav.home": "ホーム",
  "nav.about": "会社概要",
  "nav.airport": "空港送迎",
  "nav.charter": "チャーター",
  "nav.ski": "白馬スキー",
  "nav.rental": "レンタル",
  "nav.vehicles": "車両",
  "nav.pricing": "料金表",
  "nav.faq": "FAQ",
  "nav.inquiry": "お問合せ",
  "form.submit": "問合せを送信",
  "form.error.invalid_payload": "入力内容をご確認ください",
  "form.error.payload_too_large": "リクエストサイズが大きすぎます",
  "form.error.turnstile_failed": "認証に失敗しました。再度お試しください",
  "form.error.turnstile_unavailable": "認証サービスに一時的に接続できません。LINE からご連絡ください",
  "form.error.email_send_failed": "送信に失敗しました。LINE からご連絡ください",
  "form.success": "お問合せを受け付けました。24時間以内にご返信いたします。"
}
```

- [ ] **Step 2: `src/i18n/zh.json`(同 key,值改中文)**

```json
{
  "site.name": "SevenSeatJP 七座出行",
  "home.title": "东京 · 京都 · 白马 高端 7 座包车",
  "home.subtitle": "中文对接 · 机场接送 · 私人包车 · 滑雪接送",
  "nav.home": "首页",
  "nav.about": "公司介绍",
  "nav.airport": "机场接送",
  "nav.charter": "私人包车",
  "nav.ski": "白马滑雪",
  "nav.rental": "租车",
  "nav.vehicles": "车辆",
  "nav.pricing": "价格表",
  "nav.faq": "常见问题",
  "nav.inquiry": "在线询价",
  "form.submit": "提交询价",
  "form.error.invalid_payload": "请检查表单字段",
  "form.error.payload_too_large": "请求过大,请精简备注后重试",
  "form.error.turnstile_failed": "人机验证失败,请刷新重试",
  "form.error.turnstile_unavailable": "验证服务暂时不可用,请稍后重试或通过 LINE 联系",
  "form.error.email_send_failed": "提交失败,请通过 LINE 或微信联系",
  "form.success": "已收到您的询价,我们将在 24 小时内回复。"
}
```

- [ ] **Step 3: `src/i18n/t.ts`**

```ts
import ja from './ja.json';
import zh from './zh.json';

// 编译期保证 zh 不漏 key;漏 key 时 tsc 报错
const _zhComplete = zh satisfies Record<keyof typeof ja, string>;
void _zhComplete;

const dict = { ja, zh } as const;
export type Locale = keyof typeof dict;
export type I18nKey = keyof typeof ja;

export function t(locale: Locale, key: I18nKey): string {
  return dict[locale][key];
}

export function getLocaleFromUrl(url: URL): Locale {
  const p = url.pathname;
  return p === '/zh' || p.startsWith('/zh/') ? 'zh' : 'ja';
}
```

- [ ] **Step 4: `src/lib/alternate.ts`**

```ts
import type { Locale } from '@/i18n/t';

// SEO 用:不带 query/hash
export function getCanonicalUrl(currentUrl: URL, targetLocale: Locale): string {
  const path = currentUrl.pathname.replace(/^\/zh(\/|$)/, '/');
  if (targetLocale === 'zh') return path === '/' ? '/zh/' : `/zh${path}`;
  return path;
}

// UI 切换器用:保留 query。hash 由客户端 handler 追加
export function getLanguageSwitchUrl(currentUrl: URL, targetLocale: Locale): string {
  return getCanonicalUrl(currentUrl, targetLocale) + currentUrl.search;
}
```

- [ ] **Step 5: 用 t() 重写 `src/pages/index.astro`**

```astro
---
import '@/styles/globals.css';
import { t, getLocaleFromUrl } from '@/i18n/t';
const locale = getLocaleFromUrl(Astro.url);
---
<!doctype html>
<html lang={locale === 'ja' ? 'ja' : 'zh-CN'}>
  <head><meta charset="utf-8" /><title>{t(locale, 'site.name')}</title></head>
  <body class="min-h-screen bg-bg text-text flex flex-col items-center justify-center font-display gap-4">
    <h1 class="text-4xl text-gold">{t(locale, 'home.title')}</h1>
    <p class="text-text-muted">{t(locale, 'home.subtitle')}</p>
  </body>
</html>
```

- [ ] **Step 6: `src/pages/zh/index.astro`(zh 占位,Task 7 会替换)**

```astro
---
import '@/styles/globals.css';
import { t, getLocaleFromUrl } from '@/i18n/t';
const locale = getLocaleFromUrl(Astro.url);
---
<!doctype html>
<html lang="zh-CN">
  <head><meta charset="utf-8" /><title>{t(locale, 'site.name')}</title></head>
  <body class="min-h-screen bg-bg text-text flex flex-col items-center justify-center font-display gap-4">
    <h1 class="text-4xl text-gold">{t(locale, 'home.title')}</h1>
    <p class="text-text-muted">{t(locale, 'home.subtitle')}</p>
  </body>
</html>
```

- [ ] **Step 7: build + 验证**

```bash
bun run build
grep -c "東京" dist/index.html       # 期望 ≥ 1
grep -c "东京" dist/zh/index.html    # 期望 ≥ 1
```

- [ ] **Step 8: 故意删 zh.json 一个 key 验证编译期防漂移(然后还原)**

临时把 `zh.json` 里 `nav.home` 删掉 → `bun run typecheck` 必须 fail → 还原 → 通过。

- [ ] **Step 9: 提交**

```bash
git add src/i18n src/lib src/pages
git commit -m "feat: add i18n routing, helpers, bilingual placeholder pages"
```

---

### Task 4: Content Collections schema + seed 数据

**Goal:** 5 个 collections 全部 schema 化;5 条 routes / 2 条 packages / 3 条 vehicles / 6 条 FAQ / 3 条 testimonials seed 数据 build 通过。

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/routes/*.yaml`(× 5)
- Create: `src/content/packages/*.yaml`(× 2)
- Create: `src/content/vehicles/{alphard,vellfire,hiace}.yaml`
- Create: `src/content/faq/*.yaml`(× 6)
- Create: `src/content/testimonials/*.yaml`(× 3)
- Create: `src/assets/vehicles/{alphard,vellfire,hiace}-1.jpg`(临时占位,可用任意 jpg)

**Acceptance Criteria:**
- [ ] `bun run build` 通过(schema 校验 + vehicle reference 全部命中)
- [ ] 故意把 `routes/narita-tokyo.yaml` 的 `vehicles[0].vehicle` 改成不存在的 ID → build fail → 还原后通过
- [ ] 故意删 `vehicles/alphard.yaml` 的 `name.zh` → build fail(`i18nString.strict` + `.min(1)`)→ 还原

**Verify:** `bun run build` 通过 + 上述两个反向测试

**Steps:**

- [ ] **Step 1: 安装额外依赖(无,glob loader 已随 astro)**

确认 astro 5 自带 `astro/loaders`。

- [ ] **Step 2: `src/content.config.ts`(完整 5 collections)**

```ts
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const i18nString = z.object({
  ja: z.string().min(1),
  zh: z.string().min(1),
}).strict();

const fares = z.array(z.object({
  vehicle: reference('vehicles'),
  jpy: z.number().int().positive(),
  includes: i18nString,
  notes: i18nString.optional(),
})).min(1);

const routes = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/routes' }),
  schema: z.object({
    category: z.enum(['airport', 'ski']),
    from: i18nString,
    to: i18nString,
    durationMin: z.number().int().positive(),
    distanceKm: z.number().positive().optional(),
    fares,
    seasonal: z.object({
      from: z.string().regex(/^\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{2}-\d{2}$/),
    }).optional(),
    order: z.number().default(999),
  }),
});

const packages = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/packages' }),
  schema: z.object({
    type: z.enum(['charter', 'rental']),
    title: i18nString,
    durations: z.array(z.object({
      label: i18nString,
      hours: z.number().positive(),
      fares,
    })).min(1),
    inclusions: z.array(i18nString),
    excludeRegions: i18nString.optional(),
    notes: i18nString.optional(),
    order: z.number().default(999),
  }),
});

const vehicles = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/vehicles' }),
  schema: ({ image }) => z.object({
    name: i18nString,
    seatCount: z.number().int().min(1).max(15),
    luggageCount: z.number().int().min(0).max(15),
    features: z.array(i18nString).min(1),
    photos: z.array(image()).min(1),
    order: z.number().default(999),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/faq' }),
  schema: z.object({
    category: z.enum(['booking', 'payment', 'cancel', 'service', 'vehicle']),
    question: i18nString,
    answer: i18nString,
    order: z.number().default(999),
  }),
});

const testimonials = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/testimonials' }),
  schema: z.object({
    customerInitials: z.string().min(1).max(20),
    sourceChannel: z.enum(['xiaohongshu', 'klook', 'kkday', 'google', 'direct']),
    content: i18nString,
    rating: z.number().int().min(1).max(5),
    date: z.string().regex(/^\d{4}-\d{2}$/),
  }),
});

export const collections = { routes, packages, vehicles, faq, testimonials };
```

- [ ] **Step 3: 5 条 routes seed(每条路线一个文件;同路线不同车型用同一文件的 `fares[]` 多元素)**

`src/content/routes/narita-tokyo.yaml`、`haneda-tokyo.yaml`、`kix-osaka.yaml`、`kix-kyoto.yaml`、`tokyo-hakuba.yaml`(最后一条 `category: ski` + `seasonal: { from: "12-01", to: "03-31" }`)。

> **注意:** 不要按"路线 × 车型"建多个文件。同一条路线的不同车型价格属于同一文件 `fares[]` 数组的不同元素。下面 `narita-tokyo.yaml` 样例展示 3 车型一站式定价。

样例(`narita-tokyo.yaml`):

```yaml
category: airport
from: { ja: "成田国際空港", zh: "成田国际机场" }
to:   { ja: "東京都内",     zh: "东京都内" }
durationMin: 75
distanceKm: 70
fares:
  - vehicle: alphard
    jpy: 28000
    includes:
      ja: "高速代・駐車場代・運転手チップ込み"
      zh: "含高速费、停车费、司机服务费"
    notes:
      ja: "22:00〜翌5:00は深夜料金 +20%"
      zh: "22:00 至次日 5:00 加收 20% 夜间费"
  - vehicle: vellfire
    jpy: 30000
    includes:
      ja: "高速代・駐車場代込み"
      zh: "含高速费、停车费"
  - vehicle: hiace
    jpy: 32000
    includes:
      ja: "7名様まで・大型荷物対応"
      zh: "最多 7 人、大件行李"
order: 1
```

(其余 4 条同结构:`kix-kyoto.yaml` 关西机场 → 京都市内,常用 inbound 路线;每条路线在 `fares[]` 里列 1-3 个适合的车型。)

- [ ] **Step 4: 2 条 packages**

`src/content/packages/tokyo-full-day-charter.yaml`(type: charter)、`mt-fuji-rental-2day.yaml`(type: rental)。

样例(`tokyo-full-day-charter.yaml`):

```yaml
type: charter
title: { ja: "東京1日チャーター", zh: "东京整日包车" }
durations:
  - label: { ja: "半日 (4時間)", zh: "半日 4 小时" }
    hours: 4
    fares:
      - vehicle: alphard
        jpy: 38000
        includes: { ja: "市内100km以内", zh: "市内 100 公里以内" }
  - label: { ja: "1日 (8時間)", zh: "整日 8 小时" }
    hours: 8
    fares:
      - vehicle: alphard
        jpy: 65000
        includes: { ja: "市内200km以内", zh: "市内 200 公里以内" }
inclusions:
  - { ja: "ガソリン代込み", zh: "含油费" }
  - { ja: "高速代込み(東京都内)", zh: "含高速费(东京都内)" }
order: 1
```

- [ ] **Step 5: 3 条 vehicles + 占位图片**

`src/content/vehicles/alphard.yaml`:

```yaml
name: { ja: "トヨタ・アルファード", zh: "丰田 Alphard" }
seatCount: 6
luggageCount: 6
features:
  - { ja: "全車Wi-Fi完備", zh: "全车 Wi-Fi 覆盖" }
  - { ja: "革張りキャプテンシート", zh: "真皮独立座椅" }
photos:
  - ../../assets/vehicles/alphard-1.jpg
order: 1
```

(vellfire / hiace 同结构)。`src/assets/vehicles/` 放任意 3 张 jpg(可以是统一颜色块占位,Task 后续由客户素材替换)。

- [ ] **Step 6: 6 条 FAQ + 3 条 testimonials seed**

每条按 schema 写满 `i18nString`,真实业务文案。

- [ ] **Step 7: build + 反向测试**

```bash
bun run build               # 期望:通过
# 反向 1:把 narita-tokyo.yaml 第一条 fare 的 vehicle 改成 'nonexistent'
bun run build               # 期望:fail with "Reference to nonexistent in collection 'vehicles' is invalid"
# 还原后再次 build
bun run build               # 期望:通过
```

- [ ] **Step 8: 提交**

```bash
git add src/content.config.ts src/content src/assets
git commit -m "feat: add content collections schema and seed data"
```

---

### Task 5: BaseLayout + LangSwitch + UTM attribution

**Goal:** 所有页面共享一个 `BaseLayout`,包含 `<html lang>` / SEO `<head>` 三联 / LangSwitch / UTM attribution `<script>`;两种语言的 `/` 都用 BaseLayout 渲染。

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/ui/LangSwitch.astro`
- Create: `src/lib/attribution.client.ts`
- Modify: `src/pages/index.astro`、`src/pages/zh/index.astro`(改用 BaseLayout)

**Acceptance Criteria:**
- [ ] `dist/index.html` `<html>` 含 `lang="ja"`、`<link rel="canonical" hreflang>` 三联齐
- [ ] `dist/zh/index.html` `<html>` 含 `lang="zh-CN"`、hreflang 三联齐
- [ ] LangSwitch 渲染两条 `<a data-lang-switch>`
- [ ] BaseLayout 内联 `<script>` 引入 `attribution.client.ts`,build 后 `dist/` 下能 grep 到 `sevenseat_attr_first`

**Verify:**

```bash
bun run build
grep -c 'rel="alternate" hreflang="ja"' dist/index.html       # ≥ 1
grep -c 'rel="alternate" hreflang="zh"' dist/index.html       # ≥ 1
grep -c 'sevenseat_attr_first' dist/_astro/*.js               # ≥ 1
```

**Steps:**

- [ ] **Step 1: `src/lib/attribution.client.ts`**(完整内容 — 参见 spec §6.2 完整代码,粘贴即可,含 `safeGet/Set/Remove` + `readCurrent` + `init` IIFE + `readAttribution` 导出)

- [ ] **Step 2: `src/components/ui/LangSwitch.astro`**

```astro
---
import { getLocaleFromUrl } from '@/i18n/t';
import { getLanguageSwitchUrl } from '@/lib/alternate';
const locale = getLocaleFromUrl(Astro.url);
const jaHref = getLanguageSwitchUrl(Astro.url, 'ja');
const zhHref = getLanguageSwitchUrl(Astro.url, 'zh');
---
<div class="flex items-center gap-3 text-sm">
  <a data-lang-switch href={jaHref}
     class:list={['inline-flex items-center justify-center min-h-11 min-w-11 px-3 underline-offset-4',
                  locale === 'ja' && 'underline text-gold']}>日本語</a>
  <span class="text-text-muted" aria-hidden="true">/</span>
  <a data-lang-switch href={zhHref}
     class:list={['inline-flex items-center justify-center min-h-11 min-w-11 px-3 underline-offset-4',
                  locale === 'zh' && 'underline text-gold']}>中文</a>
</div>

<script>
  document.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]').forEach((a) => {
    a.addEventListener('click', () => {
      try {
        if (location.hash) {
          const href = a.getAttribute('href') ?? '';
          a.setAttribute('href', href + location.hash);
        }
      } catch { /* swallow */ }
    });
  });
</script>
```

- [ ] **Step 3: `src/layouts/BaseLayout.astro`**

```astro
---
import '@/styles/globals.css';
import LangSwitch from '@/components/ui/LangSwitch.astro';
import { type Locale, t } from '@/i18n/t';
import { getCanonicalUrl } from '@/lib/alternate';

interface Props {
  locale: Locale;
  title?: string;
  description?: string;
}

const { locale, title, description } = Astro.props;
const fullTitle = title ? `${title} | ${t(locale, 'site.name')}` : t(locale, 'site.name');
const canonical = new URL(getCanonicalUrl(Astro.url, locale), Astro.site);
const jaUrl     = new URL(getCanonicalUrl(Astro.url, 'ja'), Astro.site);
const zhUrl     = new URL(getCanonicalUrl(Astro.url, 'zh'), Astro.site);
---
<!doctype html>
<html lang={locale === 'ja' ? 'ja' : 'zh-CN'}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{fullTitle}</title>
    {description && <meta name="description" content={description} />}
    <link rel="canonical" href={canonical} />
    <link rel="alternate" hreflang="ja"        href={jaUrl} />
    <link rel="alternate" hreflang="zh"        href={zhUrl} />
    <link rel="alternate" hreflang="x-default" href={jaUrl} />
    <script>
      import '@/lib/attribution.client';
    </script>
  </head>
  <body class="min-h-screen bg-bg text-text font-body">
    <header class="flex items-center justify-between p-6">
      <a href={locale === 'zh' ? '/zh/' : '/'} class="font-display text-xl text-gold">{t(locale, 'site.name')}</a>
      <LangSwitch />
    </header>
    <main><slot /></main>
    <footer class="p-6 text-center text-text-muted text-sm">© SevenSeatJP</footer>
  </body>
</html>
```

- [ ] **Step 4: 改写 `src/pages/index.astro` 与 `src/pages/zh/index.astro` 用 BaseLayout**

```astro
---
// src/pages/index.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import { t } from '@/i18n/t';
const locale = 'ja';
---
<BaseLayout locale={locale} title={t(locale, 'home.title')} description={t(locale, 'home.subtitle')}>
  <section class="flex flex-col items-center justify-center gap-4 p-12">
    <h1 class="text-5xl text-gold font-display">{t(locale, 'home.title')}</h1>
    <p class="text-text-muted">{t(locale, 'home.subtitle')}</p>
  </section>
</BaseLayout>
```

zh 镜像同结构,`locale = 'zh'`。

- [ ] **Step 5: build + 检查**

```bash
bun run build
grep -E 'rel="alternate" hreflang="(ja|zh|x-default)"' dist/index.html
grep -E 'rel="alternate" hreflang="(ja|zh|x-default)"' dist/zh/index.html
grep -r 'sevenseat_attr_first' dist/ | head -3
```

- [ ] **Step 6: 提交**

```bash
git add src/layouts src/components/ui/LangSwitch.astro src/lib/attribution.client.ts src/pages
git commit -m "feat: add BaseLayout, LangSwitch, UTM attribution module"
```

---

### Task 6: 共享 UI 组件

**Goal:** 抽取 `Section` / `Container` / `Card` / `Button` 4 个最常用组件,后续页面任务可直接复用;`globals.css` 加 typography utility。

**Files:**
- Create: `src/components/ui/Section.astro`
- Create: `src/components/ui/Container.astro`
- Create: `src/components/ui/Card.astro`
- Create: `src/components/ui/Button.astro`

**Acceptance Criteria:**
- [ ] 4 个组件 build 通过
- [ ] 在 `index.astro` 临时用一次 `<Section>` 包裹 `<Container>` + `<Button>`,build 后 HTML 中包含对应 class
- [ ] 全部走 zero-margin 规范(`gap`/`padding`,无 `m-*`、`mx-auto`、`space-*`)

**Verify:** `bun run build && bun run typecheck && grep -q 'rounded-' dist/index.html`

**Steps:**

- [ ] **Step 1: `src/components/ui/Container.astro`**

```astro
---
interface Props { class?: string; }
const { class: extra = '' } = Astro.props;
---
<div class:list={['w-full max-w-6xl px-6', extra]}><slot /></div>
```

(用 `px-6` + `max-w-6xl`,父级自带 `flex justify-center` 实现居中,避免 `mx-auto`)

- [ ] **Step 2: `src/components/ui/Section.astro`**

```astro
---
interface Props { class?: string; }
const { class: extra = '' } = Astro.props;
---
<section class:list={['flex justify-center py-16', extra]}><slot /></section>
```

- [ ] **Step 3: `src/components/ui/Card.astro`**

```astro
---
interface Props { class?: string; }
const { class: extra = '' } = Astro.props;
---
<div class:list={['bg-surface border border-border rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]', extra]}>
  <slot />
</div>
```

- [ ] **Step 4: `src/components/ui/Button.astro`**

```astro
---
interface Props {
  href?: string;
  variant?: 'primary' | 'ghost';
  class?: string;
}
const { href, variant = 'primary', class: extra = '' } = Astro.props;
const base = 'inline-flex items-center justify-center min-h-11 px-6 rounded-[var(--radius-card)] font-display transition-colors';
const styles = variant === 'primary'
  ? 'bg-gold text-bg hover:bg-gold-dark'
  : 'border border-border text-text hover:border-gold';
---
{href ? (
  <a href={href} class:list={[base, styles, extra]}><slot /></a>
) : (
  <button class:list={[base, styles, extra]}><slot /></button>
)}
```

- [ ] **Step 5: 在 `index.astro` 临时演示 + build 验证 + 还原**

```astro
<Section>
  <Container>
    <Button href="/inquiry" variant="primary">{t(locale, 'nav.inquiry')}</Button>
  </Container>
</Section>
```

```bash
bun run build && grep -q 'rounded-' dist/index.html
```

- [ ] **Step 6: 提交**

```bash
git add src/components/ui
git commit -m "feat: add Section/Container/Card/Button shared UI components"
```

---

### Task 7: HomePage 完整页面

**Goal:** 首页内容只写一份(`src/components/pages/HomePage.astro`),`src/pages/index.astro` 与 `src/pages/zh/index.astro` 各 2 行引用。包含 Hero / ServiceGrid / Testimonials / CTA 四段。

**Files:**
- Create: `src/components/pages/HomePage.astro`
- Create: `src/components/home/Hero.astro`
- Create: `src/components/home/ServiceGrid.astro`
- Create: `src/components/home/TestimonialsList.astro`
- Modify: `src/pages/index.astro`、`src/pages/zh/index.astro`

**Acceptance Criteria:**
- [ ] `/` 和 `/zh/` 均含 4 段(Hero 标题 / 4 个服务卡片 / 3 条 testimonials / 询价 CTA)
- [ ] 服务卡片 4 张分别指向 `airport-transfer` / `charter` / `ski-hakuba` / `rental`,语言匹配(ja 不带前缀,zh 带 `/zh/`)
- [ ] Testimonials 从 `getCollection('testimonials')` 取,渲染 3 条

**Verify:** `bun run build && grep -c 'data-service-card' dist/index.html`(期望 4)`&& grep -c 'data-testimonial' dist/zh/index.html`(期望 3)

**Steps:**

- [ ] **Step 1: `src/components/home/Hero.astro`**(接受 `locale` prop;CTA 按 locale 生成 `/inquiry` 或 `/zh/inquiry`)
- [ ] **Step 2: `src/components/home/ServiceGrid.astro`**(4 个 Card,每个 `data-service-card` 属性 + 内部 anchor)
- [ ] **Step 3: `src/components/home/TestimonialsList.astro`**(从 `getCollection` 拉,排序按 `date desc`)
- [ ] **Step 4: `src/components/pages/HomePage.astro`** 组合三段 + CTA Section
- [ ] **Step 5: 镜像 page 文件改成 `<HomePage locale="ja" />` / `<HomePage locale="zh" />`**
- [ ] **Step 6: 提交**

```bash
git add src/components/pages src/components/home src/pages/index.astro src/pages/zh/index.astro
git commit -m "feat: implement HomePage with hero, services, testimonials"
```

---

### Task 8: About + FAQ 页

**Goal:** 公司介绍页与 FAQ 页完整化(中日双语,镜像两份)。

**Files:**
- Create: `src/components/pages/AboutPage.astro`、`FaqPage.astro`
- Create: `src/pages/about.astro`、`src/pages/faq.astro`
- Create: `src/pages/zh/about.astro`、`src/pages/zh/faq.astro`

**Acceptance Criteria:**
- [ ] 4 个 URL(`/about`、`/zh/about`、`/faq`、`/zh/faq`)均 build 200
- [ ] FAQ 页从 collection 渲染所有条目,按 `category` 分组,`order` 升序
- [ ] About 页包含公司基本信息占位 + 特商法 / 隐私政策两条链接(目标 Task 11 创建)

**Verify:** `bun run build && for p in about zh/about faq zh/faq; do test -f dist/$p/index.html && echo OK; done`(全 OK)

**Steps:** 同 Task 7 同款 5 步流程(组件 → page 镜像 → build → commit)。

提交:

```bash
git commit -m "feat: add About and FAQ pages"
```

---

### Task 9: 服务详情页(机场 + 白马)

**Goal:** `airport-transfer` 与 `ski-hakuba` 两页完整,共享 `PriceTable` 组件。

**Files:**
- Create: `src/components/route/PriceTable.astro`
- Create: `src/components/pages/AirportTransferPage.astro`、`SkiHakubaPage.astro`
- Create: `src/pages/airport-transfer.astro`、`ski-hakuba.astro`
- Create: `src/pages/zh/airport-transfer.astro`、`zh/ski-hakuba.astro`

**Acceptance Criteria:**
- [ ] AirportTransferPage 从 `routes` collection 过滤 `category === 'airport'` 渲染
- [ ] SkiHakubaPage 过滤 `category === 'ski'` 渲染,显示 `seasonal` 标签
- [ ] PriceTable 列:出发地 / 目的地 / 车型 / 价格 / 包含项 / 备注
- [ ] 每行价格按 `Intl.NumberFormat('ja-JP').format()` 显示

**Verify:** `bun run build && grep -c '¥' dist/airport-transfer/index.html`(≥ 1)

**Steps:** PriceTable 接收 `routes: CollectionEntry<'routes'>[]` 与 `locale: Locale`;按 fare 拆行;build + commit。

```bash
git commit -m "feat: add airport-transfer and ski-hakuba service pages"
```

---

### Task 10: 服务详情页(包车 + 租车)+ 价格表 + 车辆

**Goal:** `charter`、`rental`、`pricing`(汇总所有路线)、`vehicles`(从 collection 渲染)4 页完整(× 2 语言镜像)。

**Files:**
- Create: `src/components/pages/CharterPage.astro`、`RentalPage.astro`、`PricingPage.astro`、`VehiclesPage.astro`
- Create: `src/components/route/PackageCard.astro`、`VehicleCard.astro`
- Create: 8 个 `pages/{*,zh/*}.astro` 镜像

**Acceptance Criteria:**
- [ ] CharterPage / RentalPage 从 `packages` collection 过滤对应 `type` 渲染 PackageCard 列表
- [ ] PricingPage 汇总 routes(airport + ski)+ packages,按类别分段
- [ ] VehiclesPage 渲染 3 张 VehicleCard,含图片(Astro 优化)
- [ ] 全部 8 个 URL build 200

**Verify:** `for p in charter rental pricing vehicles; do for prefix in '' 'zh/'; do test -f dist/$prefix$p/index.html && echo "OK $prefix$p"; done; done`

**Steps:** 按组件 → page 镜像 → build → commit 流程。

```bash
git commit -m "feat: add charter, rental, pricing, vehicles pages"
```

---

### Task 11: 法务页 3 个

**Goal:** 特商法表記 / 隐私政策 / 取消政策,直接 `.astro` 页面写文案(不进 collection),双语镜像。

**Files:**
- Create: `src/pages/legal/{tokushoho,privacy,cancel-policy}.astro`
- Create: `src/pages/zh/legal/{tokushoho,privacy,cancel-policy}.astro`
- Create: `src/components/pages/legal/{Tokushoho,Privacy,Cancel}Page.astro`(各页内容,接受 locale prop)

**Acceptance Criteria:**
- [ ] 6 个法务 URL build 200
- [ ] 特商法表記页含字段:販売事業者 / 代表者 / 所在地 / 連絡先 / 取扱商品 / 販売価格 / 支払方法 / 商品引渡時期 / 返品 · 交換(占位文案,客户素材到位时替换)
- [ ] 隐私政策声明:**询价数据存储在 Resend(默认 30 天)与公司 Gmail;不接 GA/Pixel;Turnstile 不使用 cookie**(spec §12 原文)
- [ ] 取消政策含取消时间窗口(占位 e.g. 24h 前免费,12h 内 50%,2h 内 100%)

**Verify:** `for p in legal/tokushoho legal/privacy legal/cancel-policy; do for prefix in '' 'zh/'; do test -f dist/$prefix$p/index.html; done; done`

**Steps:** 各页内容固定 markdown 风格 + BaseLayout 包裹 + commit。

```bash
git commit -m "feat: add legal pages (tokushoho, privacy, cancel-policy)"
```

---

### Task 12: 询价表单 — Schema + 前端 + Turnstile

**Goal:** `src/lib/schemas/inquiry.ts` 完整;`InquiryForm.astro` + `inquiry-form.client.ts` 完整;Turnstile widget 只在询价页加载;无 JS 时显示 LINE/微信兜底联系方式。**本任务不动 Function**,但表单提交链路要能在 Task 13 完成后即时跑通。

**Files:**
- Create: `src/lib/schemas/inquiry.ts`(spec §7.3 完整 `InquirySchema` + `Attr` 含 `.max`)
- Create: `src/components/inquiry/InquiryForm.astro`
- Create: `src/components/inquiry/inquiry-form.client.ts`
- Create: `src/components/pages/InquiryPage.astro`(包含 form + 标题 + 隐私说明 + `<noscript>` 兜底)
- Create: `src/pages/inquiry.astro`、`src/pages/zh/inquiry.astro`

**Acceptance Criteria:**
- [ ] `bun run build && bun run typecheck` 通过
- [ ] `/inquiry`、`/zh/inquiry` 渲染表单 + Turnstile widget
- [ ] Turnstile widget `data-sitekey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY}` + **`data-size="flexible"`**(适应移动端窄屏)
- [ ] **input 移动端键盘类型正确**(grep 验证):
  - `<input type="email" inputmode="email" autocomplete="email">`(email)
  - `<input type="tel" inputmode="tel" autocomplete="tel-national">`(phone)
  - `<input type="number" inputmode="numeric">`(passengers / luggage)
  - `<input type="date">` / `<input type="time">`(原生 picker)
  - `<input autocomplete="name">`(name)
- [ ] 所有 input/textarea/select 通过 `<label for=>` 关联;`aria-describedby` 关联错误信息
- [ ] 其他营销页 grep 不到 `challenges.cloudflare.com`(只询价页加载)
- [ ] `<noscript>` 区域显示 LINE/微信/邮箱兜底
- [ ] 客户端 island 在提交前若 turnstileToken 为空,显示 `form.error.turnstile_failed` 文案
- [ ] **375px viewport 表单不溢出**:`bunx playwright screenshot` 在 iPhone SE 尺寸下截图,form 完整可见无横向滚动
- [ ] Submit 按钮 loading 状态 `disabled` + `aria-busy="true"`

**Verify:**

```bash
bun run build
grep -q 'challenges.cloudflare.com' dist/inquiry/index.html
! grep -q 'challenges.cloudflare.com' dist/index.html
grep -q '<noscript' dist/inquiry/index.html
grep -q 'inputmode="email"' dist/inquiry/index.html
grep -q 'inputmode="tel"' dist/inquiry/index.html
grep -q 'autocomplete="email"' dist/inquiry/index.html
grep -q 'data-size="flexible"' dist/inquiry/index.html
```

**Steps:** schema → form astro(全字段含 inputmode/autocomplete/aria,Turnstile div `data-size="flexible"`)→ client island(disabled + aria-busy)→ InquiryPage 组装 → 镜像 → build → 移动端 375px 截图验证 → commit。

```bash
git commit -m "feat: add inquiry form with Turnstile widget and shared schema"
```

---

### Task 13: 询价表单 — Pages Function + 邮件模板 + 本地链路调通

**Goal:** `functions/api/inquiry.ts` 与 React Email 模板完整;**本地 `bun run dev` 起 wrangler,真实填表 → Resend API 调用成功 + Resend dashboard 显示 sent event**,跑通完整代码链路。**真实邮箱送达测试**(Gmail/Outlook/QQ/163/iCloud 5 个)**留到 Task 16**,在生产 Resend 域名 + DNS 配置完成后做。

> **重要:** `delivered@resend.dev` 是 Resend 的**测试地址**,API 调用会返回成功且在 dashboard 留下 sent event,但**不会真实送达任何 inbox**。本任务用这个地址验证 API + 代码链路;`onboarding@resend.dev` 测试发件域对任意客户邮箱有限制,只能发到 `delivered+*@resend.dev` 这类测试地址。生产域名 + 真实送达验证由 Task 16 负责。

**Files:**
- Create: `functions/api/inquiry.ts`(spec §7.3 完整 + 包含 `sendInternalEmail` / `sendCustomerEmail` helper + content-type/byteLength guard + Turnstile try/catch 503 兜底)
- Create: `src/emails/InquiryInternal.tsx`、`src/emails/InquiryCustomer.tsx`(React Email)
- Create: `.dev.vars`(本地复制 `.dev.vars.example` + 真值;**不提交**)
- Create: `.env.local`(本地复制 `.env.local.example`;**不提交**)

**Acceptance Criteria:**
- [ ] `bun run dev`(wrangler pages dev)起后,浏览器访问 `http://localhost:4321/inquiry`,填完整表单(客户邮箱填 `delivered+customer@resend.dev`)+ Turnstile dummy 通过 → 提交 → 浏览器显示 `form.success` 文案
- [ ] **Resend dashboard 显示 2 个 sent event**:1 个发往 `delivered+internal@resend.dev`(模拟公司邮箱)+ 1 个发往 `delivered+customer@resend.dev`(客户确认)
- [ ] **内部邮件 event 的 subject** 含 `[direct]` 前缀(无 UTM 时)或 utm source 前缀(带 `?utm_source=test` 访问首页再走到 inquiry)
- [ ] **反向 1:** 改 Turnstile siteverify URL 为 `https://nonexistent.example/` → 提交后浏览器显示 `form.error.turnstile_unavailable`(503),Resend dashboard 无新 event
- [ ] **反向 2:** notes 字段填 >100KB 文本 → 浏览器显示 `form.error.payload_too_large`(413),Resend dashboard 无新 event
- [ ] **反向 3:** 临时把 `RESEND_API_KEY` 换成无效值 → 浏览器显示 `form.error.email_send_failed`(502)
- [ ] 内部邮件正文 HTML(在 Resend dashboard event 详情里查看)含完整 UTM 归因块(首触 / 末触 / 本次三段)
- [ ] `bun run typecheck` 通过

**Verify:** 上述 7 条 + Resend dashboard 截图/事件 ID 记录在 commit message 或 PR description 中。

**注意:`COMPANY_INBOX` 在本地 `.dev.vars` 必须设为 `delivered+internal@resend.dev`**(不是真实邮箱),否则 onboarding 发件域被限制无法发送。

**Steps:**

- [ ] Step 1: 实现 `src/lib/schemas/inquiry.ts`(若 Task 12 未实现完整)
- [ ] Step 2: `functions/api/inquiry.ts` 整段从 spec §7.3 复制
- [ ] Step 3: 两个 React Email 模板(内部模板含归因块,客户模板按 `data.locale` 单语)
- [ ] Step 4: 本地 `.dev.vars` + `.env.local` 配 Turnstile dummy + Resend 测试 key
- [ ] Step 5: `bun run dev` 本地跑流程
- [ ] Step 6: 测 4 个反向场景(Turnstile 失败 / 不可用 / payload 过大 / 邮件成功)
- [ ] Step 7: 提交

```bash
git add functions src/lib/schemas src/emails src/components/inquiry
git commit -m "feat: implement inquiry Pages Function with Resend dual emails"
```

---

### Task 14: SEO 完整化 + 解除占位阶段防索引

**Goal:** `@astrojs/sitemap` 自动生成 `sitemap-index.xml`;首页注入 LocalBusiness JSON-LD;OG 完整;每页 `<head>` 都从 BaseLayout 输出 `description` + `og:*`。**同时把 Task 2 阶段的反索引保护切换为正式 SEO 配置**(robots.txt Allow / 移除 X-Robots-Tag: noindex)。

**Files:**
- Modify: `astro.config.mjs`(加 `@astrojs/sitemap` integration,配 i18n 字段)
- Modify: `src/layouts/BaseLayout.astro`(加 OG/Twitter meta)
- Create: `src/components/seo/LocalBusinessJsonLd.astro`(JSON-LD)
- Modify: `src/components/pages/HomePage.astro`(注入 JSON-LD)
- Create: `public/og-default.png`(占位 1200×630)
- **Modify: `public/robots.txt`(从 `Disallow: /` 改为 `Allow: /` + Sitemap 行)**
- **Modify: `public/_headers`(删除 `X-Robots-Tag: noindex, nofollow` 行)**

**Acceptance Criteria:**
- [ ] `dist/sitemap-index.xml` 存在,包含 `/zh/` 路由
- [ ] `dist/index.html` 含 `application/ld+json` 含 `"@type": "LocalBusiness"`
- [ ] 所有页面 `<head>` 含 `og:title` `og:description` `og:image` `og:locale`(ja → `ja_JP`,zh → `zh_CN`)+ `twitter:card`
- [ ] **`dist/robots.txt`** = `User-agent: *\nAllow: /\n\nSitemap: https://sevenseatjp.com/sitemap-index.xml`
- [ ] **`dist/_headers` 中无 `X-Robots-Tag: noindex` 行**:`! grep -q 'X-Robots-Tag' dist/_headers`
- [ ] 部署后 `curl -I https://<prod>/` 响应头无 `X-Robots-Tag`

**Verify:**

```bash
bun run build
test -f dist/sitemap-index.xml && grep -q '/zh/' dist/sitemap-index.xml
grep -q '"@type": "LocalBusiness"' dist/index.html
grep -q 'og:locale" content="ja_JP"' dist/index.html
grep -q 'og:locale" content="zh_CN"' dist/zh/index.html
```

**Steps:** sitemap → BaseLayout OG → JsonLd 组件 → 注入首页 → build verify → commit。

```bash
git commit -m "feat: add sitemap, JSON-LD, OG metadata for SEO"
```

---

### Task 15: Playwright E2E + GitHub Actions CI

**Goal:** Playwright config 用 `wrangler pages dev` 走真实 Function;3 个 spec 覆盖关键路径;CI workflow 跑 lint+typecheck+build,PR 加 `run-e2e` 标签时跑 E2E。

**Files:**
- Create: `playwright.config.ts`(spec §8.5 完整片段含 `SECRET_KEYS.filter` + **两个 projects:`chromium-desktop` 与 `chromium-mobile`**)
- Create: `tests/e2e/pages.spec.ts`(13 页 × 2 语言 = 26 cases × 2 projects = 52 cases:每个 URL 200 + h1 文案 + 无横向滚动)
- Create: `tests/e2e/i18n.spec.ts`(语言切换 + hreflang + 保留 query + 客户端 hash handler)
- Create: `tests/e2e/inquiry.spec.ts`(成功 / 客户端校验 / 服务端 400 / UTM 归因 4 case)
- Create: `.github/workflows/ci.yml`(`on.pull_request.types` 含 `labeled`)
- Create: `.github/workflows/README.md`

**Acceptance Criteria:**
- [ ] 本地 `bun run test:e2e` 通过(`.dev.vars` 已配)——**desktop + mobile 两个 projects 都跑**
- [ ] 推 PR 不触发 e2e job;build/lint/typecheck 通过
- [ ] **加 `run-e2e` 标签 → workflow 重新触发 → e2e job 通过**
- [ ] 去掉再加标签 → workflow 再次触发(验证 labeled event 生效)
- [ ] `inquiry.spec.ts` UTM 归因 case 验证 `payload.utm.firstTouch.source === 'test'`
- [ ] i18n.spec.ts 验证 LangSwitch 客户端 hash handler
- [ ] **`pages.spec.ts` 每页两个 viewport 都跑** + 验证 `document.documentElement.scrollWidth === document.documentElement.clientWidth`(无横向滚动)
- [ ] **mobile project 在 iPhone 14(390×844)模拟器跑**,所有 13 页通过

**playwright.config.ts 关键片段(两个 projects):**

```ts
import { defineConfig, devices } from '@playwright/test';

const SECRET_KEYS = ['RESEND_API_KEY', 'TURNSTILE_SECRET_KEY', 'COMPANY_INBOX', 'INQUIRY_FROM_EMAIL'] as const;
const bindings = SECRET_KEYS
  .filter((k) => typeof process.env[k] === 'string' && process.env[k] !== '')
  .map((k) => `--binding=${k}=${process.env[k]}`)
  .join(' ');

export default defineConfig({
  webServer: {
    command: `wrangler pages dev dist --port 4321 --compatibility-flag=nodejs_compat ${bindings}`.trim(),
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://127.0.0.1:4321' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile',  use: { ...devices['iPhone 14'] } },
  ],
});
```

**Verify:** `bun run test:e2e --reporter=line` 全 PASS;GitHub Actions PR run 显示 `build` job 绿 + `e2e` job 在加标签后绿

**workflow YAML 关键片段(spec §8.4 基础上明确加 `labeled` types):**

```yaml
on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, labeled]

env:
  PUBLIC_TURNSTILE_SITE_KEY: 1x00000000000000000000AA

jobs:
  build:
    # 见 spec §8.4
  e2e:
    needs: build
    if: github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'run-e2e')
    # 见 spec §8.4
```

**Steps:** config → 3 spec → workflow → 本地跑通 → 推 throwaway PR 验证 → commit。

```bash
git commit -m "test: add Playwright E2E suite and GitHub Actions CI"
```

---

### Task 16: 性能调优 + 上线冒烟 [user-gate]

> **USER-ORDERED GATE — NON-SKIPPABLE.** This task was requested by the user in the current conversation. It MUST NOT be closed by walking around it, by declaring it "verified inline", or by substituting a cheaper check. Close only after every item in `acceptanceCriteria` has been re-validated independently, with output captured.

**Goal:** 满足 spec §13 全部上线验收清单。包含字体子集化、图片优化、Lighthouse 跑分、Resend 发送域 DNS、5 个真实邮箱测试、跨设备/浏览器测试、最终切换 DNS 到生产域名。

**Files:**
- Modify: `src/layouts/BaseLayout.astro`(字体 preload + subset)
- Modify: `src/content/vehicles/*.yaml`(替换为客户真实图片;由客户素材到位驱动)
- Modify: 任意必要的 page/component(根据 Lighthouse 报告)
- Create: `docs/launch-checklist.md`(记录每项验收结果 + 截图/日志路径)

**Acceptance Criteria:**
- [ ] Lighthouse(mobile + desktop)**性能 ≥ 95、可访问性 ≥ 95、SEO = 100**——5 个核心页面(`/`、`/zh/`、`/inquiry`、`/zh/pricing`、`/zh/vehicles`)分别跑分截图存入 `docs/launch-checklist.md`
- [ ] Resend 发送域 SPF/DKIM/DMARC 在 `mail-tester.com` 评分 **≥ 9/10**,截图存入 checklist
- [ ] 5 个真实邮箱(Gmail / Outlook / QQ / 163 / iCloud)各提交一次询价 → 公司收件 + 客户确认信均到达 → 5 条结果记录于 checklist(到达 / spam 文件夹 / 未到达)
- [ ] 跨设备测试通过:iPhone Safari + Android Chrome + macOS Chrome/Safari/Firefox + Windows Edge,共 6 项 → checklist 标 OK/issue
- [ ] 中日双语切换无残留:在 `/zh/pricing` 切到 ja,再切回 zh,所有 UI 字符串 + 内容字段无 fallback / 无英文 key 漏出
- [ ] 9 个核心营销页 + 询价页 + 3 个法务页全部可访问(`for p in ... ; do curl -sf https://sevenseatjp.com/$p > /dev/null && echo OK; done` 全 OK)
- [ ] CTA 流向匹配语言:`grep -A1 'data-cta-inquiry' dist/zh/index.html` 命中 `/zh/inquiry`;ja 页命中 `/inquiry`
- [ ] Turnstile widget 显示且 server-side siteverify 真实通过(用真实 site key 提交一次)
- [ ] 内部邮件含完整渠道归因块、subject 含 last-touch source
- [ ] `_headers` CSP 在询价页 + 营销页都未阻断关键资源(浏览器 console 无 CSP violation)

**Verify:**

完成全部验收后,在 `docs/launch-checklist.md` 中逐项 ✓ 并附以下证据:
- Lighthouse 报告(`lighthouse <url> --output=json` 输出或截图)
- mail-tester.com 截图 + URL
- 5 封真实邮件的 Gmail 截图或 Message-ID
- 浏览器 console 截图(无 CSP violation)
- 6 项跨设备测试逐项 OK 标记

最终执行:`git tag v1.0.0 && git push origin v1.0.0` 标记正式上线版本。

**Steps:**

- [ ] **Step 1: 字体子集化与 preload**
  - 用 [Subset 工具](https://everythingfonts.com/subsetter) 或 fontTools 把 Noto Serif/Sans JP 子集化到日中文常用字符
  - `BaseLayout.astro` `<head>` 加 `<link rel="preload" as="font" type="font/woff2" crossorigin>` 对应 woff2

- [ ] **Step 2: 图片优化(等客户素材)**
  - 客户真实车辆图替换 seed 占位
  - 用 Astro `<Image>` 组件自动 webp + responsive srcset

- [ ] **Step 3: Lighthouse 跑分,迭代修复**
  ```bash
  bunx lighthouse https://sevenseatjp.com --view --output=html --output-path=./docs/launch/lh-home-prod.html
  ```
  对每条 < 95 的指标针对性修(关键 CSS、defer JS、图片 lazy 等)

- [ ] **Step 4: Resend 发送域 DNS 配置**
  - 在 DNS 提供商加 SPF / DKIM / DMARC(spec §8.3 三条记录)
  - Resend dashboard 验证域名变绿
  - `curl -X POST https://www.mail-tester.com/...` 或手工提交测试地址

- [ ] **Step 5: 5 个真实邮箱测试**
  - 在 `/zh/inquiry` 用 5 个邮箱各提交一次(每次填不同 utm 源以验证归因)
  - 公司 Gmail 检查 5 封内部信(subject 前缀 / 归因块完整)
  - 5 个客户邮箱检查确认信(是否进 spam)

- [ ] **Step 6: 跨设备/浏览器测试**(6 项逐一手测)

- [ ] **Step 7: 双语切换残留扫描**
  - 浏览器开 DevTools console,跑 `Array.from(document.querySelectorAll('*')).filter(e => /[a-z]+\.[a-z]+/.test(e.textContent || '') && e.children.length === 0).map(e => e.textContent)`
  - 验证返回数组里无 `home.title` 之类未解析的 i18n key 漏出

- [ ] **Step 8: 切 DNS 到生产域名**
  - CF Pages 加 custom domain `sevenseatjp.com`
  - DNS A/CNAME 指向 CF Pages
  - 等 SSL 颁发完成
  - 完整 checklist URL 替换 `*.pages.dev` 为生产域名重跑关键检查

- [ ] **Step 9: 写 `docs/launch-checklist.md` 全证据存档**

- [ ] **Step 10: 打 tag 标记上线**

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 后续(超出本计划范围)

参见 spec §15 不在本期范围:在线支付、独立后台、D1 历史询价 admin、英文站、GA/Pixel、多租户、SEO 落地页扩展。
