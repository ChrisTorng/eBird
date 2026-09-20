# [eBird 工具](https://e-bird-christorngs-projects.vercel.app/)

- [eBird 最近熱門地點](https://e-bird-christorngs-projects.vercel.app/recent-hotspots/)
- [鳥訊快報整理](https://e-bird-christorngs-projects.vercel.app/alerts/)
  
## [eBird 最近熱門地點](https://e-bird-christorngs-projects.vercel.app/recent-hotspots/)

我想由 eBird 的 [最新紀錄清單](https://ebird.org/region/TW/recent-checklists) 找到最近幾天的熱門地點，故建立了 [eBird 最近熱門地點](https://e-bird-christorngs-projects.vercel.app/recent-hotspots/) 網頁。可以選擇台灣的指定縣市，它會抓最近兩百個紀錄清單，將相同地點之項目群組起來，方便檢視最近幾天最多人去的地點。

本機可使用 Playwright 抓取；設定 `EBIRD_API_KEY` 後，本機與 Vercel 都改用官方 API，不需啟動瀏覽器。

![](images/eBird-recent-hotspots.png)

## [鳥訊快報整理](https://e-bird-christorngs-projects.vercel.app/alerts/)
  
  因為訂閱 [eBird 鳥訊快報](https://ebird.org/alerts)，覺得純文字內容閱讀很吃力，故自己寫了 [eBird 鳥訊快報整理](https://e-bird-christorngs-projects.vercel.app/alerts/)網頁。它會將相同地點之項目群組起來，可輕易看到某地所有的鳥種項目。也把超連結加在地點及時間上，瀏覽時不會看到網址。另將地點及鳥名中外文部份皆刪除，僅留中文部份，看起來應該輕鬆多了。

  ![清單](images/eBirdList.png)
  ![表格](images/eBirdTable.png)

## 本機開發執行

未設定 API 金鑰時，本機使用 Playwright 抓取 eBird 網站。驗證頁通過後仍需等待真正的紀錄清單，最多等待導覽 30 秒及清單 60 秒；失敗會顯示原因及重試按鈕，不會當成零筆資料。

### Vercel 與官方 API

1. 登入 eBird，至 https://ebird.org/api/key 取得自己的 API 金鑰。
2. 在 Vercel 專案的 Environment Variables 加入 `EBIRD_API_KEY`，勾選需要的部署環境，重新部署。
3. 開啟 `/recent-hotspots/?location=TW` 確認有資料。

伺服器呼叫 [官方 Recent checklists feed](https://documenter.getpostman.com/view/664302/S1ENwy59) 的 `/v2/product/lists/{regionCode}?maxResults=200`，金鑰只放在伺服器端。Vercel 未設定金鑰時會顯示設定提示，不嘗試啟動 Chromium。本機亦可先在 PowerShell 設定 `$env:EBIRD_API_KEY = '你的金鑰'`，再執行啟動腳本。

API 提供地點、日期、鳥友顯示名稱與鳥種數；鳥友名稱顯示為純文字，地名使用 API 回傳名稱（可能與繁體中文網頁不同）。此版本 API 流程已有模擬回應測試，實際 Vercel 連線仍需設定有效金鑰後驗證。

### 第一次安裝啟動

請參考 [uv - Installation](https://github.com/astral-sh/uv#installation) 先安裝 `uv` 環境。再依下述第一次安裝啟動步驟：

```
uv venv .venv

# 啟動虛擬環境，以下三擇一
# .\.venv\Scripts\Activate.ps1 # Windows PowerShell
# .\.venv\Scripts\Activate.bat # Windows Command Prompt
# source .venv/bin/activate    # Mac / Linux

uv pip install -r requirements.txt
python -m playwright install
python index.py
```

啟動後瀏覽： [http://localhost:5000/recent-hotspots/](http://localhost:5000/recent-hotspots/)

### 快速啟動

以下腳本負責：
1. 啟動既有虛擬環境 `.venv`
2. 執行 `python index.py`
3. 等待服務就緒並開啟瀏覽器 `http://localhost:5000/recent-hotspots/`

Windows 服務在背景執行，紀錄存於 `local-server.log` 與 `local-server-error.log`。服務只接受本機連線。

初次安裝 (建立 venv / 安裝套件 / Playwright) 請先依「第一次安裝啟動」手動完成，腳本不再自動安裝，避免覆寫或拖慢啟動。

#### Windows (PowerShell / CMD)

```
./recent-hotspots.cmd
```

指定地點 (例如新北市 `TW-TPQ`)：

```
./recent-hotspots.cmd TW-TPQ
```

#### Mac / Linux

先賦予執行權限 (只需一次)：

```
chmod +x recent-hotspots.sh
```

執行：

```
./recent-hotspots.sh
```

指定地點：

```
./recent-hotspots.sh TW-TPQ
```

### 手動啟動 (不使用腳本)

```
# 啟動虛擬環境，以下三擇一
# .\.venv\Scripts\Activate.ps1 # Windows PowerShell
# .\.venv\Scripts\Activate.bat # Windows Command Prompt
# source .venv/bin/activate    # Mac / Linux

python index.py
```

啟動後瀏覽： [http://localhost:5000/recent-hotspots/](http://localhost:5000/recent-hotspots/)

## 原始碼

[GitHub 原始碼](https://github.com/ChrisTorng/eBird)<br/>
[回報問題](https://github.com/ChrisTorng/eBird/issues)

## [eBird Scripts](https://github.com/ChrisTorng/eBirdScripts)

另推薦 [eBird Scripts](https://github.com/ChrisTorng/eBirdScripts)，它是一個 [Tampermonkey](https://www.tampermonkey.net/) 使用者腳本，用於增強 [eBird](https://ebird.org/) 網站的功能，包括改用台灣格式日期，熱門鳥點中新增「最近鳥種」和「最近紀錄」連結。

## 授權

本專案採用 MIT 授權條款。
