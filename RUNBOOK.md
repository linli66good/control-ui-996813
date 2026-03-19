# control-ui Runbook

## 1. Architecture
- Frontend: `https://app.996813.xyz` (Cloudflare Pages)
- API: `https://api.996813.xyz` (Cloudflare Tunnel -> `127.0.0.1:8787`)
- Data: SQLite (`data/app.db`) + Google Sheets fallback
- Automation: cron + Python workers

## 2. Required env
Server (`api/.env`):
- `SHEET_ID`
- `API_SHARED_SECRET`
- `ALL_PROXY`
- `HTTPS_PROXY`
- `HTTP_PROXY`
- `GOG_ACCOUNT`
- `GOG_KEYRING_PASSWORD`
- `FEISHU_MONITOR_WEBHOOK` (optional)

Cloudflare Pages:
- `APP_PASSWORD`
- `COOKIE_SIGNING_SECRET`
- `API_BASE=https://api.996813.xyz`
- `API_SHARED_SECRET` (must match server)

## 3. Local run
### API
```bash
cd /root/.openclaw/workspace/control-ui/api
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8787 --reload
```

### Web
```bash
cd /root/.openclaw/workspace/control-ui/web
npm install
npm run dev
```

## 4. Validation checklist
### Build / syntax
```bash
cd /root/.openclaw/workspace/control-ui/web
npm run build

cd /root/.openclaw/workspace/control-ui
python3 -m py_compile api/app/routes/*.py api/app/services/*.py workers/**/*.py
```

### Health
```bash
curl -fsS http://127.0.0.1:8787/health
curl -fsS https://api.996813.xyz/health
```
Expected: `{"ok":true}` in both.

### System status
- Open `/config`
- Or call `GET /v1/system/status`
- Check:
  - DB exists
  - `SHEET_ID` configured
  - `API_SHARED_SECRET` configured
  - optional `FEISHU_MONITOR_WEBHOOK`
  - latest sync/scan/report timestamps are reasonable

## 5. Current cron
Machine-level file: `/root/.openclaw/cron/jobs.json`
- Learn sync: `08:00`
- News sync: `08:10`
- Monitor scan: `09:30`

## 6. Operational checks by module
### Learn
- Page `/learn`
- Click sync button
- Verify API rows appear; if empty, Sheet fallback still works

### News
- Page `/news`
- Click sync button
- Verify grouped data appears from SQLite; fallback remains available

### Comp / Monitor
- Page `/comp`
- Create target
- Run scan
- Verify snapshot / changed fields / notify status
- Existing target notify switch should update immediately

### Analysis
- Page `/analysis`
- Create report with `country + asin`
- Verify structured report renders and raw markdown exists

### Inventory
- Page `/inventory`
- Click sync
- Verify risk level and replenishment formula rendering
- If no inventory rows, fallback to `Inputs_ASIN`

### Logistics
- Page `/logistics`
- Verify `Logistics` sheet rows load
- Check alert summary / ETA warnings

### Keywords / Finder / Config
- `/kw` or `/keywords`: keyword pool loads
- `/finder`: ASIN pool loads, filter works, quick jump / quick monitor works
- `/config`: shows read-only live system status

## 7. Known accepted issues
- Vite build has large chunk warning; currently accepted
- Direct Amazon fetch may hit anti-bot; analysis/monitor rely on mirror fallback when needed
- `notify_enabled` can be toggled in `/comp`, but broader batch controls are not implemented yet

## 8. Fast rollback pointers
- Frontend issue: revert latest `control-ui` commit and redeploy Pages
- API issue: restart local API service with previous code
- Data issue: SQLite is local runtime state; avoid deleting `data/app.db` blindly
- Cron issue: machine config is outside repo, restore `/root/.openclaw/cron/jobs.json`
