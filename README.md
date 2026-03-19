# control-ui (996813.xyz)

## Domains
- app: https://app.996813.xyz
- api: https://api.996813.xyz

## Current MVP Scope
Phase 1 modules:
- /learn
- /news
- /comp
- /analysis

Current build strategy:
- reuse existing `control-ui/`
- keep current Google Sheet endpoints alive
- add SQLite-backed grouped API routes in parallel
- frontend uses **API first, Sheet fallback** during migration

## Secrets / Config
Set these in Cloudflare Pages (Production env):
- APP_PASSWORD=XXY960813
- COOKIE_SIGNING_SECRET=<random long string>
- API_BASE=https://api.996813.xyz
- API_SHARED_SECRET=<random long string>

Set these on the server for FastAPI service:
- API_SHARED_SECRET=<same as above>
- SHEET_ID=1T2CKdeRTC8y_mGT0cdKPskcqiHzhQvDW7uvFbPGeANU
- ALL_PROXY/HTTPS_PROXY/HTTP_PROXY=socks5h://127.0.0.1:1080
- GOG_ACCOUNT=lanyoujckyxgs@gmail.com
- GOG_KEYRING_PASSWORD=(from /etc/systemd/system/openclaw.service.d/gog.conf)

## Notes
- Google access requires proxy (DNS pollution). Use socks5h.
- Cloudflare Tunnel exposes `api.996813.xyz -> http://127.0.0.1:8787`

## New API Skeleton
Grouped backend routes:
- `/v1/learn/*`
- `/v1/news/*`
- `/v1/monitor/*`
- `/v1/analysis/*`
- `/v1/system/*`

Current module status:
- `/learn`: SQLite API ready, page = API 优先 / Sheet 保底
- `/news`: SQLite API ready, page = API 优先 / Sheet 保底
- `/comp`: SQLite API skeleton ready, supports add/list/run/delete/detail/snapshots
- `/analysis`: SQLite API skeleton ready, supports create/list/detail
- `Dashboard`: API 优先 / Sheet 保底

## SQLite
Schema file:
- `api/app/db/schema.sql`

Local DB path:
- `data/app.db`

Tables:
- `learn_cards`
- `news_items`
- `monitor_targets`
- `monitor_snapshots`
- `analysis_reports`

## Workers Skeleton
- `workers/learn/generate_top3.py`
- `workers/learn/sync_learn_cards.py`
- `workers/news/fetch_amazon_news.py`
- `workers/news/fetch_ai_news.py`
- `workers/news/build_daily_news.py`
- `workers/monitor/scan_targets.py`
- `workers/monitor/diff_snapshots.py`
- `workers/analysis/run_analysis.py`

## Local Run
### API
```bash
cd control-ui/api
uvicorn app.main:app --host 127.0.0.1 --port 8787 --reload
```

### Web
```bash
cd control-ui/web
npm install
npm run dev
```

## Minimal Worker Run (skeleton)
These scripts are placeholders now, but the call style is fixed so later cron can reuse it.

### Learn
```bash
cd control-ui
python3 workers/learn/generate_top3.py
python3 workers/learn/sync_learn_cards.py
```

### News
```bash
cd control-ui
python3 workers/news/fetch_amazon_news.py
python3 workers/news/fetch_ai_news.py
python3 workers/news/build_daily_news.py
```

### Monitor
```bash
cd control-ui
python3 workers/monitor/scan_targets.py
python3 workers/monitor/diff_snapshots.py
```

### Analysis
```bash
cd control-ui
python3 workers/analysis/run_analysis.py
```

## Suggested cron order later
- 08:00 `workers/learn/generate_top3.py`
- 08:10 `workers/news/build_daily_news.py`
- every few hours `workers/monitor/scan_targets.py`
- on demand `workers/analysis/run_analysis.py`

## Next Step Order
1. wire real worker logic for `/learn`
2. wire real worker logic for `/news`
3. replace `/comp` skeleton snapshot with real fetch + diff
4. replace `/analysis` skeleton markdown with real analysis pipeline
