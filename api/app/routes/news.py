from datetime import datetime

from fastapi import APIRouter

from ..db.sqlite import connect
from workers.news.build_daily_news import build_daily_news

router = APIRouter(prefix='/v1/news', tags=['news'])


def _today_str() -> str:
    return datetime.now().strftime('%Y-%m-%d')


def _row_to_news(row) -> dict:
    return {
        'id': row['id'],
        'news_date': row['news_date'],
        'news_type': row['news_type'],
        'title': row['title'],
        'source': row['source'] or '',
        'source_url': row['source_url'],
        'summary': row['summary'] or '',
        'content': row['content'] or '',
        'sort_order': row['sort_order'] or 0,
        'created_at': row['created_at'],
        'updated_at': row['updated_at'],
    }


@router.get('/daily')
def get_daily(date: str | None = None):
    news_date = date or _today_str()
    with connect() as conn:
        rows = conn.execute(
            '''
            SELECT *
            FROM news_items
            WHERE news_date = ?
            ORDER BY news_type, sort_order DESC, id DESC
            ''',
            (news_date,),
        ).fetchall()

    amazon = []
    ai = []
    other = []
    for r in rows:
        item = _row_to_news(r)
        if item['news_type'] == 'amazon':
            amazon.append(item)
        elif item['news_type'] == 'ai':
            ai.append(item)
        else:
            other.append(item)

    return {
        'ok': True,
        'message': 'ok',
        'data': {'date': news_date, 'amazon': amazon, 'ai': ai, 'other': other},
        'meta': {'amazon_count': len(amazon), 'ai_count': len(ai), 'other_count': len(other)},
    }


@router.get('/list')
def get_list(page: int = 1, page_size: int = 20, news_type: str | None = None, date: str | None = None):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    where = []
    params: list[object] = []
    if news_type:
        where.append('news_type = ?')
        params.append(news_type)
    if date:
        where.append('news_date = ?')
        params.append(date)
    where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''

    with connect() as conn:
        total = conn.execute(f'SELECT COUNT(1) FROM news_items {where_sql}', params).fetchone()[0]
        rows = conn.execute(
            f'''
            SELECT *
            FROM news_items
            {where_sql}
            ORDER BY news_date DESC, sort_order DESC, id DESC
            LIMIT ? OFFSET ?
            ''',
            [*params, page_size, (page - 1) * page_size],
        ).fetchall()

    items = [_row_to_news(r) for r in rows]
    return {
        'ok': True,
        'message': 'ok',
        'data': {'items': items},
        'meta': {'page': page, 'page_size': page_size, 'total': total, 'type': news_type, 'date': date},
    }


@router.post('/refresh')
def refresh_news():
    result = build_daily_news()
    return {
        'ok': True,
        'message': 'daily news sync completed',
        'data': result,
        'meta': {},
    }
