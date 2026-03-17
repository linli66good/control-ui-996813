import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import sheets

API_SHARED_SECRET = os.environ.get("API_SHARED_SECRET", "")

app = FastAPI(title="996813 Control API", version="0.1.0")

# (Optional) CORS: not needed if only called via Pages Functions, but keep safe default.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_credentials=False,
    allow_methods=["*"] ,
    allow_headers=["*"] ,
)


def require_secret(x_shared_secret: str | None):
    if not API_SHARED_SECRET:
        raise HTTPException(status_code=500, detail="Missing API_SHARED_SECRET on server")
    if not x_shared_secret or x_shared_secret != API_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


class RangeResp(BaseModel):
    range: str
    values: list[list[str]] | None = None


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
