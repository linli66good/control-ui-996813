# control-ui (996813.xyz)

## Domains
- app: https://app.996813.xyz
- api: https://api.996813.xyz

## Current product state
Core modules already usable:
- `/learn`
- `/news`
- `/comp`
- `/analysis`
- `/inventory`
- `/logistics`
- `/kw` and `/keywords`
- `/finder`
- `/config`

Current strategy:
- reuse existing `control-ui/`
- keep Google Sheet endpoints alive as fallback
- migrate pages to **API first, Sheet fallback**
- use SQLite for local structured data

## Secrets / Config
### Cloudflare Pages
- `APP_PASSWORD`
- `COOKIE_SIGNING_SECRET`
- `API_BASE=https://api.996813.xyz`
- `API_SHARED_SECRET` (must match API server)

### Server (`api/.env`)
- `SHEET_ID`
- `API_SHARED_SECRET`
- `ALL_PROXY/HTTPS_PROXY/HTTP_PROXY=socks5h://127.0.0.1:1080`
- `GOG_ACCOUNT`
- `GOG_KEYRING_PASSWORD`
- `FEISHU_MONITOR_WEBHOOK` (optional)

## Notes
- Google access requires `socks5h` proxy
- Cloudflare Tunnel exposes `api.996813.xyz -> http://127.0.0.1:8787`
- `/config` is the live read-only status page

## Backend routes
- `/v1/learn/*`
- `/v1/news/*`
- `/v1/monitor/*`
- `/v1/analysis/*`
- `/v1/inventory/*`
- `/v1/system/*`

## SQLite
Schema file:
- `api/app/db/schema.sql`

Local DB path:
- `data/app.db`

Main tables:
- `learn_cards`
- `news_items`
- `monitor_targets`
- `monitor_snapshots`
- `analysis_reports`
- `inventory_items`

## Workers
- `workers/learn/generate_top3.py`
- `workers/learn/sync_learn_cards.py`
- `workers/news/build_daily_news.py`
- `workers/monitor/scan_targets.py`
- `workers/monitor/diff_snapshots.py`
- `workers/analysis/run_analysis.py`
- `workers/inventory/sync_inventory_items.py`

## Local run
### API
```bash
cd control-ui/api
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8787 --reload
```

### Web
```bash
cd control-ui/web
npm install
npm run dev
```

## Validation
### API health
```bash
curl -fsS http://127.0.0.1:8787/health
curl -fsS https://api.996813.xyz/health
```

### Frontend build
```bash
cd control-ui/web
npm run build
```

### Backend syntax
```bash
cd control-ui
python3 -m py_compile api/app/routes/*.py api/app/services/*.py
```

## Operations / Runbook
See:
- `RUNBOOK.md`
