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

### 2.0 架构定位:static-first / dynamic-ready

**不是纯静态站,而是**:Astro 6 server runtime + 营销页 page-level prerender(`export const prerender = true`)。营销页 build 时输出 HTML,与纯静态加载速度等价;询价 / 未来 admin / D1 / 鉴权等动态能力直接在同一个 Astro/Cloudflare runtime 长出来,v2 不需要重拆部署模型。

### 2.1 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Astro 6(TS) | 默认 SSG、零运行时 JS、岛屿水合按需 |
| 输出模式 | `output: 'server'` + 营销页显式 `prerender = true` | 静态优先、动态能力按需;为 v2(admin/D1/支付/鉴权)留路径 |
| Adapter | `@astrojs/cloudflare ^13.5.4` | Astro 6 官方;部署目标 = Cloudflare Workers + Static Assets |
| 表单后端 | **Astro Actions**(`src/actions/index.ts`) | 类型安全 RPC、自动校验同源、复用 `InquirySchema`、与前端 island 共用类型 |
| 样式 | Tailwind v4(CSS-first,Vite plugin) | token 写在 `globals.css` 的 `@theme {}` |
| 内容 | Astro Content Collections + Zod 4(`astro/zod`) | YAML 数据 + 编译期校验 |
| i18n | Astro 原生 i18n + 自写 `t()` helper | 默认 `ja` 用根路径,`zh` 用 `/zh/` 子路径 |
| 邮件 | Resend(免费 100/日、3000/月) | React Email v6 模板,中日双语 |
| 防滥用 | Cloudflare Turnstile(server-side siteverify 在 Action 内) | 免费、无 cookie、E2E 用 dummy keys |
| HTTP headers | `src/middleware.ts` 注入(CSP / X-Robots-Tag 等) | server 模式下 `public/_headers` 只对静态资源生效;middleware 才能覆盖动态响应 |
| 部署 | Cloudflare Workers,GitHub 直连 | 免费层、全球 edge、PR preview;`wrangler deploy`(不是 `pages deploy`) |
| 包管理 | Bun(与工作区一致) | — |
| 代码质量 | Biome v2(lint+format) + `astro check`(类型) | — |
| 测试 | Playwright(关键路径 E2E) | 工期紧,不写单测;`astro dev` 直接跑(adapter 接管 workerd) |

### 2.2 不引入的东西(v1)

- **不引 UI 组件库**——黑金商务调性靠手写 Tailwind
- **不引 i18n 第三方库**——Astro 原生 + 自写 helper 足够
- **不接 CMS**——公司无后台,内容直接写 YAML / MD
- **不接数据库**(D1 不接)——v1 询价仅靠邮件,Gmail 即 CRM(为 v2 预留 binding 位)
- **不上 admin / 鉴权 / 支付**——v2 范围,但**架构已不挡路**
- **不写单测/快照**——只跑 Playwright E2E

### 2.3 准确性约束

报价单营销话术里的"零攻击面 / 无 cookies"在 spec 层修订为:**静态优先 + 动态能力最小化开放**——营销页全部 prerender 输出 HTML(零运行时 JS),只有 `/_actions/inquiry` 一处动态入口,Turnstile 默认无 cookie 且未开 pre-clearance。Workers 免费层(100k req/day)对营销站流量绰绰有余。

## 3. 架构总览

### 3.1 顶层数据流

```
浏览者
  │
  │ ① 浏览(prerendered HTML,Workers Static Assets 边缘命中)
  ▼
[Astro 生成的 9+4 个 prerendered 页]    ← build 时从 YAML 渲染
  │
  │ ② 询价提交(JS island → import { actions } from 'astro:actions' → await actions.inquiry(input))
  ▼
[Astro Action: src/actions/index.ts → server.inquiry]   ← 走 Astro server runtime (Workers)
  ├─ Zod 校验 input(defineAction({ input: InquirySchema, handler }))
  ├─ Turnstile server-side siteverify(必须;失败 throw new ActionError({ code: 'FORBIDDEN' }))
  ├─ Resend 邮件:
  │    1) 公司邮件(失败 throw new ActionError({ code: 'INTERNAL_SERVER_ERROR' }))
  │    2) 客户确认邮件 via ctx.locals.cfContext.waitUntil(失败仅 console.error,不阻断)
  └─ return { ok: true }(自动 Devalue 序列化)
  │
  ▼
[前端 island] 拿到 { data, error } → 显示中日双语感谢卡片 / 本地化错误
```

**关键 API 选择**:
- 不用手写 endpoint(`src/pages/api/inquiry.ts`)+ `fetch`,改用 **Astro Actions**:类型从 schema 自动推导到客户端 island,无需 JSON serialize/deserialize 样板
- 不用 `Astro.locals.runtime.env`(Astro 6 移除),改用 `import { env } from 'cloudflare:workers'`(模块级)
- `waitUntil` 路径 `ctx.locals.cfContext.waitUntil(promise)`

### 3.2 仓库结构

```
servenSeatJP/
├── astro.config.mjs                 # output: 'server' + adapter: cloudflare()
├── wrangler.jsonc                   # Workers 配置(name / compat date / nodejs_compat / assets / vars)
├── biome.json
├── package.json                     # bun
├── tsconfig.json
├── playwright.config.ts
├── public/
│   ├── favicon.svg
│   ├── og-image.png
│   └── robots.txt
│   # 注:public/_headers 只对静态资源生效,不覆盖 Worker 动态响应;
│   #     CSP / X-Robots-Tag 等头改在 src/middleware.ts 注入
├── src/
│   ├── middleware.ts                # 注入 CSP / X-Robots-Tag / X-Frame-Options 等全站响应头
│   ├── actions/
│   │   └── index.ts                 # export const server = { inquiry: defineAction({...}) }
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
│   │   │   └── inquiry-form.client.ts   # JS island(call astro:actions)
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
│   │       └── inquiry.ts           # Astro Action 与前端 island 共享的 Zod schema
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
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',                       // server runtime;营销页用 page-level prerender opt-in
  adapter: cloudflare(),                  // 部署目标:Cloudflare Workers + Static Assets
  site: 'https://sevenseatjp.com',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'zh'],
    routing: { prefixDefaultLocale: false },    // ja 用根路径,zh 用 /zh/
  },
  vite: { plugins: [tailwindcss()] },
});
```

### 5.2 URL 形态

| 路径 | 语言 / 类型 |
|---|---|
| `/`、`/about`、`/airport-transfer` 等 | ja 营销页(prerendered) |
| `/zh/`、`/zh/about`、`/zh/airport-transfer` 等 | zh 营销页(prerendered) |
| `/_actions/inquiry` | Astro Action 公开 endpoint;由 `actions.inquiry(input)` 自动 POST,**无手写 endpoint 文件** |

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
import { actions } from 'astro:actions';
import { readAttribution } from '@/lib/attribution.client';

const form = document.getElementById('inquiry-form') as HTMLFormElement;
const submitBtn = form.querySelector('[type="submit"]') as HTMLButtonElement;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const turnstileToken = (form.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement)?.value;
  if (!turnstileToken) { /* show t('form.error.turnstile_failed') */ return; }

  const input = {
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

  submitBtn.disabled = true;
  submitBtn.setAttribute('aria-busy', 'true');

  // Astro Actions:类型从 server 端 schema 推导,无需手 serialize/parse JSON
  const { data, error } = await actions.inquiry(input);

  if (data?.ok) {
    form.replaceWith(/* 感谢卡片 */);
    return;
  }

  // error 是 ActionError 形式:{ code: 'BAD_REQUEST' | 'FORBIDDEN' | ..., message: string, fields?: ... }
  // code 映射到 form.error.<code> 本地化 key(由 BAD_REQUEST 转 invalid_payload 等)
  showLocalizedError(error);
  (window as Window & { turnstile?: { reset: () => void } }).turnstile?.reset();
  submitBtn.disabled = false;
  submitBtn.removeAttribute('aria-busy');
});
```

### 7.3 Astro Action(`src/actions/index.ts`)

**Schema 复用**:Inquiry payload schema 抽到 `src/lib/schemas/inquiry.ts`,Astro Action `input` 字段直接引用,客户端通过 `astro:actions` 自动拿到推导出的输入类型——无 JSON serialize 样板。

```ts
// src/lib/schemas/inquiry.ts
import { z } from 'zod';

const Attr = z.strictObject({
  source:   z.string().max(200),
  medium:   z.string().max(200),
  campaign: z.string().max(200),
  content:  z.string().max(200),
  term:     z.string().max(200),
  referrer: z.string().max(2000),
  landing:  z.string().max(500),
  ts: z.number().int().nonnegative(),
}).nullable();

// Zod 4 写法:用 z.strictObject 代替 z.object(...).strict()(后者 v4 已 deprecated);
// 用 z.email() 顶层 schema 代替 z.string().email()
export const InquirySchema = z.strictObject({
  serviceType: z.enum(['airport', 'charter', 'ski', 'rental']),
  from: z.string().min(1).max(200),
  to: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  passengers: z.number().int().min(1).max(10),
  luggage: z.number().int().min(0).max(15),
  notes: z.string().max(2000).optional(),
  name: z.string().min(1).max(100),
  email: z.email(),
  lineId: z.string().max(100).optional(),
  wechat: z.string().max(100).optional(),
  phoneCountryCode: z.string().regex(/^\+\d{1,4}$/),
  phone: z.string().min(4).max(20),
  locale: z.enum(['ja', 'zh']),
  utm: z.strictObject({
    firstTouch: Attr,
    lastTouch:  Attr,
    current:    Attr.unwrap(),
  }),
  turnstileToken: z.string().min(1),
});

export type InquiryPayload = z.infer<typeof InquirySchema>;
```

```ts
// src/actions/index.ts
import { defineAction, ActionError } from 'astro:actions';
import { Resend } from 'resend';
import { render } from 'react-email';            // React Email v6 单包
import { env } from 'cloudflare:workers';        // Astro 6 + cloudflare adapter:模块级 env(替代已删除的 Astro.locals.runtime.env)
import { InquirySchema } from '@/lib/schemas/inquiry';
import { InquiryInternalEmail } from '@/emails/InquiryInternal';
import { InquiryCustomerEmail } from '@/emails/InquiryCustomer';

// Workers env binding 的 TS 类型(astro/cloudflare 不会自动生成,推荐手写或用 wrangler types 生成)
declare module 'cloudflare:workers' {
  interface Env {
    RESEND_API_KEY: string;
    TURNSTILE_SECRET_KEY: string;
    COMPANY_INBOX: string;
    INQUIRY_FROM_EMAIL: string;
  }
}

export const server = {
  inquiry: defineAction({
    accept: 'json',
    input: InquirySchema,                        // Zod 4 schema 复用;输入类型自动推导到前端 island
    handler: async (input, ctx) => {
      // 1. Turnstile server-side siteverify(必须)
      // ActionError code 用 HTTP-status-style 字符串;'FORBIDDEN' 对应 token 不通过;
      // 'SERVICE_UNAVAILABLE' 对应 siteverify 不可达——前端按 code 映射本地化文案
      let verifyOk = false;
      try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret:   env.TURNSTILE_SECRET_KEY,
            response: input.turnstileToken,
            remoteip: ctx.request.headers.get('CF-Connecting-IP') ?? '',
          }),
        });
        const verify = await verifyRes.json() as { success: boolean };
        verifyOk = verify.success === true;
      } catch (e) {
        console.error('turnstile_verify_unreachable', e);
        throw new ActionError({ code: 'SERVICE_UNAVAILABLE', message: 'turnstile_unavailable' });
      }
      if (!verifyOk) {
        throw new ActionError({ code: 'FORBIDDEN', message: 'turnstile_failed' });
      }

      // 2. 串行发邮件:内部(必须成功)→ 客户(后台 fire-and-forget)
      const resend = new Resend(env.RESEND_API_KEY);
      const lastSrc = sanitizeHeader(input.utm.lastTouch?.source || 'direct');
      const subjectPrefix = `[${lastSrc}] `;
      const safeFrom = sanitizeHeader(input.from);
      const safeTo   = sanitizeHeader(input.to);

      // 2a. 内部邮件(必须成功)
      // 注意 1:`await render(...)` 可能抛(模板异常),所以 render + send 必须包在同一个 try
      // 注意 2:Resend SDK v6 在 API 错误时返回 { data, error } 而**不 throw**,显式检查 error 字段
      const internal = await sendInternalEmail(resend, input, safeFrom, safeTo, subjectPrefix);
      if (internal.error) {
        console.error('inquiry_internal_send_failed', internal.error);
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'email_send_failed' });
      }

      // 2b. 客户确认邮件(失败仅记日志,不阻断成功;走 cfContext.waitUntil 后台跑)
      // cfContext 是 Cloudflare Worker ExecutionContext,Astro 6 + cloudflare adapter 在 locals 暴露
      ctx.locals.cfContext.waitUntil((async () => {
        const customer = await sendCustomerEmail(resend, input);
        if (customer.error) {
          console.error('inquiry_customer_send_failed', customer.error, {
            internalEmailId: internal.data?.id,
          });
        }
      })());

      return { ok: true as const };               // Devalue 自动序列化到客户端
    },
  }),
};

type Input = typeof InquirySchema._output;
type SendResult = { data: { id: string } | null; error: unknown };

async function sendInternalEmail(
  resend: Resend, input: Input,
  safeFrom: string, safeTo: string, subjectPrefix: string,
): Promise<SendResult> {
  try {
    const html = await render(InquiryInternalEmail({ ...input }));
    return await resend.emails.send({
      from: `SevenSeatJP <${env.INQUIRY_FROM_EMAIL}>`,
      to:   env.COMPANY_INBOX,
      replyTo: input.email,
      subject: `${subjectPrefix}新询价 ${safeFrom}→${safeTo} ${input.date}`,
      html,
    });
  } catch (e) {
    return { data: null, error: e };
  }
}

async function sendCustomerEmail(resend: Resend, input: Input): Promise<SendResult> {
  try {
    const html = await render(InquiryCustomerEmail({ ...input }));
    return await resend.emails.send({
      from: `SevenSeatJP <${env.INQUIRY_FROM_EMAIL}>`,
      to:   input.email,
      subject: input.locale === 'zh'
        ? '【SevenSeatJP】您的询价已收到'
        : '【SevenSeatJP】お問合せを受け付けました',
      html,
    });
  } catch (e) {
    return { data: null, error: e };
  }
}

// 邮件 subject 防 CRLF / header 注入:换行折叠为空格,首尾去空白,长度兜底
function sanitizeHeader(s: string): string {
  return s.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 200);
}
```

**说明**:
- **payload 校验**:Action `input: InquirySchema` 由 Astro Actions 自动 safeParse;校验失败客户端收到 `{ error: { code: 'BAD_REQUEST', fields: { ... } } }`,无需手写 `safeParse` + `flattenError` 块。
- **body size guard**:Astro Actions 在 server 边读 body 边校验 schema,本身有上限;额外限制可在 middleware 里 reject `Content-Length > 100KB`(可选,若 v1 不必要可略)。
- **同源校验**:Astro 全局 `security.checkOrigin: true`(server 模式默认)拒绝跨站 POST。`/_actions/inquiry` endpoint 仍是公开的,但 origin check + Turnstile 双层防护足够 v1。
- **runtime env**:`import { env } from 'cloudflare:workers'`(Astro 6 + adapter v13 推荐)。**不要**用 `Astro.locals.runtime.env`——已删除。
- **waitUntil**:`ctx.locals.cfContext.waitUntil(promise)`——`cfContext` 是 Worker ExecutionContext。

### 7.4 错误码与本地化

ActionError 的 `code` 字段是 HTTP-status-style 字符串(`'BAD_REQUEST'`、`'FORBIDDEN'`、`'INTERNAL_SERVER_ERROR'` 等);`message` 字段携带我们的语义化错误 key(`turnstile_failed`、`email_send_failed` 等),前端按 message 映射到 i18n key `form.error.<message>`。

| ActionError `code` | message key (→ `form.error.<key>`) | zh | ja |
|---|---|---|---|
| `BAD_REQUEST` | `invalid_payload`(自动,schema 校验失败时由 Astro Actions 抛出) | 请检查表单字段 | 入力内容をご確認ください |
| `FORBIDDEN` | `turnstile_failed` | 人机验证失败,请刷新重试 | 認証に失敗しました。再度お試しください |
| `SERVICE_UNAVAILABLE` | `turnstile_unavailable` | 验证服务暂时不可用,请稍后重试或通过 LINE 联系 | 認証サービスに一時的に接続できません。LINE からご連絡ください |
| `INTERNAL_SERVER_ERROR` | `email_send_failed` | 提交失败,请通过 LINE 或微信联系 | 送信に失敗しました。LINE からご連絡ください |
| `PAYLOAD_TOO_LARGE` | `payload_too_large`(可选;若用 middleware 拦) | 请求过大,请精简备注后重试 | リクエストサイズが大きすぎます |

### 7.5 邮件模板(`src/emails/InquiryInternal.tsx`、`InquiryCustomer.tsx`)

- 从 `react-email` 单包 import:`Html` / `Head` / `Body` / `Container` / `Section` / `Heading` / `Text` / `Hr`(v6 已合并子包)
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

### 8.1 Cloudflare Workers 配置

部署目标 = **Cloudflare Workers + Static Assets**(@astrojs/cloudflare v13 只支持 Workers,Pages 已不支持)。构建后 `dist/_worker.js` 是 Worker 入口,`dist/*` 静态资源通过 Workers Static Assets binding 服务。

| 项 | 值 |
|---|---|
| Build command | `bun run build`(Astro adapter 生成 `dist/_worker.js` + 静态资源) |
| Deploy command | `wrangler deploy`(**不是** `wrangler pages deploy`) |
| Worker 入口 | `dist/_worker.js`(adapter 生成) |
| 静态资源目录 | `dist/`(Workers Static Assets binding) |
| Production branch | `main`(Workers Builds 监听 GitHub) |
| 兼容性 flags | `nodejs_compat`(Resend / `react-email` 需要) |
| Compatibility date | 编写当日(2026-05-26)固定 |
| 自定义域 | `sevenseatjp.com`(Task 16 才绑,占位阶段只用 `<worker>.workers.dev` + PR preview) |

**依赖**:
- `dependency`:`astro`、`@astrojs/cloudflare`、`zod`、`resend`、`react-email`、`react`、`react-dom`、`@astrojs/sitemap`
- `devDependency`:`@cloudflare/workers-types`(env 类型 + Worker 类型)、`wrangler`(本地 dev + CI deploy)、Tailwind、Biome、Playwright、TypeScript

### 8.1.1 `wrangler.jsonc`(Workers 配置)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "sevenseatjp",
  "compatibility_date": "2026-05-26",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./dist/_worker.js",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    // 默认 Workers Static Assets 行为:匹配到的静态文件**直接 serve,不进 Worker**——
    // 所以 prerendered 营销页拿不到 Worker middleware 的响应头(见 §8.6 双层 headers)
    "not_found_handling": "single-page-application"   // 或 'none';让未匹配路径走 Worker
  },
  "observability": { "enabled": true }
  // secrets 不写在这里;走 `wrangler secret put` / Workers dashboard
}
```

### 8.1.2 `public/.assetsignore`(必须)

Workers Static Assets 默认会把 `assets.directory`(即 `dist/`)**全部内容**当资产候选,包括 `_worker.js` 本身。**必须**用 `.assetsignore` 排除,否则:
1. `_worker.js` 可能被作为 `/_worker.js` 公开 serve(暴露 Worker 源码)
2. 与 Worker 入口冲突

```
# public/.assetsignore  —— build 后会复制到 dist/.assetsignore,wrangler 按此过滤
_worker.js
_routes.json
```

(Astro adapter 在 build 时可能自动生成 `_routes.json` 来声明 Worker 路由模式,也排除掉。)

### 8.2 环境变量

**两层 env,单一 binding 名**:Astro build-time `PUBLIC_*`(`import.meta.env`)读 `.env.local`(本地)/ workflow env(CI);Worker runtime secret 走 `cloudflare:workers` 模块的 `env`,值由 wrangler/dashboard 注入。**Workers dashboard 按 Production / Preview scope 分别填值**。代码里只读固定名称,无环境分支逻辑。

| Key | 用途 | 类型 | 谁读 |
|---|---|---|---|
| `RESEND_API_KEY` | Resend API key | secret | server (Action) |
| `COMPANY_INBOX` | 公司 Gmail / 收件邮箱 | env | server (Action) |
| `TURNSTILE_SECRET_KEY` | Turnstile server siteverify | secret | server (Action) |
| `INQUIRY_FROM_EMAIL` | Resend 验证域内的发件地址 | env | server (Action) |
| `PUBLIC_TURNSTILE_SITE_KEY` | Turnstile widget(build 时注入到客户端) | env(public) | Astro build-time → `import.meta.env` → prerendered HTML |

各 scope 填值约定:

| Scope | RESEND_API_KEY | COMPANY_INBOX | TURNSTILE_SECRET_KEY | PUBLIC_TURNSTILE_SITE_KEY | INQUIRY_FROM_EMAIL |
|---|---|---|---|---|---|
| **Production** | 真实 key | 客户 Gmail | 真实 secret | 真实 site key | `inquiry@sevenseatjp.com` |
| **Preview** | Resend test key 或同 prod | `delivered+internal@resend.dev` | `1x0000000000000000000000000000000AA` | `1x00000000000000000000AA` | `onboarding@resend.dev` |

### 8.3 Resend 配置

- 发送域 `sevenseatjp.com` 在 Resend 添加并验证 DNS:
  - SPF: `v=spf1 include:_spf.resend.com -all`
  - DKIM: Resend 提供 CNAME 或 TXT(按 dashboard 提示)
  - DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@sevenseatjp.com`(初期 `p=none` 观察)
- Reply-To 永远是客户邮箱,公司 Gmail 直接 reply 即可联系客户

### 8.4 GitHub Actions(`.github/workflows/ci.yml`)

**关键:`PUBLIC_TURNSTILE_SITE_KEY` 是 build-time 注入**(Astro `import.meta.env`),build 步骤就必须有值——否则 prerendered HTML 里 widget data-sitekey 是空字符串。CI build job 用 Turnstile dummy site key,保证 CI build 与 E2E build 行为一致。

部署职责由 **Cloudflare Workers Builds**(dashboard 直接监听 GitHub)处理——GitHub Actions 只跑 lint/typecheck/build/e2e,不调 `wrangler deploy`。

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, labeled]   # `labeled` 必须明确,见 plan §Task 15

env:
  PUBLIC_TURNSTILE_SITE_KEY: 1x00000000000000000000AA   # dummy,build 时注入到 prerendered HTML

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint                       # Biome v2
      - run: bun run typecheck                  # astro check
      - run: bun run build                      # 产出 dist/_worker.js + 静态资源

  e2e:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'run-e2e')
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium
      # 显式生成 .dev.vars,而非依赖 process.env fallback(Cloudflare workerd 要求 .dev.vars 或 CLOUDFLARE_INCLUDE_PROCESS_ENV=true)
      - run: |
          cat > .dev.vars <<EOF
          RESEND_API_KEY=${{ secrets.RESEND_API_KEY_PREVIEW }}
          TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
          COMPANY_INBOX=delivered+internal@resend.dev
          INQUIRY_FROM_EMAIL=onboarding@resend.dev
          EOF
      - run: bun run test:e2e                   # webServer = astro dev(adapter 接管 workerd,读 .dev.vars)
```

E2E 仅在 PR 上加 `run-e2e` 标签触发,日常 PR 不阻塞。

> **Workers Builds**(Cloudflare dashboard 自带的 GitHub 集成)处理实际部署:推 main → 触发 `bun install && bun run build && wrangler deploy`;开 PR → preview Worker URL。secrets 在 Workers dashboard 按 Production/Preview scope 配置,**不经过 GitHub Actions secrets**(避免双管理)。

### 8.5 本地与 E2E 运行方式

Astro 6 + `@astrojs/cloudflare` v13 的 dev server **直接跑 workerd**(Cloudflare Vite plugin),`astro dev` 同时服务营销页 + Action,无需 wrangler 桥接。

env 注入分**两层**,职责不同,文件也不同:

| 层 | 谁读 | 文件 | 暴露给 |
|---|---|---|---|
| **Astro build-time** | `bun run build` → `import.meta.env.PUBLIC_*` | `.env.local`(本地)/ CI workflow env | prerendered HTML 里的 widget data-sitekey 等 public 值 |
| **Worker runtime** | `cloudflare:workers` 模块的 `env` | `.dev.vars`(本地;wrangler 标准)/ Workers dashboard scope(生产) | Action handler 里 `env.RESEND_API_KEY` 等 secret |

**两个文件互不替代**:`.dev.vars` 在 build 时不被 Astro 读;`.env.local` 在 workerd runtime 也不会暴露到 `cloudflare:workers` 的 `env`。**本地开发要同时配两份**——同样的值复制两次,接受这点冗余。

```
# .env.local (本地,被 .gitignore 排除;Astro build 时读)
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

```
# .dev.vars (本地,被 .gitignore 排除;astro dev/workerd 时读)
RESEND_API_KEY=re_dev_...
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
COMPANY_INBOX=delivered+internal@resend.dev
INQUIRY_FROM_EMAIL=onboarding@resend.dev
```

`.gitignore` 必须含:`.env.local`、`.env.*.local`、`.dev.vars`、`.dev.vars.*`、`dist/`、`.wrangler/`、`node_modules/`。

```jsonc
// package.json scripts(Astro 6 + cloudflare adapter 下大幅简化)
{
  "dev":       "astro dev",                  // 直接跑 workerd;`.dev.vars` 自动加载
  "build":     "astro check && astro build", // 产出 dist/_worker.js + 静态资源
  "preview":   "astro preview",              // workerd runtime preview
  "deploy":    "wrangler deploy",            // 手动部署;日常用 Workers Builds 自动触发
  "lint":      "biome check .",
  "format":    "biome check --write .",
  "typecheck": "astro check",
  "test:e2e":  "playwright test"
}
```

```ts
// playwright.config.ts(简化)
export default defineConfig({
  webServer: {
    command: 'bun run dev',                       // astro dev 接管;无需 wrangler --binding
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://127.0.0.1:4321' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile',  use: { ...devices['iPhone 16 Pro'] } },
  ],
});
```

> **CI E2E env 注入方式**(两个等价做法,plan/CI 二选一):
> - **A. CI 步骤里把 `process.env` 写入 `.dev.vars` 文件**(更显式、跨 wrangler 版本稳定):
>   ```yaml
>   - run: |
>       cat > .dev.vars <<EOF
>       RESEND_API_KEY=${{ secrets.RESEND_API_KEY_PREVIEW }}
>       TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
>       COMPANY_INBOX=delivered+internal@resend.dev
>       INQUIRY_FROM_EMAIL=onboarding@resend.dev
>       EOF
>   - run: bun run test:e2e
>   ```
> - **B. 设 `CLOUDFLARE_INCLUDE_PROCESS_ENV=true`** + 把 secret 放 `process.env`:
>   ```yaml
>   - run: bun run test:e2e
>     env:
>       CLOUDFLARE_INCLUDE_PROCESS_ENV: "true"
>       RESEND_API_KEY: ${{ secrets.RESEND_API_KEY_PREVIEW }}
>       TURNSTILE_SECRET_KEY: 1x0000000000000000000000000000000AA
>       COMPANY_INBOX: delivered+internal@resend.dev
>       INQUIRY_FROM_EMAIL: onboarding@resend.dev
>   ```
>
> **不要**仅依赖 "Vite plugin 自动 fallback 到 process.env" 的假设——Cloudflare 文档明确要求上面任一显式做法,否则 workerd 拿不到 env。Plan Task 15 采用方案 A(写 `.dev.vars` 文件)。

### 8.6 全站响应头(**双层架构**:`public/_headers` + `src/middleware.ts`)

**Workers Static Assets 默认行为**:匹配到的静态文件**不进 Worker**,直接由 edge serve。所以 Astro `src/middleware.ts` 只能注入 Action / SSR 响应头,**不能覆盖 prerendered 营销页 + 静态资产**。CSP / X-Robots-Tag 等必须在两层都设:

| 层 | 文件 | 覆盖范围 | 在 Task 1 创建,Task 14 修订 |
|---|---|---|---|
| 静态层 | `public/_headers` | prerendered HTML + CSS/JS/IMG 资产 | ✓ |
| 动态层 | `src/middleware.ts` | Astro Action `/_actions/*` + 任何 server 渲染路由 | ✓ |

两层内容**保持一致**(都设 CSP / X-Robots-Tag / X-Frame-Options 等),写两遍接受冗余。

#### `public/_headers`(静态层)

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com;
```

#### `src/middleware.ts`(动态层)

```ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const res = await next();
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // 占位阶段反索引;Task 14 SEO 完整化时**同时**移除这里和 _headers 的对应行
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
  ].join('; '));
  return res;
});
```

**Task 14 解除反索引时**:`public/_headers` 删除 `X-Robots-Tag` 行 **+** `src/middleware.ts` 删除 `res.headers.set('X-Robots-Tag', ...)` 整行——**两处都改**,否则有一处残留就会让搜索引擎看到 noindex。

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
- 动态入口仅 `/_actions/inquiry`(Astro Action 自动生成的公开 endpoint),所有写操作都过 Astro Actions 自动 schema 校验 + handler 内的 Turnstile siteverify;Astro `security.checkOrigin: true`(server 模式默认)拦跨站 POST
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
| **W1** | Astro 6 init + cloudflare adapter + Tailwind v4 + i18n 骨架 + Workers 首次部署(`*.workers.dev`); collection schema + 5 条示例数据; 首页 + 询价表单(无样式版本) | 设计稿确认 30% |
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

- Astro 6 升级指南:https://docs.astro.build/en/guides/upgrade-to/v6/
- Astro Actions:https://docs.astro.build/en/guides/actions/
- Astro Actions API:https://docs.astro.build/en/reference/modules/astro-actions/
- Astro on-demand rendering / `prerender`:https://docs.astro.build/en/guides/on-demand-rendering/
- Astro `@astrojs/cloudflare`(Workers only):https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- Astro `astro/zod` 模块:https://docs.astro.build/en/reference/modules/astro-zod/
- Tailwind v4 升级指南:https://tailwindcss.com/docs/upgrade-guide
- Cloudflare Workers Static Assets:https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Workers wrangler.jsonc:https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare Turnstile:https://developers.cloudflare.com/cloudflare-challenges/challenge-types/turnstile/
- Turnstile 测试(dummy keys):https://developers.cloudflare.com/turnstile/troubleshooting/testing/
- Turnstile pre-clearance(本期不启用):https://developers.cloudflare.com/turnstile/get-started/pre-clearance/
- Resend 发送限额:https://resend.com/docs/knowledge-base/resend-sending-limits
- React Email v6(单包合并):https://resend.com/blog/react-email-6
- Zod 4 API:https://zod.dev/api
