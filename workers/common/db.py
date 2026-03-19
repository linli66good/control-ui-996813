from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / 'data' / 'app.db'


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
