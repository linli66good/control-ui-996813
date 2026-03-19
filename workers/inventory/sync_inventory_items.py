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

logger = get_logger('sync_inventory_items')

SHEET_RANGE = 'Inventory!A1:L2000'


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


def _to_int(v: str) -> int:
    s = str(v or '').strip().replace(',', '')
    if not s:
        return 0
    try:
        return int(float(s))
    except Exception:
        return 0


def _to_float(v: str) -> float:
    s = str(v or '').strip().replace(',', '')
    if not s:
        return 0.0
    try:
        return float(s)
    except Exception:
        return 0.0


def _to_record(row: dict) -> dict | None:
    country = _pick(row, 'Country', '站点', '国家').upper()
    asin = _pick(row, 'ASIN', 'Asin').upper()
    if not country or not asin or country == 'COUNTRY' or asin == 'ASIN':
        return None

    return {
        'country': country,
        'asin': asin,
        'sellable_stock': _to_int(_pick(row, 'Sellable', '可售库存')),
        'inbound_stock': _to_int(_pick(row, 'Inbound', '在途')),
        'reserved_stock': _to_int(_pick(row, 'Reserved', '预留')),
        'avg_daily_sales': _to_float(_pick(row, 'AvgDailySales', '日均销量')),
        'sales_7d': _to_int(_pick(row, 'Sales7d', '7天销量')),
        'sales_14d': _to_int(_pick(row, 'Sales14d', '14天销量')),
        'sales_30d': _to_int(_pick(row, 'Sales30d', '30天销量')),
        'suggested_replenishment': _to_int(_pick(row, 'SuggestedReplenishment', '建议补货数量')),
        'note': _pick(row, 'Note', 'Notes', '备注'),
    }


def sync_inventory_items() -> dict:
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
                'SELECT id FROM inventory_items WHERE country = ? AND asin = ?',
                (rec['country'], rec['asin']),
            ).fetchone()
            if row:
                conn.execute(
                    '''
                    UPDATE inventory_items
                    SET sellable_stock = ?, inbound_stock = ?, reserved_stock = ?, avg_daily_sales = ?,
                        sales_7d = ?, sales_14d = ?, sales_30d = ?, suggested_replenishment = ?, note = ?, updated_at = ?
                    WHERE id = ?
                    ''',
                    (
                        rec['sellable_stock'],
                        rec['inbound_stock'],
                        rec['reserved_stock'],
                        rec['avg_daily_sales'],
                        rec['sales_7d'],
                        rec['sales_14d'],
                        rec['sales_30d'],
                        rec['suggested_replenishment'],
                        rec['note'],
                        now,
                        row['id'],
                    ),
                )
                updated += 1
            else:
                conn.execute(
                    '''
                    INSERT INTO inventory_items (
                      country, asin, sellable_stock, inbound_stock, reserved_stock,
                      avg_daily_sales, sales_7d, sales_14d, sales_30d, suggested_replenishment,
                      note, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        rec['country'],
                        rec['asin'],
                        rec['sellable_stock'],
                        rec['inbound_stock'],
                        rec['reserved_stock'],
                        rec['avg_daily_sales'],
                        rec['sales_7d'],
                        rec['sales_14d'],
                        rec['sales_30d'],
                        rec['suggested_replenishment'],
                        rec['note'],
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
    logger.info('inventory sync done: %s', result)
    return result


if __name__ == '__main__':
    out = sync_inventory_items()
    logger.info('done: %s', out)
