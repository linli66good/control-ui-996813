from __future__ import annotations

from pathlib import Path
import argparse
import json
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workers.common.db import connect  # noqa: E402
from workers.common.helpers import now_iso  # noqa: E402
from workers.common.logger import get_logger  # noqa: E402
from workers.common.notify import build_monitor_message, send_feishu_webhook, should_notify  # noqa: E402
from api.app.services.amazon_product import ProductFetchError, compare_snapshot, extract_snapshot  # noqa: E402

logger = get_logger('scan_targets')


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


def _insert_snapshot(conn, *, target_id: int, now: str, price_text: str, title: str, main_image_url: str, a_plus_text: str, changed_fields: list[str] | str, raw_payload: dict) -> None:
    changed = changed_fields if isinstance(changed_fields, str) else ','.join(changed_fields)
    conn.execute(
        '''
        INSERT INTO monitor_snapshots (
          target_id, price_text, title, main_image_url, a_plus_text, changed_fields, raw_payload, captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        (
            target_id,
            price_text,
            title,
            main_image_url,
            a_plus_text,
            changed,
            json.dumps(raw_payload, ensure_ascii=False),
            now,
        ),
    )
    conn.execute('UPDATE monitor_targets SET updated_at = ? WHERE id = ?', (now, target_id))


def _notify_if_needed(row, *, changed_fields: list[str] | str, title: str, price_text: str, product_url: str, error: str = '') -> bool:
    if not should_notify(notify_enabled=row['notify_enabled'], changed_fields=changed_fields):
        return False
    text = build_monitor_message(
        country=str(row['country'] or '').upper(),
        asin=str(row['asin'] or '').upper(),
        note=str(row['note'] or ''),
        changed_fields=changed_fields,
        title=title,
        price_text=price_text,
        product_url=product_url,
        error=error,
    )
    try:
        ok = send_feishu_webhook(text)
        logger.info('monitor notify sent=%s target_id=%s', ok, row['id'])
        return ok
    except Exception as e:
        logger.warning('monitor notify failed target_id=%s err=%s', row['id'], e)
        return False


def scan_target(conn, row) -> dict:
    target_id = int(row['id'])
    country = str(row['country'] or '').upper()
    asin = str(row['asin'] or '').upper()
    note = str(row['note'] or '')
    now = now_iso()
    previous_payload = _latest_payload(conn, target_id)

    try:
        snapshot = extract_snapshot(country, asin)
        changed_fields = compare_snapshot(previous_payload, snapshot)
        raw_payload = snapshot.raw_payload | {'changed_fields': changed_fields, 'target_note': note}
        _insert_snapshot(
            conn,
            target_id=target_id,
            now=now,
            price_text=snapshot.price_text,
            title=snapshot.title,
            main_image_url=snapshot.main_image_url,
            a_plus_text=snapshot.a_plus_text,
            changed_fields=changed_fields,
            raw_payload=raw_payload,
        )
        notified = _notify_if_needed(
            row,
            changed_fields=changed_fields,
            title=snapshot.title,
            price_text=snapshot.price_text,
            product_url=snapshot.product_url,
        )
        result = {
            'target_id': target_id,
            'country': country,
            'asin': asin,
            'ok': True,
            'status': 'done',
            'changed_fields': changed_fields,
            'title': snapshot.title,
            'price_text': snapshot.price_text,
            'source_mode': snapshot.raw_payload.get('source_mode', ''),
            'notified': notified,
        }
        logger.info('monitor target scanned: %s', result)
        return result
    except ProductFetchError as e:
        raw_payload = {'error': str(e), 'country': country, 'asin': asin, 'target_note': note}
        _insert_snapshot(
            conn,
            target_id=target_id,
            now=now,
            price_text='',
            title=f'{country} / {asin} capture failed',
            main_image_url='',
            a_plus_text='',
            changed_fields='fetch_error',
            raw_payload=raw_payload,
        )
        notified = _notify_if_needed(
            row,
            changed_fields='fetch_error',
            title=f'{country} / {asin} capture failed',
            price_text='',
            product_url='',
            error=str(e),
        )
        result = {
            'target_id': target_id,
            'country': country,
            'asin': asin,
            'ok': False,
            'status': 'failed',
            'error': str(e),
            'notified': notified,
        }
        logger.warning('monitor target scan failed: %s', result)
        return result


def run_scan(target_id: int | None = None, only_enabled: bool = True) -> dict:
    where = []
    params: list[object] = []
    if only_enabled:
        where.append('enabled = 1')
    if target_id is not None:
        where.append('id = ?')
        params.append(target_id)
    where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''

    with connect() as conn:
        rows = conn.execute(
            f'''
            SELECT * FROM monitor_targets
            {where_sql}
            ORDER BY updated_at ASC, id ASC
            ''',
            params,
        ).fetchall()

        results = [scan_target(conn, row) for row in rows]

    summary = {
        'total_targets': len(rows),
        'success': sum(1 for x in results if x.get('ok')),
        'failed': sum(1 for x in results if not x.get('ok')),
        'notified': sum(1 for x in results if x.get('notified')),
        'results': results,
    }
    logger.info('monitor batch scan done: %s', {
        'total_targets': summary['total_targets'],
        'success': summary['success'],
        'failed': summary['failed'],
        'notified': summary['notified'],
    })
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scan enabled monitor targets and persist snapshots.')
    parser.add_argument('--target-id', type=int, default=None, help='Only scan one monitor target id')
    parser.add_argument('--all', action='store_true', help='Include disabled targets too')
    args = parser.parse_args()

    out = run_scan(target_id=args.target_id, only_enabled=not args.all)
    logger.info('done: %s', out)
    print(json.dumps(out, ensure_ascii=False, indent=2))
