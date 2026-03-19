from datetime import datetime
import json

from fastapi import APIRouter
from pydantic import BaseModel

from ..db.sqlite import connect
from ..services.amazon_product import ProductFetchError, compare_snapshot, extract_snapshot, snapshot_to_json

router = APIRouter(prefix='/v1/monitor', tags=['monitor'])


class MonitorCreateReq(BaseModel):
    country: str
    asin: str
    note: str | None = None


class MonitorRunReq(BaseModel):
    target_id: int


def _now() -> str:
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def _latest_payload(conn, target_id: int) -> dict:
    row = conn.execute(
        '''
        SELECT raw_payload FROM monitor_snapshots
        WHERE target_id = ?
        ORDER BY captured_at DESC, id DESC
        LIMIT 1
        ''',
        (target_id,),
    ).fetchone()
    if not row or not row['raw_payload']:
        return {}
    try:
        return json.loads(row['raw_payload'])
    except Exception:
        return {}


@router.get('/list')
def get_list():
    with connect() as conn:
        rows = conn.execute(
            '''
            SELECT t.*, s.price_text, s.title AS latest_title, s.captured_at AS latest_captured_at
            FROM monitor_targets t
            LEFT JOIN monitor_snapshots s
              ON s.id = (
                SELECT s2.id FROM monitor_snapshots s2
                WHERE s2.target_id = t.id
                ORDER BY s2.captured_at DESC, s2.id DESC
                LIMIT 1
              )
            ORDER BY t.updated_at DESC, t.id DESC
            '''
        ).fetchall()
    return {'ok': True, 'message': 'ok', 'data': {'items': [dict(r) for r in rows]}, 'meta': {'total': len(rows)}}


@router.post('/create')
def create_target(req: MonitorCreateReq):
    now = _now()
    country = req.country.upper()
    asin = req.asin.upper()
    with connect() as conn:
        conn.execute(
            '''
            INSERT INTO monitor_targets (country, asin, enabled, note, created_at, updated_at)
            VALUES (?, ?, 1, ?, ?, ?)
            ON CONFLICT(country, asin) DO UPDATE SET
              note = excluded.note,
              enabled = 1,
              updated_at = excluded.updated_at
            ''',
            (country, asin, req.note or '', now, now),
        )
        row = conn.execute(
            'SELECT * FROM monitor_targets WHERE country = ? AND asin = ?',
            (country, asin),
        ).fetchone()
    return {'ok': True, 'message': 'monitor target created', 'data': dict(row), 'meta': {}}


@router.post('/delete')
def delete_target(target_id: int):
    with connect() as conn:
        conn.execute('DELETE FROM monitor_snapshots WHERE target_id = ?', (target_id,))
        conn.execute('DELETE FROM monitor_targets WHERE id = ?', (target_id,))
    return {'ok': True, 'message': 'monitor target deleted', 'data': {'id': target_id}, 'meta': {}}


@router.post('/run')
def run_target(req: MonitorRunReq):
    now = _now()
    with connect() as conn:
        target = conn.execute('SELECT * FROM monitor_targets WHERE id = ?', (req.target_id,)).fetchone()
        if not target:
            return {'ok': False, 'message': 'target not found', 'data': None, 'meta': {}}

        previous_payload = _latest_payload(conn, req.target_id)
        country = target['country']
        asin = target['asin']

        try:
            snapshot = extract_snapshot(country, asin)
            changed_fields = compare_snapshot(previous_payload, snapshot)
            raw_payload = snapshot.raw_payload | {'changed_fields': changed_fields}
            conn.execute(
                '''
                INSERT INTO monitor_snapshots (
                  target_id, price_text, title, main_image_url, a_plus_text, changed_fields, raw_payload, captured_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    req.target_id,
                    snapshot.price_text,
                    snapshot.title,
                    snapshot.main_image_url,
                    snapshot.a_plus_text,
                    ','.join(changed_fields),
                    json.dumps(raw_payload, ensure_ascii=False),
                    now,
                ),
            )
            conn.execute('UPDATE monitor_targets SET updated_at = ? WHERE id = ?', (now, req.target_id))
            return {
                'ok': True,
                'message': 'monitor snapshot captured',
                'data': {
                    'target_id': req.target_id,
                    'status': 'done',
                    'changed_fields': changed_fields,
                    'title': snapshot.title,
                    'price_text': snapshot.price_text,
                },
                'meta': {},
            }
        except ProductFetchError as e:
            conn.execute(
                '''
                INSERT INTO monitor_snapshots (
                  target_id, price_text, title, main_image_url, a_plus_text, changed_fields, raw_payload, captured_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    req.target_id,
                    '',
                    f'{country} / {asin} capture failed',
                    '',
                    '',
                    'fetch_error',
                    json.dumps({'error': str(e), 'country': country, 'asin': asin}, ensure_ascii=False),
                    now,
                ),
            )
            conn.execute('UPDATE monitor_targets SET updated_at = ? WHERE id = ?', (now, req.target_id))
            return {
                'ok': False,
                'message': f'capture failed: {e}',
                'data': {'target_id': req.target_id, 'status': 'failed'},
                'meta': {},
            }


@router.get('/{target_id}')
def get_detail(target_id: int):
    with connect() as conn:
        target = conn.execute('SELECT * FROM monitor_targets WHERE id = ?', (target_id,)).fetchone()
        latest = conn.execute(
            '''
            SELECT * FROM monitor_snapshots
            WHERE target_id = ?
            ORDER BY captured_at DESC, id DESC
            LIMIT 1
            ''',
            (target_id,),
        ).fetchone()
    return {
        'ok': True,
        'message': 'ok',
        'data': {
            'target': dict(target) if target else None,
            'latest_snapshot': dict(latest) if latest else None,
        },
        'meta': {},
    }


@router.get('/{target_id}/snapshots')
def get_snapshots(target_id: int):
    with connect() as conn:
        rows = conn.execute(
            '''
            SELECT * FROM monitor_snapshots
            WHERE target_id = ?
            ORDER BY captured_at DESC, id DESC
            ''',
            (target_id,),
        ).fetchall()
    return {'ok': True, 'message': 'ok', 'data': {'items': [dict(r) for r in rows]}, 'meta': {'target_id': target_id, 'total': len(rows)}}
