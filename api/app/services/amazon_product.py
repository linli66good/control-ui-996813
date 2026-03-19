from __future__ import annotations

import json
import re
from dataclasses import dataclass
from html import unescape
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener

TIMEOUT_SECONDS = 20

COUNTRY_DOMAIN_MAP = {
    'US': 'www.amazon.com',
    'CA': 'www.amazon.ca',
    'MX': 'www.amazon.com.mx',
    'UK': 'www.amazon.co.uk',
    'DE': 'www.amazon.de',
    'FR': 'www.amazon.fr',
    'IT': 'www.amazon.it',
    'ES': 'www.amazon.es',
    'NL': 'www.amazon.nl',
    'SE': 'www.amazon.se',
    'PL': 'www.amazon.pl',
    'BE': 'www.amazon.com.be',
    'JP': 'www.amazon.co.jp',
    'SG': 'www.amazon.sg',
    'AE': 'www.amazon.ae',
    'SA': 'www.amazon.sa',
    'AU': 'www.amazon.com.au',
    'IN': 'www.amazon.in',
    'BR': 'www.amazon.com.br',
}

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
}


@dataclass
class ProductSnapshot:
    country: str
    asin: str
    product_url: str
    title: str
    price_text: str
    main_image_url: str
    bullets: list[str]
    a_plus_text: str
    description: str
    raw_payload: dict[str, Any]


class ProductFetchError(RuntimeError):
    pass


def build_product_url(country: str, asin: str) -> str:
    domain = COUNTRY_DOMAIN_MAP.get(country.upper(), 'www.amazon.com')
    return f'https://{domain}/dp/{asin.upper()}'


def build_mirror_url(product_url: str) -> str:
    return f'https://r.jina.ai/http://{product_url.removeprefix("https://").removeprefix("http://")}'


def _opener():
    return build_opener()


def _open_text(url: str) -> str:
    req = Request(url, headers=HEADERS)
    try:
        with _opener().open(req, timeout=TIMEOUT_SECONDS) as resp:
            charset = resp.headers.get_content_charset() or 'utf-8'
            return resp.read().decode(charset, errors='ignore')
    except HTTPError as e:
        body = ''
        try:
            body = e.read().decode('utf-8', errors='ignore')
        except Exception:
            body = ''
        raise ProductFetchError(f'http_error:{e.code}:{body[:200]}') from e
    except URLError as e:
        raise ProductFetchError(f'url_error:{e.reason}') from e
    except Exception as e:
        raise ProductFetchError(str(e)) from e


def fetch_html(url: str) -> str:
    return _open_text(url)


def fetch_mirror_markdown(product_url: str) -> str:
    return _open_text(build_mirror_url(product_url))


TAG_RE = re.compile(r'<[^>]+>')
WS_RE = re.compile(r'\s+')
SCRIPT_RE = re.compile(r'<script\b[^>]*>.*?</script>', re.I | re.S)
STYLE_RE = re.compile(r'<style\b[^>]*>.*?</style>', re.I | re.S)
COMMENT_RE = re.compile(r'<!--.*?-->', re.S)


def clean_text(value: str) -> str:
    if not value:
        return ''
    value = unescape(value)
    value = value.replace('\xa0', ' ')
    value = TAG_RE.sub(' ', value)
    value = WS_RE.sub(' ', value)
    return value.strip()


def clean_markdown_text(value: str) -> str:
    if not value:
        return ''
    value = unescape(value)
    value = value.replace('\xa0', ' ')
    value = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', value)
    value = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', value)
    value = re.sub(r'^[#>*\-\s]+', '', value)
    value = WS_RE.sub(' ', value)
    return value.strip()


def strip_noise_html(html: str) -> str:
    html = SCRIPT_RE.sub(' ', html)
    html = STYLE_RE.sub(' ', html)
    html = COMMENT_RE.sub(' ', html)
    return html


def is_blocked_html(html: str) -> bool:
    lowered = html.lower()
    signals = [
        'api-services-support@amazon.com',
        'validatecaptcha',
        'captcha',
        'click the button below to continue shopping',
        'automated access to amazon data',
    ]
    return any(sig in lowered for sig in signals)


def first_match(html: str, patterns: list[str]) -> str:
    for pattern in patterns:
        m = re.search(pattern, html, re.I | re.S)
        if m:
            return clean_text(m.group(1))
    return ''


def all_matches(html: str, patterns: list[str], limit: int = 8) -> list[str]:
    out: list[str] = []
    for pattern in patterns:
        for m in re.finditer(pattern, html, re.I | re.S):
            txt = clean_text(m.group(1))
            if not txt:
                continue
            if txt in out:
                continue
            out.append(txt)
            if len(out) >= limit:
                return out
    return out


def extract_title(html: str) -> str:
    return first_match(
        html,
        [
            r'<span[^>]+id=["\']productTitle["\'][^>]*>(.*?)</span>',
            r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\'](.*?)["\']',
            r'<title>(.*?)</title>',
        ],
    )


def extract_price(html: str) -> str:
    return first_match(
        html,
        [
            r'<span[^>]+class=["\'][^"\']*a-offscreen[^"\']*["\'][^>]*>(.*?)</span>',
            r'<span[^>]+id=["\']priceblock_ourprice["\'][^>]*>(.*?)</span>',
            r'<span[^>]+id=["\']priceblock_dealprice["\'][^>]*>(.*?)</span>',
            r'"priceAmount"\s*:\s*"([^"]+)"',
        ],
    )


def extract_image(html: str) -> str:
    return first_match(
        html,
        [
            r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](.*?)["\']',
            r'"large":"(https:[^"\\]+)"',
            r'<img[^>]+id=["\']landingImage["\'][^>]+src=["\'](.*?)["\']',
        ],
    )


def extract_bullets(html: str) -> list[str]:
    bullets = all_matches(
        html,
        [
            r'<li[^>]*><span[^>]*class=["\'][^"\']*a-list-item[^"\']*["\'][^>]*>(.*?)</span></li>',
            r'<span[^>]+class=["\'][^"\']*a-list-item[^"\']*["\'][^>]*>(.*?)</span>',
        ],
        limit=12,
    )
    cleaned: list[str] = []
    for bullet in bullets:
        if len(bullet) < 8:
            continue
        if bullet.lower().startswith('make sure'):
            continue
        if bullet in cleaned:
            continue
        cleaned.append(bullet)
        if len(cleaned) >= 6:
            break
    return cleaned


def extract_aplus(html: str) -> str:
    sections = all_matches(
        html,
        [
            r'<div[^>]+id=["\']aplus["\'][^>]*>(.*?)</div>\s*</div>',
            r'<div[^>]+id=["\']productDescription["\'][^>]*>(.*?)</div>',
        ],
        limit=2,
    )
    text = ' '.join(sections)
    return clean_text(text)[:2000]


def extract_description(html: str) -> str:
    desc = first_match(
        html,
        [
            r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']',
            r'<div[^>]+id=["\']productDescription["\'][^>]*>(.*?)</div>',
        ],
    )
    return desc[:1200]


def _extract_markdown_title(markdown: str) -> str:
    m = re.search(r'^Title:\s*(.+)$', markdown, re.M)
    if m:
        return clean_markdown_text(m.group(1))
    m = re.search(r'^#\s+(.+)$', markdown, re.M)
    if m:
        return clean_markdown_text(m.group(1))
    return ''


def _extract_markdown_price(markdown: str) -> str:
    m = re.search(r'([$€£¥]\s?\d[\d,]*(?:\.\d{2})?)', markdown)
    return clean_markdown_text(m.group(1)) if m else ''


def _extract_markdown_bullets(markdown: str) -> list[str]:
    lines = markdown.splitlines()
    capture = False
    bullets: list[str] = []
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        lower = line.lower()
        if 'about this item' in lower or 'product details' in lower:
            capture = True
            continue
        if capture and line.startswith('## '):
            break
        if capture and line.startswith('*'):
            text = clean_markdown_text(line)
            if len(text) >= 12 and text not in bullets and 'http' not in text.lower():
                bullets.append(text)
            if len(bullets) >= 6:
                break
    return bullets


def _extract_markdown_description(markdown: str) -> str:
    lines = markdown.splitlines()
    keep: list[str] = []
    started = False
    for raw in lines:
        line = clean_markdown_text(raw)
        if not line:
            continue
        lower = line.lower()
        if line.startswith('## ') and any(k in lower for k in ['main content', 'about this item', 'product details']):
            started = True
            continue
        if started and line.startswith('## '):
            break
        if started and len(line) > 20 and 'http' not in line.lower():
            keep.append(line)
        if len(' '.join(keep)) > 800:
            break
    return ' '.join(keep)[:1200]


def _extract_mirror_snapshot(country: str, asin: str, product_url: str) -> ProductSnapshot:
    markdown = fetch_mirror_markdown(product_url)
    title = _extract_markdown_title(markdown)
    if not title:
        raise ProductFetchError('mirror_title_not_found')
    price_text = _extract_markdown_price(markdown)
    bullets = _extract_markdown_bullets(markdown)
    description = _extract_markdown_description(markdown)
    raw_payload = {
        'country': country.upper(),
        'asin': asin.upper(),
        'product_url': product_url,
        'title': title,
        'price_text': price_text,
        'main_image_url': '',
        'bullets': bullets,
        'a_plus_text': '',
        'description': description,
        'source_mode': 'mirror_markdown',
    }
    return ProductSnapshot(
        country=country.upper(),
        asin=asin.upper(),
        product_url=product_url,
        title=title,
        price_text=price_text,
        main_image_url='',
        bullets=bullets,
        a_plus_text='',
        description=description,
        raw_payload=raw_payload,
    )


def extract_snapshot(country: str, asin: str) -> ProductSnapshot:
    url = build_product_url(country, asin)
    html = fetch_html(url)
    html = strip_noise_html(html)

    if is_blocked_html(html):
        return _extract_mirror_snapshot(country, asin, url)

    title = extract_title(html)
    price_text = extract_price(html)
    main_image_url = extract_image(html)
    bullets = extract_bullets(html)
    a_plus_text = extract_aplus(html)
    description = extract_description(html)

    if not title or title.strip().lower() == 'amazon.com':
        return _extract_mirror_snapshot(country, asin, url)

    payload = {
        'country': country.upper(),
        'asin': asin.upper(),
        'product_url': url,
        'title': title,
        'price_text': price_text,
        'main_image_url': main_image_url,
        'bullets': bullets,
        'a_plus_text': a_plus_text,
        'description': description,
        'source_mode': 'direct_html',
    }
    return ProductSnapshot(
        country=country.upper(),
        asin=asin.upper(),
        product_url=url,
        title=title,
        price_text=price_text,
        main_image_url=main_image_url,
        bullets=bullets,
        a_plus_text=a_plus_text,
        description=description,
        raw_payload=payload,
    )


def compare_snapshot(previous: dict[str, Any] | None, current: ProductSnapshot) -> list[str]:
    changed: list[str] = []
    if not previous:
        return ['first_capture']

    checks = {
        'price': (previous.get('price_text') or '').strip(),
        'title': (previous.get('title') or '').strip(),
        'main_image': (previous.get('main_image_url') or '').strip(),
        'a_plus': (previous.get('a_plus_text') or '').strip(),
        'bullets': ' | '.join(previous.get('bullets') or []),
    }
    current_checks = {
        'price': (current.price_text or '').strip(),
        'title': (current.title or '').strip(),
        'main_image': (current.main_image_url or '').strip(),
        'a_plus': (current.a_plus_text or '').strip(),
        'bullets': ' | '.join(current.bullets or []),
    }
    for key, prev_val in checks.items():
        if prev_val != current_checks[key]:
            changed.append(key)
    return changed or ['no_visible_change']


def build_analysis_report(snapshot: ProductSnapshot, note: str | None = None) -> str:
    bullets = snapshot.bullets[:5]
    bullet_text = '\n'.join(f'- {b}' for b in bullets) if bullets else '- 暂未稳定提取到卖点要点'
    aplus_summary = snapshot.a_plus_text[:500] if snapshot.a_plus_text else '暂无明显 A+ 文本提取结果'
    desc_summary = snapshot.description[:400] if snapshot.description else '暂无明显描述文本提取结果'

    price_line = snapshot.price_text or '未稳定提取到价格'
    title_line = snapshot.title or '未稳定提取到标题'
    source_mode = snapshot.raw_payload.get('source_mode', 'unknown')

    return f'''# {snapshot.country} / {snapshot.asin} 竞品分析报告

## 1. 页面基础信息
- 链接：{snapshot.product_url}
- 标题：{title_line}
- 价格：{price_line}
- 主图：{snapshot.main_image_url or '未提取'}
- 抓取模式：{source_mode}

## 2. 核心卖点提炼
{bullet_text}

## 3. 页面表达观察
- 标题观察：当前标题更偏向 {('长尾关键词覆盖' if len(title_line) >= 80 else '简洁主卖点表达')}。
- 描述观察：{desc_summary}
- A+观察：{aplus_summary}

## 4. 可执行对比建议
- 先对比这条竞品的标题结构、主图表达、核心卖点顺序是否与你当前商品重叠。
- 如果对方价格可稳定提取，优先把它放进价格带对比；如果价格抓不到，说明页面结构不稳定，后续要补更强抓取方式。
- 重点检查 bullets 中是否反复出现同一类功能词、材质词、场景词，这通常就是它当前主打的转化方向。
- 如果 A+ 文本较多，说明它更强调品牌讲述或教育式转化，可以继续补抓模块做更深拆解。

## 5. 风险与限制
- 当前版本基于公开商品页做轻量抓取，不保证拿到完整评论、销量、BSR、广告位等数据。
- Amazon 页面存在地区、语言、风控、动态结构差异，个别字段可能抓不到或抓偏。
- 更深层的关键词/评论/排名分析，后续要补独立数据源或更稳定采集器。

## 6. 备注
- note: {note or ''}
'''


def snapshot_to_json(snapshot: ProductSnapshot) -> str:
    return json.dumps(snapshot.raw_payload, ensure_ascii=False)
