from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / 'data'
DB_PATH = DATA_DIR / 'app.db'
SCHEMA_PATH = ROOT / 'api' / 'app' / 'db' / 'schema.sql'


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def connect() -> sqlite3.Connection:
    ensure_data_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    ensure_data_dir()
    schema = SCHEMA_PATH.read_text(encoding='utf-8')
    with connect() as conn:
        conn.executescript(schema)
        conn.commit()
