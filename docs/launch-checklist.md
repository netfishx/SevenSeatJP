# SevenSeatJP 上线验收清单 (Task 16 — user-gate)

> **此 checklist 不可由 agent 关闭。每项必须由真人在生产环境（custom domain）核对并填证据，再由用户最终确认 v1.0.0 tag 发布。**

部署状态：`https://sevenseatjp.netfishx.workers.dev/`（占位 *.workers.dev URL）
最终域名：`https://sevenseatjp.com/`（Task 16 step 8 切换）

---

## 1. Lighthouse 跑分（5 个核心页面）

每页移动端 + 桌面端各跑一次，性能 ≥ 95、可访问性 ≥ 95、SEO = 100。

| URL | Perf (mobile) | A11y (mobile) | SEO (mobile) | 报告截图 |
|---|---|---|---|---|
| `/` | ❑ | ❑ | ❑ | `docs/launch/lh-home-mobile.html` |
| `/zh/` | ❑ | ❑ | ❑ | `docs/launch/lh-zh-home-mobile.html` |
| `/inquiry` | ❑ | ❑ | ❑ | `docs/launch/lh-inquiry-mobile.html` |
| `/zh/pricing` | ❑ | ❑ | ❑ | `docs/launch/lh-zh-pricing-mobile.html` |
| `/zh/vehicles` | ❑ | ❑ | ❑ | `docs/launch/lh-zh-vehicles-mobile.html` |

跑分命令：
```bash
bunx lighthouse https://sevenseatjp.com/ --view --output=html --output-path=./docs/launch/lh-home-mobile.html
```

---

## 2. Resend 发送域 mail-tester 评分

- Resend dashboard `sevenseatjp.com` SPF / DKIM / DMARC 状态：❑ 全绿
- 给 `test-xxx@mail-tester.com` 提交一次询价 → 等待 mail-tester 扫描 → 截图：❑
- 分数：❑ / 10（≥ 9 才通过）

---

## 3. 5 个真实邮箱送达测试

每个邮箱在 `/zh/inquiry` 各提交一次（每次填不同 utm 源以验证归因）。

| 客户邮箱域 | 询价提交 | 内部收件箱(公司 Gmail) | 客户确认信 | 备注 |
|---|---|---|---|---|
| Gmail | ❑ | ❑ | ❑ inbox / ❑ spam | |
| Outlook / Hotmail | ❑ | ❑ | ❑ inbox / ❑ spam | |
| QQ Mail | ❑ | ❑ | ❑ inbox / ❑ spam | |
| 163 Mail | ❑ | ❑ | ❑ inbox / ❑ spam | |
| iCloud | ❑ | ❑ | ❑ inbox / ❑ spam | |

公司 Gmail 检查 5 封内部信：
- subject 前缀 `[<source>] 新询价 ...`：❑ 全部正确
- 归因块完整（首触 / 末触 / 本次）：❑

---

## 4. 跨设备 / 跨浏览器测试

6 项各自手测，关注：渲染、字体、表单提交、Turnstile widget。

| 设备 / 浏览器 | 状态 | issue |
|---|---|---|
| iPhone Safari | ❑ | |
| Android Chrome | ❑ | |
| macOS Chrome | ❑ | |
| macOS Safari | ❑ | |
| macOS Firefox | ❑ | |
| Windows Edge | ❑ | |

---

## 5. 双语切换无残留扫描

在 `/zh/pricing` 切到 ja，再切回 zh。所有 UI 字符串无 fallback / 无 i18n key 漏出。

浏览器 DevTools console 跑：
```js
Array.from(document.querySelectorAll('*'))
  .filter((e) => /^[a-z]+\.[a-z]+/.test(e.textContent || '') && e.children.length === 0)
  .map((e) => e.textContent)
```

- 返回数组：❑ 空 / ❑ 有未解析 key（列出）

---

## 6. 13 个 URL 可访问性

```bash
for p in / about airport-transfer charter ski-hakuba rental pricing vehicles faq inquiry legal/tokushoho legal/privacy legal/cancel-policy; do
  curl -sf https://sevenseatjp.com/$p > /dev/null && echo "OK $p" || echo "FAIL $p"
done
for p in / about airport-transfer charter ski-hakuba rental pricing vehicles faq inquiry legal/tokushoho legal/privacy legal/cancel-policy; do
  curl -sf https://sevenseatjp.com/zh/$p > /dev/null && echo "OK zh/$p" || echo "FAIL zh/$p"
done
```

结果：❑ 全 OK

---

## 7. CTA 语言匹配 grep

```bash
curl -s https://sevenseatjp.com/ | grep -o 'href="/[^"]*inquiry[^"]*"' | sort -u  # 期望 /inquiry
curl -s https://sevenseatjp.com/zh/ | grep -o 'href="/[^"]*inquiry[^"]*"' | sort -u  # 期望 /zh/inquiry
```

结果：❑ ja → `/inquiry`，zh → `/zh/inquiry`

---

## 8. Turnstile 真实通过

- 真实 Turnstile site key 已写入 Workers Production env：❑
- 真实 Turnstile secret key 已写入 Workers Production secret：❑
- 在 `/inquiry` 用真实 widget 提交一次询价 → success：❑

---

## 9. 内部邮件归因完整

打开任意一封公司收件箱内部邮件，确认：
- subject 含 `[<last-touch-source>]` 前缀（如 `[google]` / `[direct]`）：❑
- 邮件正文含「渠道归因（请勿删，用于判断投放效果）」整块：❑
  - 首触 source/medium/campaign：❑ 数据完整
  - 末触 source/medium/campaign：❑ 数据完整
  - 本次 source/medium/campaign：❑ 数据完整

---

## 10. CSP 无 violation

- `/`、`/inquiry` 在浏览器 DevTools Console 跑一遍点击 + 提交：❑ 无 CSP violation 报红
- 截图：`docs/launch/csp-no-violation.png`：❑

---

## 11. 生产域名切换 + SSL

- Cloudflare Workers dashboard → Domains & Routes 加 custom domain `sevenseatjp.com`：❑
- DNS A/CNAME 记录指向 Workers：❑
- SSL 证书自动颁发完成（浏览器锁图标显示有效）：❑
- `curl -sI https://sevenseatjp.com/` 返回 200 + `server: cloudflare`：❑
- robots.txt 中 Sitemap URL 已是生产域名：❑（代码已写死）

---

## 12. v1.0.0 tag 发布

代码层就绪后由用户执行：
```bash
git tag -a v1.0.0 -m "v1.0.0 — production launch"
git push origin v1.0.0
```

结果：❑ tag 已推送到 origin

---

## 部署残留项目（开发期占位，需要 Task 16 处理）

- [ ] `public/og-default.png`：当前是 1×1 占位 PNG，需替换为 1200×630 品牌设计图（spec §6 OG 规范）
- [ ] `src/assets/vehicles/{alphard,vellfire,hiace}-1.jpg`：3 张 1×1 占位 JPG，需替换为客户真实车辆图
- [ ] 字体子集化（Noto Serif/Sans JP woff2 子集 + BaseLayout `<link rel="preload">`）：本期未做，按 Lighthouse mobile perf 跑分结果决定是否补
- [ ] `src/components/pages/legal/TokushohoPage.astro` 中的占位字段（運営責任者 / 所在地详情）：客户素材到位后替换

---

## 全部 ✓ 后

记录跑分截图与邮件 Message-ID，并在此文档末尾签字：

```
验收完成：netfishx
日期：____-__-__
git tag v1.0.0 已推送：是
```
