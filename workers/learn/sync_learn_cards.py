from __future__ import annotations

from pathlib import Path
import sys
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workers.common.db import connect  # noqa: E402
from workers.common.helpers import now_iso  # noqa: E402
from workers.common.logger import get_logger  # noqa: E402
from api.app import sheets  # noqa: E402

logger = get_logger('sync_learn_cards')

SHEET_RANGE = 'Learn_Top3!A1:I500'


def _rows_from_sheet(values: list[list[str]]) -> list[dict]:
    if not values or len(values) < 2:
        return []
    header = values[0]
    rows: list[dict] = []
    for i, r in enumerate(values[1:], start=1):
        obj: dict[str, str] = {'_row': str(i + 1)}
        for idx, h in enumerate(header):
            obj[h or f'col_{idx}'] = r[idx] if idx < len(r) else ''
        rows.append(obj)
    return rows


def _to_record(row: dict) -> dict | None:
    card_date = str(row.get('Date', '')).strip()
    title = str(row.get('Title', '')).strip()
    source_url = str(row.get('URL', '')).strip()
    if not card_date or not title or not source_url:
        return None

    summary = str(row.get('Summary', '')).strip()
    item_title = str(row.get('ItemTitle', '')).strip()
    item = str(row.get('Item', '')).strip()
    score_raw = str(row.get('Score', '')).strip()
    try:
        score = int(float(score_raw)) if score_raw else 0
    except Exception:
        score = 0

    content_parts = []
    if item_title:
        content_parts.append(f'ItemTitle: {item_title}')
    if item:
        content_parts.append(f'Item: {item}')
    if summary:
        content_parts.append(summary)
    content = '\n\n'.join([x for x in content_parts if x]).strip() or summary or title

    return {
        'card_date': card_date,
        'title': title,
        'source_url': source_url,
        'source_domain': urlparse(source_url).netloc,
        'score': score,
        'summary': summary,
        'content': content,
        'market_feedback': '',
        'final_view': '',
        'is_top3': 1,
    }


def sync_learn_cards() -> dict:
    data = sheets.get_range(SHEET_RANGE)
    values = data.get('values') or []
    raw_rows = _rows_from_sheet(values)
    records = [x for x in (_to_record(r) for r in raw_rows) if x]
    now = now_iso()

    with connect() as conn:
        inserted = 0
        updated = 0
        for rec in records:
            row = conn.execute(
                'SELECT id FROM learn_cards WHERE card_date = ? AND title = ? AND source_url = ?',
                (rec['card_date'], rec['title'], rec['source_url']),
            ).fetchone()
            if row:
                conn.execute(
                    '''
                    UPDATE learn_cards
                    SET source_domain = ?, score = ?, summary = ?, content = ?, market_feedback = ?, final_view = ?, is_top3 = ?, updated_at = ?
                    WHERE id = ?
                    ''',
                    (
                        rec['source_domain'],
                        rec['score'],
                        rec['summary'],
                        rec['content'],
                        rec['market_feedback'],
                        rec['final_view'],
                        rec['is_top3'],
                        now,
                        row['id'],
                    ),
                )
                updated += 1
            else:
                conn.execute(
                    '''
                    INSERT INTO learn_cards (
                      card_date, title, source_url, source_domain, score,
                      summary, content, market_feedback, final_view, is_top3,
                      created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        rec['card_date'],
                        rec['title'],
                        rec['source_url'],
                        rec['source_domain'],
                        rec['score'],
                        rec['summary'],
                        rec['content'],
                        rec['market_feedback'],
                        rec['final_view'],
                        rec['is_top3'],
                        now,
                        now,
                    ),
                )
                inserted += 1

    result = {
        'sheet_range': SHEET_RANGE,
        'scanned': len(raw_rows),
        'valid': len(records),
        'inserted': inserted,
        'updated': updated,
    }
    logger.info('learn sync done: %s', result)
    return result


if __name__ == '__main__':
    out = sync_learn_cards()
    logger.info('done: %s', out)

