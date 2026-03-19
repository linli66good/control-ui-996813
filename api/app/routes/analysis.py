from datetime import datetime
import json

from fastapi import APIRouter
from pydantic import BaseModel

from ..db.sqlite import connect
from ..services.amazon_product import ProductFetchError, build_analysis_report, extract_snapshot

router = APIRouter(prefix='/v1/analysis', tags=['analysis'])


class AnalysisCreateReq(BaseModel):
    country: str
    asin: str
    note: str | None = None


def _now() -> str:
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


@router.post('/create')
def create_report(req: AnalysisCreateReq):
    now = _now()
    country = req.country.upper()
    asin = req.asin.upper()

    try:
        snapshot = extract_snapshot(country, asin)
        report_markdown = build_analysis_report(snapshot, req.note)
        payload = {
            'country': country,
            'asin': asin,
            'note': req.note or '',
            'product_url': snapshot.product_url,
            'title': snapshot.title,
            'price_text': snapshot.price_text,
            'main_image_url': snapshot.main_image_url,
            'bullets': snapshot.bullets,
            'a_plus_text': snapshot.a_plus_text,
            'description': snapshot.description,
            'source_mode': snapshot.raw_payload.get('source_mode', ''),
            'fetch_ok': True,
        }
        message = 'analysis created'
    except ProductFetchError as e:
        report_markdown = f'''# {country} / {asin} 竞品分析报告\n\n## 抓取状态\n- 当前未能完成真实抓取：{e}\n\n## 建议\n- 稍后重试\n- 更换站点/网络环境\n- 后续补更稳定采集器\n\n## 备注\n- note: {req.note or ''}\n'''
        payload = {
            'country': country,
            'asin': asin,
            'note': req.note or '',
            'fetch_ok': False,
            'error': str(e),
        }
        message = 'analysis created with fallback'

    with connect() as conn:
        cur = conn.execute(
            '''
            INSERT INTO analysis_reports (
              country, asin, input_payload, report_markdown, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (country, asin, json.dumps(payload, ensure_ascii=False), report_markdown, now, now),
        )
        report_id = cur.lastrowid
        row = conn.execute('SELECT * FROM analysis_reports WHERE id = ?', (report_id,)).fetchone()

    return {
        'ok': True,
        'message': message,
        'data': dict(row),
        'meta': {},
    }


@router.get('/list')
def get_list(page: int = 1, page_size: int = 20, country: str | None = None, asin: str | None = None):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    where = []
    params: list[object] = []
    if country:
        where.append('country = ?')
        params.append(country.upper())
    if asin:
        where.append('asin = ?')
        params.append(asin.upper())
    where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''

    with connect() as conn:
        total = conn.execute(f'SELECT COUNT(1) FROM analysis_reports {where_sql}', params).fetchone()[0]
        rows = conn.execute(
            f'''
            SELECT * FROM analysis_reports
            {where_sql}
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
            ''',
            [*params, page_size, (page - 1) * page_size],
        ).fetchall()

    return {
        'ok': True,
        'message': 'ok',
        'data': {'items': [dict(r) for r in rows]},
        'meta': {'page': page, 'page_size': page_size, 'total': total},
    }


@router.get('/{report_id}')
def get_detail(report_id: int):
    with connect() as conn:
        row = conn.execute('SELECT * FROM analysis_reports WHERE id = ?', (report_id,)).fetchone()
    return {'ok': True, 'message': 'ok', 'data': dict(row) if row else None, 'meta': {}}
