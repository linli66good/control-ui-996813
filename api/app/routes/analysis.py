from datetime import datetime
import json

from fastapi import APIRouter
from pydantic import BaseModel

from ..db.sqlite import connect

router = APIRouter(prefix='/v1/analysis', tags=['analysis'])


class AnalysisCreateReq(BaseModel):
    country: str
    asin: str
    note: str | None = None


def _now() -> str:
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def _mock_report(country: str, asin: str, note: str | None = None) -> str:
    return f'''# {country} / {asin} 竞品分析报告\n\n## 产品定位\n- 当前为骨架版报告，后续接入真实抓取与 AI 分析。\n- 建议先核对类目、价格带、核心卖点。\n\n## 差异化观察\n- 可重点比较图片表达、A+ 结构、评论关键词。\n- 可增加国家站点差异和本地化描述对比。\n\n## 风险与机会\n- 需要补足真实价格、评论、销量、关键词趋势数据。\n- 适合作为后续自动分析 worker 的落库目标。\n\n## 备注\n- note: {note or ''}\n'''


@router.post('/create')
def create_report(req: AnalysisCreateReq):
    now = _now()
    report_markdown = _mock_report(req.country, req.asin, req.note)
    payload = json.dumps(req.model_dump(), ensure_ascii=False)
    with connect() as conn:
        cur = conn.execute(
            '''
            INSERT INTO analysis_reports (
              country, asin, input_payload, report_markdown, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (req.country.upper(), req.asin.upper(), payload, report_markdown, now, now),
        )
        report_id = cur.lastrowid
        row = conn.execute('SELECT * FROM analysis_reports WHERE id = ?', (report_id,)).fetchone()

    return {
        'ok': True,
        'message': 'analysis created',
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
