# recent-hotspots/proxy_server.py
from flask import Flask, request, Response, send_from_directory
import requests
import re
from html import escape
from urllib.parse import quote

# Playwright 相關
from flask_cors import CORS
import markdown

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIRS = [
    os.path.join(BASE_DIR, 'recent-hotspots'),
    os.path.join(BASE_DIR, 'alerts'),
    os.path.join(BASE_DIR, 'images'),
]

app = Flask(__name__)
def _find_static_file(filename):
    for d in STATIC_DIRS:
        f = os.path.join(d, filename)
        if os.path.isfile(f):
            return d
    return None


# 支援靜態檔案 (html/css/js/png)，僅允許各自目錄
@app.route('/recent-hotspots/<path:filename>')
def serve_recent_hotspots(filename):
    d = os.path.join(BASE_DIR, 'recent-hotspots')
    abs_dir = os.path.abspath(d)
    abs_file = os.path.abspath(os.path.join(d, filename))
    if abs_file.startswith(abs_dir + os.sep) and os.path.isfile(abs_file):
        return send_from_directory(d, filename)
    return Response('Not Found', status=404)

@app.route('/alerts/<path:filename>')
def serve_alerts(filename):
    d = os.path.join(BASE_DIR, 'alerts')
    abs_dir = os.path.abspath(d)
    abs_file = os.path.abspath(os.path.join(d, filename))
    if abs_file.startswith(abs_dir + os.sep) and os.path.isfile(abs_file):
        return send_from_directory(d, filename)
    return Response('Not Found', status=404)

@app.route('/images/<path:filename>')
def serve_images(filename):
    d = _find_static_file(filename)
    if d:
        return send_from_directory(d, filename)
    return Response('Not Found', status=404)


# 支援 README.md 轉 HTML 作為首頁
def render_readme_html():
    readme_path = os.path.join(BASE_DIR, 'README.md')
    if os.path.isfile(readme_path):
        with open(readme_path, encoding='utf-8') as f:
            md = f.read()
        html = markdown.markdown(md, extensions=['fenced_code', 'tables'])
        # 包裝成完整 HTML
        return f"""
        <!DOCTYPE html>
        <html lang='zh-TW'>
        <head>
          <meta charset='utf-8'>
          <title>README</title>
          <style>body{{font-family:sans-serif;max-width:900px;margin:2em auto;background:#fff;color:#222;}} pre{{background:#f8f8f8;padding:1em;overflow:auto;}} code{{background:#f0f0f0;padding:2px 4px;}}</style>
        </head>
        <body>{html}</body>
        </html>
        """
    return None

# 根目錄：優先 README.md，否則 recent-hotspots/index.html
@app.route('/')
def serve_root():
    html = render_readme_html()
    if html:
        return html
    return send_from_directory(os.path.join(BASE_DIR, 'recent-hotspots'), 'index.html')

# 子目錄 /alerts/ /recent-hotspots/ ... 若 / 結尾自動回 index.html
@app.route('/<subdir>/')
def serve_subdir_index(subdir):
    # 只允許已知目錄
    if subdir in ['recent-hotspots', 'alerts']:
        d = os.path.join(BASE_DIR, subdir)
        index_path = os.path.join(d, 'index.html')
        if os.path.isfile(index_path):
            return send_from_directory(d, 'index.html')
    return Response('Not Found', status=404)
CORS(app)

@app.route('/proxy')
def proxy():
    url = request.args.get('url')
    match = re.fullmatch(r'https://ebird\.org/region/([A-Za-z0-9-]+)/recent-checklists', url or '')
    if not match:
        return Response('Invalid URL', status=400)
    try:
        api_key = os.environ.get('EBIRD_API_KEY')
        if api_key:
            response = requests.get(
                f'https://api.ebird.org/v2/product/lists/{match[1]}',
                params={'maxResults': 200},
                headers={'X-eBirdApiToken': api_key}, timeout=(5, 20),
            )
            response.raise_for_status()
            html = checklist_html(response.json())
            return Response(html, content_type='text/html; charset=utf-8')
        if os.environ.get('VERCEL'):
            return Response('請在 Vercel 設定 EBIRD_API_KEY 並重新部署，以使用 eBird 官方 API。', status=503)
        from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
        # 用 Playwright headless Chromium 抓取渲染後的 HTML
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                locale='zh-TW',
            )
            page = context.new_page()
            try:
                page.goto(url, wait_until='domcontentloaded', timeout=30000)
                # 驗證頁也有 main；必須等到真正的紀錄清單，包含合法空清單。
                page.wait_for_selector('.RecentChecklists', state='attached', timeout=60000)
                html = page.content()
            except PlaywrightTimeoutError:
                return Response('eBird 驗證或載入逾時，請稍後重試；也可設定 EBIRD_API_KEY 使用官方 API。', status=504)
            finally:
                browser.close()
        return Response(html, status=200, content_type='text/html; charset=utf-8')
    except requests.RequestException:
        return Response('eBird API 請求失敗，請確認金鑰、網路或稍後重試。', status=502)
    except Exception:
        app.logger.exception('Failed to fetch recent checklists')
        return Response('無法載入 eBird 資料，請檢查伺服器紀錄及 Playwright 安裝。', status=502)


def checklist_html(checklists):
    """Adapt the official feed to the existing table parser, escaping all values."""
    if not isinstance(checklists, list):
        raise ValueError('Invalid checklist feed')
    rows = []
    for item in checklists:
        loc = item['loc']
        name = escape(str(loc['name']))
        loc_id = quote(str(item['locId']), safe='')
        sub_id = quote(str(item['subId']), safe='')
        date = str(item.get('isoObsDate') or item['obsDt'])
        if len(date) == 10 and item.get('obsTime'):
            date += 'T' + str(item['obsTime'])
        date = escape(date, quote=True)
        location = f'<span class="u-loc-name">{name}</span>'
        if loc.get('isHotspot'):
            location = f'<a href="https://ebird.org/hotspot/{loc_id}">{location}</a>'
        rows.append(
            '<div class="Chk">'
            f'<div class="Chk-species"><a href="https://ebird.org/checklist/{sub_id}">{int(item["numSpecies"])}</a></div>'
            f'<div class="Chk-date"><time datetime="{date}">{date}</time></div>'
            f'<div class="Chk-observer">{escape(str(item["userDisplayName"]))}</div>'
            f'<div class="Chk-location">{location}</div></div>'
        )
    return '<div class="RecentChecklists">' + ''.join(rows) + '</div>'

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
