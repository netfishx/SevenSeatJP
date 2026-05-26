# CI Workflow Notes

## Triggers

`ci.yml` runs on:

- `push` to `main`
- `pull_request` events: `opened`, `synchronize`, `reopened`, **`labeled`**

The `labeled` type matters — when you add the `run-e2e` label to an existing
PR, GitHub fires a new `pull_request` event. Without `labeled` in the trigger
list the workflow would not re-run, so the E2E job would never see the new
label.

## Jobs

- **build** (always): `bun install --frozen-lockfile` → `bun run lint`
  → `bun run typecheck` → `bun run build`.
- **e2e** (only when PR has `run-e2e` label): writes `.dev.vars` from secrets
  (workerd does **not** auto-fallback to `process.env` — it requires either
  a `.dev.vars` file or `CLOUDFLARE_INCLUDE_PROCESS_ENV=true`; we pick the
  former for explicitness), installs Playwright chromium, runs `test:e2e`.

## Required secrets

| Secret | Used for | Fallback if missing |
|---|---|---|
| `RESEND_API_KEY_PREVIEW` | server-side stub send to `delivered+*@resend.dev` | string `re_dev_test_key` (causes Action to throw `INTERNAL_SERVER_ERROR`, which the client-guard E2E test still passes) |

`PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (always-pass dummy) is
hard-coded in workflow env so the build embeds it into prerendered HTML.

Turnstile secret in `.dev.vars` is the always-pass dummy
`1x0000000000000000000000000000000AA`, matching the public dummy site key.

## How to opt a PR into E2E

```bash
gh pr edit <pr-number> --add-label run-e2e
```

Re-add the label to retrigger:

```bash
gh pr edit <pr-number> --remove-label run-e2e
gh pr edit <pr-number> --add-label run-e2e
```
