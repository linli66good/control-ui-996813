import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import sheets
from .db.sqlite import init_db
from .routes import learn, news, monitor, analysis, system, inventory

API_SHARED_SECRET = os.environ.get("API_SHARED_SECRET", "")

app = FastAPI(title="996813 Control API", version="0.3.0")

# (Optional) CORS: not needed if only called via Pages Functions, but keep safe default.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    # Ensure SQLite schema exists for MVP modules.
    init_db()


def require_secret(x_shared_secret: str | None):
    if not API_SHARED_SECRET:
        raise HTTPException(status_code=500, detail="Missing API_SHARED_SECRET on server")
    if not x_shared_secret or x_shared_secret != API_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


def truthy(v: str | None) -> bool:
    return str(v or "").strip().upper() in ("TRUE", "1", "YES", "Y", "ON")


def is_header_row(country: str, asin_or_keyword: str) -> bool:
    c = country.strip().lower()
    a = asin_or_keyword.strip().lower()
    return (c in ("country", "国家") and a in ("asin", "关键词", "keyword"))


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/v1/tabs")
def v1_tabs(x_shared_secret: str | None = Header(default=None, alias="X-Shared-Secret")):
    require_secret(x_shared_secret)
    try:
        meta = sheets.metadata()
        tabs = []
        for s in meta.get("sheets", []):
            p = (s.get("properties") or {})
            tabs.append({"title": p.get("title"), "sheetId": p.get("sheetId")})
        return {"tabs": tabs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/range")
def v1_range(A1: str, x_shared_secret: str | None = Header(default=None, alias="X-Shared-Secret")):
    require_secret(x_shared_secret)
    try:
        data = sheets.get_range(A1)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class UpdateReq(BaseModel):
    A1: str
    values: list[list[str]]


@app.post("/v1/update")
def v1_update(req: UpdateReq, x_shared_secret: str | None = Header(default=None, alias="X-Shared-Secret")):
    require_secret(x_shared_secret)
    try:
        return sheets.update_range(req.A1, req.values)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/inputs/asins")
def v1_inputs_asins(x_shared_secret: str | None = Header(default=None, alias="X-Shared-Secret")):
    """Return enabled ASIN watchlist from Inputs_ASIN tab.

    Columns (header row): Country, ASIN, CategoryRank, Notes, Enabled
    """
    require_secret(x_shared_secret)
    try:
        data = sheets.get_range("Inputs_ASIN!A1:E2000")
        vals = data.get("values") or []
        if len(vals) < 2:
            return {"items": []}
        header = vals[0]
        rows = vals[1:]

        idx = {name: i for i, name in enumerate(header)}
        out = []
        for r in rows:
            def get(name: str) -> str:
                i = idx.get(name)
                return r[i] if i is not None and i < len(r) else ""

            country = get("Country").strip().upper()
            asin = get("ASIN").strip().upper()
            if not country or not asin:
                continue
            if is_header_row(country, asin):
                continue

            enabled = truthy(get("Enabled"))
            if not enabled:
                continue

            out.append(
                {
                    "country": country,
                    "asin": asin,
                    "categoryRank": get("CategoryRank"),
                    "notes": get("Notes"),
                }
            )
        return {"items": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/inputs/keywords")
def v1_inputs_keywords(x_shared_secret: str | None = Header(default=None, alias="X-Shared-Secret")):
    """Return enabled keyword watchlist from Inputs_Keywords tab.

    Columns: Country, Keyword, Tag, AMZ123_Entry_URL, Enabled, Notes
    """
    require_secret(x_shared_secret)
    try:
        data = sheets.get_range("Inputs_Keywords!A1:F5000")
        vals = data.get("values") or []
        if len(vals) < 2:
            return {"items": []}
        header = vals[0]
        rows = vals[1:]

        idx = {name: i for i, name in enumerate(header)}
        out = []
        for r in rows:
            def get(name: str) -> str:
                i = idx.get(name)
                return r[i] if i is not None and i < len(r) else ""

            country = get("Country").strip().upper()
            keyword = get("Keyword").strip()
            if not country or not keyword:
                continue
            if is_header_row(country, keyword):
                continue

            enabled = truthy(get("Enabled"))
            if not enabled:
                continue

            out.append(
                {
                    "country": country,
                    "keyword": keyword,
                    "tag": get("Tag"),
                    "amz123EntryUrl": get("AMZ123_Entry_URL"),
                    "notes": get("Notes"),
                }
            )
        return {"items": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Mount MVP v3-style grouped routes (currently skeletons)
app.include_router(system.router)
app.include_router(learn.router)
app.include_router(news.router)
app.include_router(monitor.router)
app.include_router(analysis.router)
app.include_router(inventory.router)
