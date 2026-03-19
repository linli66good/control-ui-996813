from datetime import datetime
from urllib.parse import urlparse

from fastapi import APIRouter

from ..db.sqlite import connect
from workers.learn.sync_learn_cards import sync_learn_cards

router = APIRouter(prefix='/v1/learn', tags=['learn'])


def _today_str() -> str:
    return datetime.now().strftime('%Y-%m-%d')


def _row_to_card(row) -> dict:
    market_feedback = row['market_feedback'] or ''
    return {
        'id': row['id'],
        'date': row['card_date'],
        'title': row['title'],
        'source_url': row['source_url'],
        'source_domain': row['source_domain'] or urlparse(row['source_url'] or '').netloc,
        'score': row['score'] or 0,
        'summary': row['summary'] or '',
        'content': row['content'] or '',
        'market_feedback': market_feedback,
        'final_view': row['final_view'] or '',
        'is_top3': bool(row['is_top3']),
        'created_at': row['created_at'],
        'updated_at': row['updated_at'],
    }


@router.get('/top3')
def get_top3(date: str | None = None):
    card_date = date or _today_str()
    with connect() as conn:
        rows = conn.execute(
            '''
            SELECT *
            FROM learn_cards
            WHERE card_date = ? AND is_top3 = 1
            ORDER BY score DESC, id DESC
            LIMIT 3
            ''',
            (card_date,),
        ).fetchall()
    items = [_row_to_card(r) for r in rows]
    return {
        'ok': True,
        'message': 'ok',
        'data': {
            'date': card_date,
            'items': items,
        },
        'meta': {'count': len(items)},
    }


@router.get('/list')
def get_list(page: int = 1, page_size: int = 20, date: str | None = None, keyword: str | None = None):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    where = []
    params: list[object] = []
    if date:
        where.append('card_date = ?')
        params.append(date)
    if keyword:
        where.append('(title LIKE ? OR summary LIKE ? OR content LIKE ? OR source_domain LIKE ?)')
        kw = f'%{keyword.strip()}%'
        params.extend([kw, kw, kw, kw])
    where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''

    with connect() as conn:
        total = conn.execute(f'SELECT COUNT(1) FROM learn_cards {where_sql}', params).fetchone()[0]
        rows = conn.execute(
            f'''
            SELECT *
            FROM learn_cards
            {where_sql}
            ORDER BY card_date DESC, score DESC, id DESC
            LIMIT ? OFFSET ?
            ''',
            [*params, page_size, (page - 1) * page_size],
        ).fetchall()
    items = [_row_to_card(r) for r in rows]
    return {
        'ok': True,
        'message': 'ok',
        'data': {'items': items},
        'meta': {'page': page, 'page_size': page_size, 'total': total},
    }


@router.get('/{item_id}')
def get_detail(item_id: int):
    with connect() as conn:
        row = conn.execute('SELECT * FROM learn_cards WHERE id = ?', (item_id,)).fetchone()
    if not row:
        return {'ok': False, 'message': 'not found', 'data': None, 'meta': {}}
    return {'ok': True, 'message': 'ok', 'data': _row_to_card(row), 'meta': {}}


@router.post('/generate-daily')
def generate_daily():
    result = sync_learn_cards()
    return {
        'ok': True,
        'message': 'daily learn sync completed',
        'data': result,
        'meta': {},
    }
