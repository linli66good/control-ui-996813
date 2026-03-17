import os
import subprocess
import json
import time
from typing import Any, Optional, List

SHEET_ID = os.environ.get("SHEET_ID", "")

class GogError(RuntimeError):
    pass

def _env_for_gog() -> dict:
    env = os.environ.copy()
    # ensure socks5h proxy
    env.setdefault("ALL_PROXY", "socks5h://127.0.0.1:1080")
    env.setdefault("HTTPS_PROXY", "socks5h://127.0.0.1:1080")
    env.setdefault("HTTP_PROXY", "socks5h://127.0.0.1:1080")
    return env

def _run_gog(args: List[str], retries: int = 3, backoff: List[float] = [1.0, 3.0, 7.0]) -> str:
    last_err = ""
    for i in range(retries):
        try:
            p = subprocess.run(
                args,
                env=_env_for_gog(),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=30,
            )
            if p.returncode != 0:
                last_err = p.stderr.strip() or f"exit {p.returncode}"
                raise GogError(last_err)
            out = p.stdout.strip()
            if not out:
                # sometimes gog returns empty on transient network issues
                last_err = "empty stdout"
                raise GogError(last_err)
            return out
        except Exception as e:
            last_err = str(e)
            if i < retries - 1:
                time.sleep(backoff[min(i, len(backoff)-1)])
                continue
    raise GogError(last_err)

def get_range(a1: str) -> dict:
    if not SHEET_ID:
        raise GogError("Missing SHEET_ID")
    out = _run_gog(["gog", "sheets", "get", SHEET_ID, a1, "--json"])
    return json.loads(out)

def update_range(a1: str, values: list[list[Any]]) -> dict:
    if not SHEET_ID:
        raise GogError("Missing SHEET_ID")
    out = _run_gog([
        "gog", "sheets", "update", SHEET_ID, a1,
        "--values-json", json.dumps(values, ensure_ascii=False),
        "--input", "USER_ENTERED",
        "--json",
    ])
    return json.loads(out) if out.startswith("{") else {"ok": True, "raw": out}

def clear_range(a1: str) -> dict:
    if not SHEET_ID:
        raise GogError("Missing SHEET_ID")
    out = _run_gog(["gog", "sheets", "clear", SHEET_ID, a1, "--json"])
    return json.loads(out) if out.startswith("{") else {"ok": True, "raw": out}

def metadata() -> dict:
    if not SHEET_ID:
        raise GogError("Missing SHEET_ID")
    out = _run_gog(["gog", "sheets", "metadata", SHEET_ID, "--json"])
    return json.loads(out)
