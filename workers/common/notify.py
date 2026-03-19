from __future__ import annotations

import json
import os
from urllib.request import Request, urlopen

TIMEOUT_SECONDS = 10
NOTIFY_FIELDS = {'fetch_error', 'price', 'title', 'main_image'}


def parse_changed_fields(changed_fields: str | list[str] | None) -> list[str]:
    if isinstance(changed_fields, list):
        return [str(x).strip() for x in changed_fields if str(x).strip()]
    return [x.strip() for x in str(changed_fields or '').split(',') if x.strip()]


def should_notify(*, notify_enabled: int | bool, changed_fields: str | list[str] | None) -> bool:
    if not bool(notify_enabled):
        return False
    fields = set(parse_changed_fields(changed_fields))
    return bool(fields & NOTIFY_FIELDS)


def build_monitor_message(*, country: str, asin: str, note: str, changed_fields: str | list[str] | None, title: str, price_text: str, product_url: str, error: str) -> str:
    fields = parse_changed_fields(changed_fields)
    field_text = '、'.join(fields) if fields else '无'
    return (
        '【Control-UI Monitor 提醒】\n'
        f'- 站点：{country}\n'
        f'- ASIN：{asin}\n'
        f'- 变化：{field_text}\n'
        f'- 标题：{title or "-"}\n'
        f'- 价格：{price_text or "-"}\n'
        f'- 链接：{product_url or "-"}\n'
        f'- 备注：{note or "-"}\n'
        f'- 错误：{error or "-"}'
    )


def send_feishu_webhook(text: str) -> bool:
    webhook = os.environ.get('FEISHU_MONITOR_WEBHOOK', '').strip()
    if not webhook:
        return False
    body = json.dumps({'msg_type': 'text', 'content': {'text': text}}, ensure_ascii=False).encode('utf-8')
    req = Request(webhook, data=body, headers={'Content-Type': 'application/json'}, method='POST')
    with urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        return 200 <= getattr(resp, 'status', 200) < 300
