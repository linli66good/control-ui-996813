# control-ui web

Frontend for `app.996813.xyz`.

## Stack
- React
- TypeScript
- Vite
- antd
- TanStack Query

## Env linkage
Cloudflare Pages should provide:
- `APP_PASSWORD`
- `COOKIE_SIGNING_SECRET`
- `API_BASE=https://api.996813.xyz`
- `API_SHARED_SECRET`

## Local dev
```bash
cd web
npm install
npm run dev
```

## Build
```bash
npm run build
```

Known accepted warning:
- Vite large chunk warning is currently accepted.

## Product pages
- `/learn`
- `/news`
- `/comp`
- `/analysis`
- `/inventory`
- `/logistics`
- `/kw`
- `/keywords`
- `/finder`
- `/config`

## Notes
- Many pages use **API first, Sheet fallback** during migration.
- `/config` is read-only status, not a secret editor.
