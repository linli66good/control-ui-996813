import os
from pathlib import Path

from fastapi import APIRouter

from ..db.sqlite import DB_PATH, connect

router = APIRouter(prefix='/v1/system', tags=['system'])


@router.get('/health')
def health():
    return {'ok': True, 'message': 'ok', 'data': {'service': 'api'}, 'meta': {}}


@router.get('/status')
def status():
    db_exists = Path(DB_PATH).exists()
    learn_sync_at = None
    news_sync_at = None
    monitor_scan_at = None
    analysis_at = None
    monitor_count = 0
    monitor_enabled_count = 0

    with connect() as conn:
        learn_sync_at = conn.execute('SELECT MAX(updated_at) FROM learn_cards').fetchone()[0]
        news_sync_at = conn.execute('SELECT MAX(updated_at) FROM news_items').fetchone()[0]
        monitor_scan_at = conn.execute('SELECT MAX(captured_at) FROM monitor_snapshots').fetchone()[0]
        analysis_at = conn.execute('SELECT MAX(updated_at) FROM analysis_reports').fetchone()[0]
        monitor_count = conn.execute('SELECT COUNT(1) FROM monitor_targets').fetchone()[0]
        monitor_enabled_count = conn.execute('SELECT COUNT(1) FROM monitor_targets WHERE enabled = 1').fetchone()[0]

    return {
        'ok': True,
        'message': 'ok',
        'data': {
            'api_ok': True,
            'db_path': str(DB_PATH),
            'db_exists': db_exists,
            'sheet_id_configured': bool(os.environ.get('SHEET_ID')),
            'api_shared_secret_configured': bool(os.environ.get('API_SHARED_SECRET')),
            'feishu_monitor_webhook_configured': bool(os.environ.get('FEISHU_MONITOR_WEBHOOK')),
            'learn_last_sync_at': learn_sync_at,
            'news_last_sync_at': news_sync_at,
            'monitor_last_scan_at': monitor_scan_at,
            'analysis_last_report_at': analysis_at,
            'monitor_target_total': monitor_count,
            'monitor_target_enabled': monitor_enabled_count,
            'api_base_hint': 'https://api.996813.xyz',
            'app_base_hint': 'https://app.996813.xyz',
        },
        'meta': {},
    }
