from datetime import datetime
from pathlib import Path
import sys

from fastapi import APIRouter

from ..db.sqlite import connect

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from workers.inventory.sync_inventory_items import sync_inventory_items

router = APIRouter(prefix='/v1/inventory', tags=['inventory'])


def _today_str() -> str:
    return datetime.now().strftime('%Y-%m-%d')


def _risk_level(item: dict) -> str:
    sellable = int(item.get('sellable_stock') or 0)
    inbound = int(item.get('inbound_stock') or 0)
    avg_daily_sales = float(item.get('avg_daily_sales') or 0)
    total_cover = sellable + inbound
    if avg_daily_sales <= 0:
        return '待补销量'
    days = total_cover / avg_daily_sales if avg_daily_sales > 0 else 0
    if sellable <= 0:
        return '缺货'
    if days < 7:
        return '高风险'
    if days < 14:
        return '关注'
    return '正常'


def _row_to_item(row) -> dict:
    item = {
        'id': row['id'],
        'country': row['country'],
        'asin': row['asin'],
        'sellable_stock': row['sellable_stock'] or 0,
        'inbound_stock': row['inbound_stock'] or 0,
        'reserved_stock': row['reserved_stock'] or 0,
        'avg_daily_sales': row['avg_daily_sales'] or 0,
        'sales_7d': row['sales_7d'] or 0,
        'sales_14d': row['sales_14d'] or 0,
        'sales_30d': row['sales_30d'] or 0,
        'suggested_replenishment': row['suggested_replenishment'] or 0,
        'note': row['note'] or '',
        'created_at': row['created_at'],
        'updated_at': row['updated_at'],
    }
    item['risk_level'] = _risk_level(item)
    return item


@router.get('/list')
def get_list(page: int = 1, page_size: int = 50, country: str | None = None):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)

    where = []
    params: list[object] = []
    if country:
        where.append('country = ?')
        params.append(country.upper())
    where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''

    with connect() as conn:
        total = conn.execute(f'SELECT COUNT(1) FROM inventory_items {where_sql}', params).fetchone()[0]
        rows = conn.execute(
            f'''
            SELECT *
            FROM inventory_items
            {where_sql}
            ORDER BY country ASC, updated_at DESC, id DESC
            LIMIT ? OFFSET ?
            ''',
            [*params, page_size, (page - 1) * page_size],
        ).fetchall()

    items = [_row_to_item(r) for r in rows]
    return {
        'ok': True,
        'message': 'ok',
        'data': {'items': items},
        'meta': {'page': page, 'page_size': page_size, 'total': total, 'country': country},
    }


@router.post('/sync')
def sync_now():
    result = sync_inventory_items()
    return {
        'ok': True,
        'message': 'inventory sync completed',
        'data': result,
        'meta': {'date': _today_str()},
    }
