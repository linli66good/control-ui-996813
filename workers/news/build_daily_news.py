from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workers.common.db import connect  # noqa: E402
from workers.common.helpers import now_iso  # noqa: E402
from workers.common.logger import get_logger  # noqa: E402
from api.app import sheets  # noqa: E402

logger = get_logger('build_daily_news')

SHEET_RANGE = 'Daily_News!A1:G500'


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


def _pick(row: dict, *keys: str) -> str:
    for k in keys:
        v = str(row.get(k, '')).strip()
        if v:
            return v
    return ''


def _normalize_news_type(v: str) -> str:
    s = (v or '').strip().lower()
    if 'ai' in s:
        return 'ai'
    if 'amazon' in s:
        return 'amazon'
    return 'other'


def _to_record(row: dict, idx: int) -> dict | None:
    news_date = _pick(row, '日期(UTC+8)', '日期', 'Date')
    title = _pick(row, '标题', 'Title')
    source_url = _pick(row, '链接', 'URL', 'Link')
    if not news_date or not title or not source_url:
        return None

    summary = _pick(row, '摘要', 'Summary')
    source = _pick(row, '来源', 'SourceName')
    source_type = _normalize_news_type(_pick(row, 'Source', '类型', 'Type'))
    notes = _pick(row, 'Notes', '备注')
    content = '\n\n'.join([x for x in [summary, notes] if x]).strip()

    return {
        'news_date': news_date,
        'news_type': source_type,
        'title': title,
        'source': source,
        'source_url': source_url,
        'summary': summary,
        'content': content,
        'sort_order': 1000 - idx,
    }


def build_daily_news() -> dict:
    data = sheets.get_range(SHEET_RANGE)
    values = data.get('values') or []
    raw_rows = _rows_from_sheet(values)
    records = [x for i, row in enumerate(raw_rows, start=1) for x in [_to_record(row, i)] if x]
    now = now_iso()

    with connect() as conn:
        inserted = 0
        updated = 0
        for rec in records:
            row = conn.execute(
                'SELECT id FROM news_items WHERE news_date = ? AND news_type = ? AND title = ? AND source_url = ?',
                (rec['news_date'], rec['news_type'], rec['title'], rec['source_url']),
            ).fetchone()
            if row:
                conn.execute(
                    '''
                    UPDATE news_items
                    SET source = ?, summary = ?, content = ?, sort_order = ?, updated_at = ?
                    WHERE id = ?
                    ''',
                    (
                        rec['source'],
                        rec['summary'],
                        rec['content'],
                        rec['sort_order'],
                        now,
                        row['id'],
                    ),
                )
                updated += 1
            else:
                conn.execute(
                    '''
                    INSERT INTO news_items (
                      news_date, news_type, title, source, source_url,
                      summary, content, sort_order, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        rec['news_date'],
                        rec['news_type'],
                        rec['title'],
                        rec['source'],
                        rec['source_url'],
                        rec['summary'],
                        rec['content'],
                        rec['sort_order'],
                        now,
                        now,
                    ),
                )
                inserted += 1

    amazon_count = sum(1 for x in records if x['news_type'] == 'amazon')
    ai_count = sum(1 for x in records if x['news_type'] == 'ai')
    result = {
        'sheet_range': SHEET_RANGE,
        'scanned': len(raw_rows),
        'valid': len(records),
        'inserted': inserted,
        'updated': updated,
        'amazon_count': amazon_count,
        'ai_count': ai_count,
    }
    logger.info('news sync done: %s', result)
    return result


if __name__ == '__main__':
    out = build_daily_news()
    logger.info('done: %s', out)

