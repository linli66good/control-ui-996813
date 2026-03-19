from __future__ import annotations

from pathlib import Path
import argparse
import json
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workers.common.db import connect  # noqa: E402
from workers.common.logger import get_logger  # noqa: E402

logger = get_logger('diff_snapshots')


def _parse_payload(value: str | None) -> dict:
    if not value:
        return {}
    try:
        return json.loads(value)
    except Exception:
        return {}


def diff_latest(target_id: int) -> dict:
    with connect() as conn:
        target = conn.execute('SELECT * FROM monitor_targets WHERE id = ?', (target_id,)).fetchone()
        rows = conn.execute(
            '''
            SELECT * FROM monitor_snapshots
            WHERE target_id = ?
            ORDER BY captured_at DESC, id DESC
            LIMIT 2
            ''',
            (target_id,),
        ).fetchall()

    latest = dict(rows[0]) if rows else None
    previous = dict(rows[1]) if len(rows) > 1 else None
    latest_payload = _parse_payload(latest['raw_payload']) if latest else {}
    previous_payload = _parse_payload(previous['raw_payload']) if previous else {}

    result = {
        'target': dict(target) if target else None,
        'latest': latest,
        'previous': previous,
        'latest_payload': latest_payload,
        'previous_payload': previous_payload,
    }
    logger.info('diff latest: target_id=%s has_latest=%s has_previous=%s', target_id, bool(latest), bool(previous))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Show latest two snapshots for one target.')
    parser.add_argument('--target-id', type=int, required=True)
    args = parser.parse_args()
    out = diff_latest(args.target_id)
    print(json.dumps(out, ensure_ascii=False, indent=2))
