---
title: SevenSeatJP 网站设计规范
date: 2026-05-25
status: draft (待用户审核)
authors: cricket
---

# SevenSeatJP 网站设计规范

## 1. 项目概览

### 1.1 业务定位

日本本地合规出租车公司面向**中国 inbound 游客**的高端品牌官网,核心是多渠道获客的可信背书与询价入口。

- 服务范围:机场接送 / 私人包车 / 白马滑雪接送 / 租车
- 主要获客渠道:Klook、KKday、小红书、Google
- 客户决策路径:**外部种草 → 搜公司名 → 进官网验证资质 → LINE/微信加联系 → 询价确认**
- 不做欧美客户、不做在线支付,只做询价制
- 公司无独立后台,内容修改由开发者维护

### 1.2 工期与商业边界

| 项 | 值 |
|---|---|
| 总工期 | 2-3 周(素材齐全前提) |
| 页面数(合同口径) | 9 个核心营销页 + 1 个询价页 + 3 个法务辅助页 |
| 语言 | 日文(默认)、中文 |
| 建站费 | 12,000-15,000 元(参见报价单 v2) |

## 2. 技术决策

### 2.1 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Astro 6(TS) | 默认 SSG、零运行时 JS、岛屿水合按需;纯 static + 独立 Pages Functions 路径,不依赖 @astrojs/cloudflare adapter |
| 输出模式 | `output: 'static'`(纯静态) | 与 CF Pages 最佳契合;无 Astro adapter |
| 样式 | Tailwind v4(CSS-first,Vite plugin) | token 写在 `globals.css` 的 `@theme {}` |
| 内容 | Astro Content Collections + Zod(`astro/zod`) | YAML 数据 + 编译期校验 |
| i18n | Astro 原生 i18n + 自写 `t()` helper | 默认 `ja` 用根路径,`zh` 用 `/zh/` 子路径 |
| 表单后端 | **Cloudflare Pages Functions**(独立 `functions/api/inquiry.ts`) | 同仓库部署、`context.env`、`context.waitUntil` |
| 邮件 | Resend(免费 100/日、3000/月) | React Email 模板,中日双语 |
| 防滥用 | Cloudflare Turnstile(必须 server-side siteverify) | 免费、无 cookie、E2E 用 dummy keys |
| 部署 | Cloudflare Pages,GitHub 直连 | 免费、全球 CDN、PR preview |
| 包管理 | Bun(与工作区一致) | — |
| 代码质量 | Biome(lint+format) + `astro check`(类型) | 与工作区一致 |
| 测试 | Playwright(关键路径 E2E) | 工期紧,不写单测 |

### 2.2 不引入的东西

- **不引 UI 组件库**(shadcn / HeroUI / 等)——黑金高端商务调性靠手写 Tailwind 组件
- **不引 i18n 第三方库**(next-intl / paraglide / 等)——Astro 原生 + 自写 helper 足够
- **不接 CMS**——公司无后台,内容直接写 YAML/MD
- **不引数据库**(D1 不接)——询价仅靠邮件,Gmail 即 CRM
- **不写单测/快照**——只跑 Playwright E2E

### 2.3 准确性约束

> 报价单营销话术里的"零攻击面 / 无 cookies"在 spec 层修订为:**静态页面攻击面极小,仅 `/api/inquiry` 一处动态入口;Turnstile 默认无 cookie,不开 pre-clearance**。

## 3. 架构总览

### 3.1 顶层数据流

```
浏览者
  │
  │ ① 浏览(纯静态 HTML,CF CDN 边缘命中)
  ▼
[Astro 生成的 9+4 个静态页]    ← build 时从 YAML 渲染
  │
  │ ② 询价提交(JS island fetch POST → /api/inquiry)
  ▼
[CF Pages Function: /api/inquiry]   ← 由 functions/api/inquiry.ts 提供
  ├─ Zod 校验 payload
  ├─ Turnstile server-side siteverify(必须)
  ├─ Resend 串行发邮件:
  │    1) 公司 Gmail(失败 = 整体失败 502)
  │    2) 客户确认邮件(失败仅 console.error,走 context.waitUntil)
  └─ 返回 { ok: true } / 错误码
  │
  ▼
[前端 island] 显示中日双语感谢卡片
```

### 3.2 仓库结构

```
servenSeatJP/
├── astro.config.mjs                 # i18n 配置,无 adapter
├── biome.json
├── package.json                     # bun
├── tsconfig.json
├── playwright.config.ts
├── public/
│   ├── favicon.svg
│   ├── og-image.png
│   ├── robots.txt
│   └── _headers                     # CF Pages 头部规则(CSP/cache)
├── functions/
│   └── api/
│       └── inquiry.ts               # CF Pages Function(独立,非 Astro 路由)
├── src/
│   ├── content.config.ts            # Collections schema
│   ├── content/
│   │   ├── routes/*.yaml            # 机场/白马 点到点
│   │   ├── packages/*.yaml          # 包车/租车 套餐
│   │   ├── vehicles/*.yaml          # Alphard / Vellfire / Hiace
│   │   ├── faq/*.yaml
│   │   └── testimonials/*.yaml
│   ├── i18n/
│   │   ├── ja.json                  # UI 字符串
│   │   ├── zh.json
│   │   └── t.ts                     # 类型安全 helper
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── PageLayout.astro
│   ├── components/
│   │   ├── ui/                      # Button / Card / Section / LangSwitch
│   │   ├── home/                    # Hero / ServiceGrid / Testimonials
│   │   ├── inquiry/
│   │   │   ├── InquiryForm.astro
│   │   │   └── inquiry-form.client.ts   # JS island(submit + Turnstile)
│   │   ├── route/PriceTable.astro
│   │   └── pages/                   # 各页面真正内容,locale 由父页传入
│   │       ├── HomePage.astro
│   │       ├── AboutPage.astro
│   │       ├── AirportTransferPage.astro
│   │       ├── CharterPage.astro
│   │       ├── SkiHakubaPage.astro
│   │       ├── RentalPage.astro
│   │       ├── VehiclesPage.astro
│   │       ├── PricingPage.astro
│   │       ├── FaqPage.astro
│   │       └── InquiryPage.astro
│   ├── pages/
│   │   ├── index.astro              # ja  → <HomePage locale="ja" />
│   │   ├── about.astro
│   │   ├── airport-transfer.astro
│   │   ├── charter.astro
│   │   ├── ski-hakuba.astro
│   │   ├── rental.astro
│   │   ├── vehicles.astro
│   │   ├── pricing.astro
│   │   ├── faq.astro
│   │   ├── inquiry.astro
│   │   ├── legal/
│   │   │   ├── tokushoho.astro
│   │   │   ├── privacy.astro
│   │   │   └── cancel-policy.astro
│   │   └── zh/                      # zh 镜像,每页仅 2 行引用对应 Page 组件
│   │       ├── index.astro
│   │       ├── about.astro
│   │       └── ...(其余全部对应)
│   ├── lib/
│   │   ├── attribution.client.ts    # UTM 持久化 island
│   │   ├── alternate.ts             # SEO/UI 链接 helper
│   │   └── schemas/
│   │       └── inquiry.ts           # Astro 与 Function 共享的 Zod schema
│   ├── emails/
│   │   ├── InquiryInternal.tsx      # React Email
│   │   └── InquiryCustomer.tsx
│   └── styles/
│       └── globals.css              # Tailwind v4 + @theme tokens
├── tests/
│   └── e2e/
│       ├── pages.spec.ts            # 各页面 200 + 关键文案
│       ├── i18n.spec.ts             # 语言切换 + hreflang
│       └── inquiry.spec.ts          # 表单完整链路
├── docs/
│   └── superpowers/specs/2026-05-25-sevenseatjp-design.md
└── .github/
    └── workflows/ci.yml
```

## 4. 内容模型

### 4.1 Schema 定义(`src/content.config.ts`)

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

// 4.1.1 路线(机场接送、白马接送等 A→B 点到点)
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

// 4.1.2 套餐(包车、租车)
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

// 4.1.3 车辆
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

// 4.1.4 FAQ
const faq = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/faq' }),
  schema: z.object({
    category: z.enum(['booking', 'payment', 'cancel', 'service', 'vehicle']),
    question: i18nString,
    answer: i18nString,
    order: z.number().default(999),
  }),
});

// 4.1.5 客户评价
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

### 4.2 约定

- 文件名即 `entry.id`,YAML 内**不写** `id` 字段
- 内容字段(`from/to/title/...`)**inline 中日双语**;UI 字符串(按钮/错误)走 `src/i18n/*.json`
- `vehicles` 引用统一通过 `reference('vehicles')`,车型 ID 拼错 build 时报错
- 长文法务页(特商法表記/隐私政策/取消政策)走 `.astro` 页面,**不进** collection,因为没有结构化字段、修改频率低、要保留排版自由度

### 4.3 内容文件样例

`src/content/routes/narita-tokyo.yaml`:

```yaml
category: airport
from:
  ja: 成田国際空港
  zh: 成田国际机场
to:
  ja: 東京都内
  zh: 东京都内
durationMin: 75
distanceKm: 70
fares:
  - vehicle: alphard
    jpy: 28000
    includes:
      ja: 高速代・駐車場代・運転手チップ込み
      zh: 含高速费、停车费、司机服务费
    notes:
      ja: 22:00〜翌5:00は深夜料金 +20%
      zh: 22:00 至次日 5:00 加收 20% 夜间费
  - vehicle: hiace
    jpy: 32000
    includes:
      ja: 同上
      zh: 同上
order: 1
```

`src/content/vehicles/alphard.yaml`:

```yaml
name:
  ja: トヨタ・アルファード
  zh: 丰田 Alphard
seatCount: 6
luggageCount: 6
features:
  - ja: 全車Wi-Fi完備
    zh: 全车 Wi-Fi 覆盖
  - ja: 革張りキャプテンシート
    zh: 真皮独立座椅
photos:
  - ../../assets/vehicles/alphard-1.jpg
order: 1
```

## 5. i18n 路由

### 5.1 Astro 配置

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  site: 'https://sevenseatjp.com',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'zh'],
    routing: {
      prefixDefaultLocale: false,    // ja 用根路径,zh 用 /zh/
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### 5.2 URL 形态

| 路径 | 语言 |
|---|---|
| `/`、`/about`、`/airport-transfer` 等 | ja |
| `/zh/`、`/zh/about`、`/zh/airport-transfer` 等 | zh |
| `/api/inquiry` | 数据 endpoint,无语言前缀 |

### 5.3 实现:内容只一份,镜像页只做 locale 选择

每个营销页的**真正内容**只在 `src/components/pages/*.astro` 写一份,镜像文件仅 2 行:

```astro
---
// src/pages/airport-transfer.astro
import Page from '@/components/pages/AirportTransferPage.astro';
---
<Page locale="ja" />
```

```astro
---
// src/pages/zh/airport-transfer.astro
import Page from '@/components/pages/AirportTransferPage.astro';
---
<Page locale="zh" />
```

修改内容时不会两边漂移。

### 5.4 UI 字符串与 helper

```ts
// src/i18n/ja.json
{ "form.submit": "問合せを送信", "form.error.email": "メールアドレスをご確認ください", ... }

// src/i18n/zh.json
{ "form.submit": "提交询价", "form.error.email": "请检查邮箱格式", ... }

// src/i18n/t.ts
import ja from './ja.json';
import zh from './zh.json';

// 编译期保证 zh 不漏 key
const _zhComplete = zh satisfies Record<keyof typeof ja, string>;

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

### 5.5 链接 helper(`src/lib/alternate.ts`)

```ts
import type { Locale } from '@/i18n/t';

// 5.5.1 SEO 用:不带 query/hash,稳定 canonical
export function getCanonicalUrl(currentUrl: URL, targetLocale: Locale): string {
  const path = currentUrl.pathname.replace(/^\/zh(\/|$)/, '/');
  if (targetLocale === 'zh') return path === '/' ? '/zh/' : `/zh${path}`;
  return path;
}

// 5.5.2 UI 切换器用:保留 query。
// hash 在服务端拿不到(URL fragment 不发到服务器,Astro.url.hash 为空字符串),
// 需由客户端 click handler 在跳转前补上 location.hash。
export function getLanguageSwitchUrl(currentUrl: URL, targetLocale: Locale): string {
  const canon = getCanonicalUrl(currentUrl, targetLocale);
  return canon + currentUrl.search;
}
```

**语言切换器(`src/components/ui/LangSwitch.astro`)** 客户端 handler:

```astro
<a data-lang-switch href={getLanguageSwitchUrl(Astro.url, 'zh')}>中文</a>
<a data-lang-switch href={getLanguageSwitchUrl(Astro.url, 'ja')}>日本語</a>

<script>
  // 点击瞬间把当前 hash 追加到目标 href,失败也不阻断跳转
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

### 5.6 SEO `<head>`

```astro
<html lang={locale === 'ja' ? 'ja' : 'zh-CN'}>
<head>
  <link rel="canonical" href={new URL(getCanonicalUrl(Astro.url, locale), Astro.site)} />
  <link rel="alternate" hreflang="ja" href={new URL(getCanonicalUrl(Astro.url, 'ja'), Astro.site)} />
  <link rel="alternate" hreflang="zh" href={new URL(getCanonicalUrl(Astro.url, 'zh'), Astro.site)} />
  <link rel="alternate" hreflang="x-default" href={new URL(getCanonicalUrl(Astro.url, 'ja'), Astro.site)} />
</head>
```

## 6. 渠道归因(UTM 持久化)

### 6.1 设计要点

- **first-touch**:`sessionStorage`,每个浏览器 tab 各自一份,**任意首次访问都记录**(即使无 UTM,记录 `direct/referral`)
- **last-touch**:`localStorage`,带 UTM 才覆盖,30 天过期
- **current**:表单提交时从 `location.search` 实时读
- 所有 storage 访问 try/catch,Safari 隐私模式不破表单
- CTA 不再手工携带 UTM;站外分享链接(微信/小红书)由 helper 在生成时拼

### 6.2 实现(`src/lib/attribution.client.ts`)

```ts
const KEY_FIRST = 'sevenseat_attr_first';
const KEY_LAST  = 'sevenseat_attr_last';
const MAX_AGE_DAYS = 30;

type Attr = {
  source: string;  medium: string;  campaign: string;
  content: string; term: string;
  referrer: string;  landing: string;  ts: number;
};

function safeGet(storage: Storage, key: string): string | null {
  try { return storage.getItem(key); } catch { return null; }
}
function safeSet(storage: Storage, key: string, value: string): void {
  try { storage.setItem(key, value); } catch { /* swallow */ }
}
function safeRemove(storage: Storage, key: string): void {
  try { storage.removeItem(key); } catch { /* swallow */ }
}

function readCurrent(): { attr: Attr; hasUtm: boolean } {
  const sp = new URLSearchParams(location.search);
  const utmKeys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'] as const;
  const hasUtm = utmKeys.some(k => sp.has(k));
  return {
    hasUtm,
    attr: {
      source:   sp.get('utm_source')   ?? (hasUtm ? '' : (document.referrer ? 'referral' : 'direct')),
      medium:   sp.get('utm_medium')   ?? '',
      campaign: sp.get('utm_campaign') ?? '',
      content:  sp.get('utm_content')  ?? '',
      term:     sp.get('utm_term')     ?? '',
      referrer: document.referrer,
      landing:  location.pathname + location.search,
      ts: Date.now(),
    },
  };
}

(function init() {
  const { attr, hasUtm } = readCurrent();
  // first-touch: 任意首次访问都记录
  if (!safeGet(sessionStorage, KEY_FIRST)) {
    safeSet(sessionStorage, KEY_FIRST, JSON.stringify(attr));
  }
  // last-touch: 仅 UTM 访问覆盖;过期清除
  if (hasUtm) {
    safeSet(localStorage, KEY_LAST, JSON.stringify(attr));
  } else {
    const raw = safeGet(localStorage, KEY_LAST);
    if (raw) {
      try {
        const last = JSON.parse(raw) as Attr;
        if (Date.now() - last.ts > MAX_AGE_DAYS * 86400_000) {
          safeRemove(localStorage, KEY_LAST);
        }
      } catch { safeRemove(localStorage, KEY_LAST); }
    }
  }
})();

export function readAttribution(): {
  firstTouch: Attr | null;
  lastTouch: Attr | null;
  current: Attr;
} {
  const first = safeGet(sessionStorage, KEY_FIRST);
  const last  = safeGet(localStorage,  KEY_LAST);
  return {
    firstTouch: first ? safeParse(first) : null,
    lastTouch:  last  ? safeParse(last)  : null,
    current: readCurrent().attr,
  };
}
function safeParse(s: string): Attr | null { try { return JSON.parse(s); } catch { return null; } }
```

在 `BaseLayout.astro` 的 `<head>` 顶部用 Astro 标准 `<script>` 标签引入(Astro 会自动打包并去重):

```astro
<script>
  import '@/lib/attribution.client';
</script>
```

模块顶层的 `init` IIFE 在每个页面加载时立即执行;`readAttribution` 由询价页的客户端 island 按需调用。

### 6.3 询价表单内提交

```ts
import { readAttribution } from '@/lib/attribution.client';
const { firstTouch, lastTouch, current } = readAttribution();
payload.utm = { firstTouch, lastTouch, current };
```

### 6.4 内部邮件中的归因块

```
═══════════════════════════════════════════
渠道归因(请勿删,用于判断投放效果)
─────────────────────────────────────────
首触 source/medium/campaign : xiaohongshu / cps / spring-2026
首触 referrer / landing     : https://www.xiaohongshu.com/... / /zh/
末触 source/medium/campaign : google / cpc / brand
末触 referrer / landing     : https://www.google.co.jp/... / /zh/airport-transfer
本次 source/medium/campaign : (空) / (空) / (空)
═══════════════════════════════════════════
```

邮件 subject 前缀用 **last-touch source**(成交触点),示例:`[google] 新询价 成田→東京 2026-06-15`。

## 7. 询价表单链路

### 7.1 前端(`src/components/inquiry/InquiryForm.astro`)

字段:

| 字段 | 类型 | 必填 |
|---|---|---|
| serviceType | select: airport/charter/ski/rental | ✓ |
| from | text + datalist(常用机场/景点) | ✓ |
| to | text + datalist | ✓ |
| date | date | ✓ |
| time | time | ✓ |
| passengers | number 1-10 | ✓ |
| luggage | number 0-15 | ✓ |
| notes | textarea max 2000 | — |
| name | text max 100 | ✓ |
| email | email | ✓ |
| lineId | text | — |
| wechat | text | — |
| phoneCountryCode | select (+86/+81/+886/...) | ✓ |
| phone | tel | ✓ |
| (Turnstile widget) | — | ✓ |

`<noscript>` 区域显示 LINE / 微信 / 邮箱兜底联系方式(不做 no-JS 降级 POST)。

### 7.2 客户端 island(`inquiry-form.client.ts`)

```ts
import { readAttribution } from '@/lib/attribution.client';

const form = document.getElementById('inquiry-form') as HTMLFormElement;
const status = document.getElementById('inquiry-status') as HTMLElement;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const turnstileToken = (form.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement)?.value;
  if (!turnstileToken) { /* show t('form.error.turnstile') */ return; }

  const payload = {
    serviceType: fd.get('serviceType'),
    from: fd.get('from'), to: fd.get('to'),
    date: fd.get('date'), time: fd.get('time'),
    passengers: Number(fd.get('passengers')),
    luggage:    Number(fd.get('luggage')),
    notes: fd.get('notes') || undefined,
    name: fd.get('name'), email: fd.get('email'),
    lineId: fd.get('lineId') || undefined,
    wechat: fd.get('wechat') || undefined,
    phoneCountryCode: fd.get('phoneCountryCode'),
    phone: fd.get('phone'),
    locale: document.documentElement.lang.startsWith('zh') ? 'zh' : 'ja',
    utm: readAttribution(),
    turnstileToken,
  };

  status.textContent = '...';
  const res = await fetch('/api/inquiry', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (json.ok) {
    form.replaceWith(/* 感谢卡片 */);
  } else {
    // 按 json.code 显示本地化错误,reset Turnstile
    (window as any).turnstile?.reset();
  }
});
```

### 7.3 Cloudflare Pages Function(`functions/api/inquiry.ts`)

**Schema 共享**:Inquiry payload schema 抽到 `src/lib/schemas/inquiry.ts`,由 Astro 端(客户端类型推导)与 Function(运行时校验)共同 import,避免漂移。Pages Function 通过相对路径引用即可——Pages 构建会把依赖打包进 Function bundle。

```ts
// src/lib/schemas/inquiry.ts
import { z } from 'zod';

const Attr = z.object({
  source:   z.string().max(200),
  medium:   z.string().max(200),
  campaign: z.string().max(200),
  content:  z.string().max(200),
  term:     z.string().max(200),
  referrer: z.string().max(2000),
  landing:  z.string().max(500),
  ts: z.number().int().nonnegative(),
}).nullable();

export const InquirySchema = z.object({
  serviceType: z.enum(['airport', 'charter', 'ski', 'rental']),
  from: z.string().min(1).max(200),
  to: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  passengers: z.number().int().min(1).max(10),
  luggage: z.number().int().min(0).max(15),
  notes: z.string().max(2000).optional(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  lineId: z.string().max(100).optional(),
  wechat: z.string().max(100).optional(),
  phoneCountryCode: z.string().regex(/^\+\d{1,4}$/),
  phone: z.string().min(4).max(20),
  locale: z.enum(['ja', 'zh']),
  utm: z.object({
    firstTouch: Attr,
    lastTouch:  Attr,
    current:    Attr.unwrap(),
  }),
  turnstileToken: z.string().min(1),
});

export type InquiryPayload = z.infer<typeof InquirySchema>;
```

```ts
// functions/api/inquiry.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { InquirySchema, type InquiryPayload } from '../../src/lib/schemas/inquiry';
import { InquiryInternalEmail } from '../../src/emails/InquiryInternal';
import { InquiryCustomerEmail } from '../../src/emails/InquiryCustomer';

interface Env {
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  COMPANY_INBOX: string;
  INQUIRY_FROM_EMAIL: string;
}

const MAX_BODY_BYTES = 100_000;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, waitUntil } = context;

  // 0. 入口 guard:content-type 必须 JSON
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    return jsonErr('invalid_payload', 415);
  }

  // 1. content-length 早拒(若 client 诚实声明) + 实际字节数兜底(若 header 缺失/撒谎)
  const declaredLength = Number(request.headers.get('content-length') ?? '');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonErr('payload_too_large', 413);
  }
  let text: string;
  try { text = await request.text(); }
  catch { return jsonErr('invalid_payload', 400); }
  // text.length 是 UTF-16 code unit 数量,不是字节数;中文 1 字符 ≈ UTF-8 3 字节
  // 必须按真实字节数判定,与 MAX_BODY_BYTES 语义一致
  const actualBytes = new TextEncoder().encode(text).byteLength;
  if (actualBytes > MAX_BODY_BYTES) {
    return jsonErr('payload_too_large', 413);
  }

  // 2. JSON 解析 + Zod 校验
  let payload: unknown;
  try { payload = JSON.parse(text); }
  catch { return jsonErr('invalid_payload', 400); }
  const parsed = InquirySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonErr('invalid_payload', 400, parsed.error.flatten());
  }
  const data = parsed.data;

  // 3. Turnstile server-side siteverify(必须)
  // 网络异常 / 非 JSON 响应单独走 turnstile_unavailable(503),与 token 不通过(403)区分
  let verify: { success: boolean; 'error-codes'?: string[] };
  try {
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret:   env.TURNSTILE_SECRET_KEY,
        response: data.turnstileToken,
        remoteip: request.headers.get('CF-Connecting-IP') ?? '',
      }),
    });
    verify = await verifyRes.json() as { success: boolean; 'error-codes'?: string[] };
  } catch (e) {
    console.error('turnstile_verify_unreachable', e);
    return jsonErr('turnstile_unavailable', 503);
  }
  if (!verify.success) return jsonErr('turnstile_failed', 403);

  // 4. 串行发邮件:内部 → 客户
  const resend = new Resend(env.RESEND_API_KEY);
  const lastSrc = sanitizeHeader(data.utm.lastTouch?.source || 'direct');
  const subjectPrefix = `[${lastSrc}] `;
  const safeFrom = sanitizeHeader(data.from);
  const safeTo   = sanitizeHeader(data.to);

  // 4a. 内部邮件(必须成功)
  // 注意 1:`await render(...)` 可能抛(模板异常),所以 render + send 必须包在同一个 try
  // 注意 2:Resend SDK 在 API 错误时返回 { data, error } 而不 throw,必须再显式检查 error 字段
  const internal = await sendInternalEmail(resend, env, data, safeFrom, safeTo, subjectPrefix);
  if (internal.error) {
    console.error('inquiry_internal_send_failed', internal.error);
    return jsonErr('email_send_failed', 502);
  }

  // 4b. 客户确认邮件(失败仅记日志,不阻断响应;走 waitUntil 后台跑)
  waitUntil((async () => {
    const customer = await sendCustomerEmail(resend, env, data);
    if (customer.error) {
      console.error('inquiry_customer_send_failed', customer.error, {
        internalEmailId: internal.data?.id,
      });
    }
  })());

  return Response.json({ ok: true });
};

type SendResult = { data: { id: string } | null; error: unknown };

async function sendInternalEmail(
  resend: Resend, env: Env, data: InquiryPayload,
  safeFrom: string, safeTo: string, subjectPrefix: string,
): Promise<SendResult> {
  try {
    const html = await render(InquiryInternalEmail({ ...data }));
    return await resend.emails.send({
      from: `SevenSeatJP <${env.INQUIRY_FROM_EMAIL}>`,
      to:   env.COMPANY_INBOX,
      replyTo: data.email,
      subject: `${subjectPrefix}新询价 ${safeFrom}→${safeTo} ${data.date}`,
      html,
    });
  } catch (e) {
    return { data: null, error: e };
  }
}

async function sendCustomerEmail(
  resend: Resend, env: Env, data: InquiryPayload,
): Promise<SendResult> {
  try {
    const html = await render(InquiryCustomerEmail({ ...data }));
    return await resend.emails.send({
      from: `SevenSeatJP <${env.INQUIRY_FROM_EMAIL}>`,
      to:   data.email,
      subject: data.locale === 'zh'
        ? '【SevenSeatJP】您的询价已收到'
        : '【SevenSeatJP】お問合せを受け付けました',
      html,
    });
  } catch (e) {
    return { data: null, error: e };
  }
}

function jsonErr(code: string, status: number, errors?: unknown) {
  return Response.json({ ok: false, code, ...(errors ? { errors } : {}) }, { status });
}

// 邮件 subject 防 CRLF / header 注入:换行折叠为空格,首尾去空白,长度兜底
function sanitizeHeader(s: string): string {
  return s.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 200);
}
```

### 7.4 错误码与本地化

| code | HTTP | zh | ja |
|---|---|---|---|
| `invalid_payload` | 400 / 415 | 请检查表单字段 | 入力内容をご確認ください |
| `payload_too_large` | 413 | 请求过大,请精简备注后重试 | リクエストサイズが大きすぎます |
| `turnstile_failed` | 403 | 人机验证失败,请刷新重试 | 認証に失敗しました。再度お試しください |
| `turnstile_unavailable` | 503 | 验证服务暂时不可用,请稍后重试或通过 LINE 联系 | 認証サービスに一時的に接続できません。LINE からご連絡ください |
| `email_send_failed` | 502 | 提交失败,请通过 LINE 或微信联系 | 送信に失敗しました。LINE からご連絡ください |

### 7.5 邮件模板(`src/emails/InquiryInternal.tsx`、`InquiryCustomer.tsx`)

- 用 `@react-email/components`(`Html` / `Head` / `Body` / `Container` / `Section` / `Heading` / `Text` / `Hr`)
- 内部模板:摘要表 + 完整字段 + 归因块(见 §6.4 示意)
- 客户模板:**单语**,匹配 `data.locale`;含询价摘要 + 24h 回复承诺 + 客服 LINE/WeChat 二维码图(走 Resend 内嵌图片)

### 7.6 Turnstile 加载策略

- **仅在 `/inquiry`、`/zh/inquiry` 注入**:
  ```html
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  ```
- 营销页**不背** Turnstile 脚本成本
- **不开 pre-clearance**(避免 `cf_clearance` cookie)

## 8. 部署 / CI / 环境

### 8.1 Cloudflare Pages 配置

| 项 | 值 |
|---|---|
| Build command | `bun run build` |
| Build output | `dist/` |
| Production branch | `main` |
| Functions dir | `functions/`(自动识别) |
| 兼容性 flags | `nodejs_compat`(Resend / `@react-email/render` 需要) |
| 自定义域 | `sevenseatjp.com`(待最终确认) |

**依赖**:
- `devDependency`:`@cloudflare/workers-types`(提供 `PagesFunction<Env>` 类型)、`wrangler`(本地与 E2E 用 `wrangler pages dev dist` 启动包含 Functions 的完整运行环境;`astro dev` 不服务 `functions/`)
- `dependency`:`zod`、`resend`、`@react-email/components`、`@react-email/render`(Function bundle 打包)

### 8.2 环境变量

**单一 binding 名,在 CF Pages Dashboard 按 Production / Preview scope 分别填值**——Function 代码无需感知环境,代码里只读固定名称。

| Key | 用途 | 类型 |
|---|---|---|
| `RESEND_API_KEY` | Resend API key | secret |
| `COMPANY_INBOX` | 公司 Gmail / 收件邮箱 | env |
| `TURNSTILE_SECRET_KEY` | Turnstile server siteverify | secret |
| `PUBLIC_TURNSTILE_SITE_KEY` | Turnstile widget(build 时注入) | env(public) |
| `INQUIRY_FROM_EMAIL` | Resend 验证域内的发件地址 | env |

各 scope 填值约定:

| Scope | RESEND_API_KEY | COMPANY_INBOX | TURNSTILE_SECRET_KEY | PUBLIC_TURNSTILE_SITE_KEY | INQUIRY_FROM_EMAIL |
|---|---|---|---|---|---|
| **Production** | 真实 key | 客户 Gmail | 真实 secret | 真实 site key | `inquiry@sevenseatjp.com` |
| **Preview** | Resend test key 或同 prod | `delivered@resend.dev` | `1x0000000000000000000000000000000AA` | `1x00000000000000000000AA` | `onboarding@resend.dev` |

### 8.3 Resend 配置

- 发送域 `sevenseatjp.com` 在 Resend 添加并验证 DNS:
  - SPF: `v=spf1 include:_spf.resend.com -all`
  - DKIM: Resend 提供 CNAME 或 TXT(按 dashboard 提示)
  - DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@sevenseatjp.com`(初期 `p=none` 观察)
- Reply-To 永远是客户邮箱,公司 Gmail 直接 reply 即可联系客户

### 8.4 GitHub Actions(`.github/workflows/ci.yml`)

**关键:`PUBLIC_TURNSTILE_SITE_KEY` 是 build-time 注入**(Astro `import.meta.env`),build 步骤就必须有值——否则 `dist/` 里的 widget data-sitekey 是空字符串。CI build job 也用 Turnstile dummy site key,保证 CI build 与 E2E build 行为一致。

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    # 必须明确 types 含 `labeled`,否则给 PR 加 run-e2e 标签时 workflow 不会重新触发
    # (默认 types = [opened, synchronize, reopened],不含 labeled)
    types: [opened, synchronize, reopened, labeled]

env:
  PUBLIC_TURNSTILE_SITE_KEY: 1x00000000000000000000AA   # dummy,build 时注入到 dist/

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint                       # Biome
      - run: bun run typecheck                  # astro check
      - run: bun run build                      # 校验 collections schema + 构建(含 PUBLIC_TURNSTILE_SITE_KEY)

  e2e:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'run-e2e')
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build                      # 同样的 dummy site key 注入 dist/
      - run: bunx playwright install --with-deps chromium
      - run: bun run test:e2e                   # webServer 通过 --binding 把 secrets 注入 Function context.env
        env:
          TURNSTILE_SECRET_KEY: 1x0000000000000000000000000000000AA
          RESEND_API_KEY:       ${{ secrets.RESEND_API_KEY_PREVIEW }}
          COMPANY_INBOX:        delivered@resend.dev
          INQUIRY_FROM_EMAIL:   onboarding@resend.dev
```

E2E 仅在 PR 上加 `run-e2e` 标签触发,日常 PR 不阻塞。

### 8.5 本地与 E2E 运行方式

`astro dev` 不服务 `functions/`,所以**任何涉及 `/api/inquiry` 的开发或测试都必须经 wrangler**。

env 注入分**两层**,职责不同,文件也不同:

| 层 | 谁读 | 文件 | 暴露给 |
|---|---|---|---|
| **Astro build-time** | `bun run build` → `import.meta.env.PUBLIC_*` | `.env.local`(本地)/ CI workflow env | `dist/` 里的 widget data-sitekey 等 public 值 |
| **Pages Function runtime** | `wrangler pages dev` → `context.env.*` | `.dev.vars`(本地)/ `--binding=` (CI) | Function 里读到的 `env.RESEND_API_KEY` 等 secret |

**两个文件互不替代**:`.dev.vars` 在 Astro build 时根本不会被读;`.env.local` 在 wrangler runtime 也不会暴露到 `context.env`。**本地开发要同时配两份**(同样的值复制两次,接受这点冗余)。

```
# .env.local (本地,被 .gitignore 排除;Astro build 时读)
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

```
# .dev.vars (本地,被 .gitignore 排除;wrangler pages dev 时读)
RESEND_API_KEY=re_dev_...
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
COMPANY_INBOX=your-dev-email@example.com
INQUIRY_FROM_EMAIL=onboarding@resend.dev
```

`.gitignore` 必须包含:`.env.local`、`.env.*.local`、`.dev.vars`、`.dev.vars.*`、`dist/`、`.wrangler/`、`node_modules/`。

CI 不用文件,直接 `process.env`(`PUBLIC_TURNSTILE_SITE_KEY` 在 workflow 顶层 env,build 时可见;runtime secrets 通过 `--binding` 注入 wrangler)。

```jsonc
// package.json scripts
// 所有走 wrangler 的命令必须带 --compatibility-flag=nodejs_compat,
// 否则 Resend / @react-email/render 在本地 Function runtime 中报错(与 §8.1 生产配置保持一致)
{
  "dev:web":   "astro dev",                                                                                // 只调营销页;/api/inquiry 不可用
  "dev":       "bun run build && wrangler pages dev dist --port 4321 --compatibility-flag=nodejs_compat", // 调表单完整链路;走 .dev.vars
  "build":     "astro check && astro build",
  "preview":   "wrangler pages dev dist --port 4321 --compatibility-flag=nodejs_compat",
  "test:e2e":  "playwright test"
}
```

```ts
// playwright.config.ts(关键片段)
// 仅把"在 process.env 中真正存在的" secret 拼成 --binding;若都不存在(本地 bun run test:e2e),
// 不传任何 --binding,wrangler 仍会自动加载 .dev.vars。这样不会用空字符串覆盖本地配置。
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
});
```

**本地跑 E2E 的两种方式**:

- 用 `.dev.vars`:直接 `bun run test:e2e`(`bindings` 为空,wrangler 自动加载 `.dev.vars`)
- 用 env exports:`RESEND_API_KEY=... bun run test:e2e`(`--binding` 注入,跳过 `.dev.vars`)

### 8.6 `public/_headers`

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com;
```

(询价页加 `https://challenges.cloudflare.com`,营销页可以更严格——若有时间分页加;否则统一)

## 9. 视觉与设计系统

### 9.1 调性

黑金商务高端。基调:深黑底 + 暖金强调色 + 暖灰文本 + 大留白 + 衬线/无衬线对比。

### 9.2 Tailwind v4 token(`src/styles/globals.css`)

```css
@import "tailwindcss";

@theme {
  --color-bg:           #0a0a0b;        /* 主背景:近黑 */
  --color-surface:      #14141a;        /* 卡片表面 */
  --color-border:       #2a2a32;
  --color-text:         #ede9d8;        /* 主文本:暖白 */
  --color-text-muted:   #9a9486;
  --color-gold:         #c9a96e;        /* 强调金 */
  --color-gold-dark:    #9c7f4f;
  --color-accent:       #e8d9a0;        /* 高光 */

  --font-display:       "Noto Serif JP", "Source Han Serif SC", serif;
  --font-body:          "Noto Sans JP", "Source Han Sans SC", system-ui, sans-serif;
  --font-mono:          ui-monospace, monospace;

  --radius-card:        12px;
  --shadow-card:        0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.4);
}

/* CSS-first,无 tailwind.config.ts */
```

### 9.3 CSS 布局约束(继承用户全局 zero-margin 规范)

- 禁 `m-*`/`mx-*`/`my-*`、`mx-auto`、`space-*`、负 margin
- 间距用 `gap`(flex/grid)+ `padding`(容器内)
- 物理方向类禁用,只用 `ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`/`text-end`/`rounded-s-*`/`rounded-e-*`

## 10. SEO

- `sitemap.xml` 用 `@astrojs/sitemap` 自动生成(包含 `/zh/` 镜像)
- `robots.txt`:`Allow: /`,`Sitemap: https://sevenseatjp.com/sitemap-index.xml`
- 每页 `<head>` 必备:
  - `<title>`(中日双语,语言匹配)
  - `<meta name="description">`(中日双语)
  - OG: `og:title` / `og:description` / `og:image` / `og:locale`(`ja_JP` / `zh_CN`)
  - Twitter: `twitter:card=summary_large_image`
  - 5.6 节的 `<link rel="alternate" hreflang>` 三联
- JSON-LD: 首页注入 `LocalBusiness` schema(地址、电话、营业时间、`sameAs`)

## 11. 测试

### 11.1 Playwright 关键场景

- `pages.spec.ts`:所有 9 + 1 + 3 个页面 ja/zh 两遍,200 + h1 文案命中
- `i18n.spec.ts`:
  - `/about` 点语言切换 → `/zh/about`,反向同理
  - `<html lang>`、`<link rel="alternate" hreflang>` 三联存在
  - 切换后 URL **保留 query**(`?utm_source=test` 跟到目标语言)
  - 带 hash 时,LangSwitch 客户端 handler 在跳转前把 `location.hash` 拼到 href(无 handler 时 fragment 会丢)
- `inquiry.spec.ts`:
  - 成功路径:填表 → 提交 → 感谢卡片显示(用 Turnstile dummy + `delivered@resend.dev`)
  - 客户端校验:邮箱格式错 → 不发请求
  - 服务端 400:故意构造非法 payload,UI 显示 `form.error.payload`
  - 归因:带 `?utm_source=test` 访问首页 → 走 5 步到 `/inquiry` 提交 → 检查请求 body `utm.firstTouch.source === 'test'`

### 11.2 手测(上线前 checklist 见 §13)

- Lighthouse(mobile + desktop)
- `mail-tester.com` Resend 发送评分
- 跨设备/浏览器矩阵

## 12. 安全与隐私

- 静态站攻击面:CDN 边缘缓存,无 SSR 数据库
- 动态入口仅 `/api/inquiry`,所有写操作都过 Turnstile + Zod
- 隐私政策(`/legal/privacy`)声明:
  - 询价数据存储位置:Resend 邮件日志(默认保留 30 天) + 公司 Gmail
  - 不接 GA / Pixel / 任何第三方追踪;`utm_*` 仅记录在 sessionStorage/localStorage,提交时随邮件发送
  - Turnstile 不使用 cookie
- 取消政策(`/legal/cancel-policy`)与特商法表記(`/legal/tokushoho`)文案由客户提供

## 13. 上线验收

- [ ] Lighthouse mobile / desktop **性能 ≥ 95、可访问性 ≥ 95、SEO = 100**
- [ ] `sitemap.xml`、`robots.txt` 包含 `/zh/` 镜像
- [ ] 询价表单 5 个真实邮箱测试(Gmail / Outlook / QQ / 163 / iCloud),公司收信 + 客户确认信均到达
- [ ] Resend 发送域 SPF/DKIM/DMARC 通过 `mail-tester.com` ≥ 9/10
- [ ] 移动端(iPhone Safari / Android Chrome)+ 桌面(Chrome / Safari / Edge / Firefox)全过
- [ ] 中日双语切换无残留:任一页任一语言,UI 字符串 + 内容字段无 fallback
- [ ] 9 个核心营销页 + 询价页 + 3 个法务辅助页全部可访问
- [ ] CTA 流向匹配当前语言:**ja 页 → `/inquiry`,zh 页 → `/zh/inquiry`**(不跨语言跳转)
- [ ] Turnstile 在询价页 widget 显示且 server-side siteverify 通过
- [ ] 内部邮件含完整渠道归因块、subject 含 last-touch source
- [ ] `_headers` CSP 在询价页和营销页都未阻断关键资源

## 14. 工期(对应报价单 30/30/30/10 付款节点)

| 周次 | 范围 | 付款节点 |
|---|---|---|
| 启动 | 合同签订 | 签约启动 30% |
| **W1** | Astro init + Tailwind v4 + i18n 骨架 + CF Pages 部署; collection schema + 5 条示例数据; 首页 + 询价表单(无样式版本) | 设计稿确认 30% |
| **W2** | 9 个营销页中日双语 + 视觉调性; 询价表单完整链路(Turnstile + Resend 双邮件 + 归因 + 客户邮件 waitUntil); 3 个法务页 | 开发完成 30% |
| **W3** | Playwright E2E 全覆盖; SEO 三联 / sitemap / JSON-LD / OG; 性能调优(Lighthouse ≥ 95); 客户内容录入回合 + 正式上线 | 正式上线 10% |

含 2 个月免费 Bug 维保期(仅 bug,不含新增功能)。

## 15. 不在本期范围

- 在线支付 / 在线预约确认
- 独立后台 / CMS
- 数据库(D1 / KV)与历史询价 admin 页(预留为 v2)
- 英文 / 韩文 / 其他语言
- Google Analytics / Pixel / 任何第三方追踪
- 多车队 / 多公司多租户
- SEO 落地页扩展(东京/大阪/白马等子城市页),按需另行报价

## 16. 客户素材清单(W1 内提供)

- Logo SVG + 品牌色 hex(若无:`#0a0a0b` 主背景 + `#c9a96e` 金 兜底)
- 每款车 ≥ 3 张高清照片(横向 16:9 优先)
- 公司基本信息:登记许可番号、地址、电话、LINE ID、微信号
- 中日双语文案(或委托代笔,按字数另行报价)
- 法务页内容:特商法表記、隐私政策、取消政策(初稿)
- 公司邮箱(将收询价的 Gmail 地址)
- 域名(`.com` / `.jp`,或委托注册)

## 附录 A:技术参考链接

- Astro 静态输出 / on-demand:https://docs.astro.build/en/guides/on-demand-rendering/
- Astro Cloudflare 集成现状:https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- Astro `astro/zod` 模块:https://docs.astro.build/en/reference/modules/astro-zod/
- Tailwind v4 升级指南:https://tailwindcss.com/docs/upgrade-guide
- Cloudflare Pages Functions:https://developers.cloudflare.com/pages/functions/
- Cloudflare Pages Functions API:https://developers.cloudflare.com/pages/functions/api-reference/
- Cloudflare Turnstile:https://developers.cloudflare.com/cloudflare-challenges/challenge-types/turnstile/
- Turnstile 测试(dummy keys):https://developers.cloudflare.com/turnstile/troubleshooting/testing/
- Turnstile pre-clearance(本期不启用):https://developers.cloudflare.com/turnstile/get-started/pre-clearance/
- Resend 发送限额:https://resend.com/docs/knowledge-base/resend-sending-limits
- Zod 4 API:https://zod.dev/api
