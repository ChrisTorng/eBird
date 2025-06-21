# recent-hotspots/proxy_server.py
from flask import Flask, request, Response, send_from_directory
import requests
import asyncio
from flask import stream_with_context

# Playwright 相關
from playwright.sync_api import sync_playwright
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
    if not url or not url.startswith('https://ebird.org/'):
        return Response('Invalid URL', status=400)
    try:
        # 用 Playwright headless Chromium 抓取渲染後的 HTML
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                locale='zh-TW',
            )
            page = context.new_page()
            page.goto(url, wait_until='networkidle', timeout=30000)
            # 等待可能的 JS 驗證跳轉
            # 若有中間頁面，等待自動跳轉
            # 最多等 5 秒
            page.wait_for_timeout(5000)
            html = page.content()
            browser.close()
        return Response(html, status=200, content_type='text/html; charset=utf-8')
    except Exception as ex:
        return Response(f'Error: {ex}', status=500)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
