# [eBird 工具](https://e-bird-christorngs-projects.vercel.app/)

- [eBird 最近熱門地點](https://e-bird-christorngs-projects.vercel.app/recent-hotspots/)
- [鳥訊快報整理](https://e-bird-christorngs-projects.vercel.app/alerts/)
  
## [eBird 最近熱門地點](https://e-bird-christorngs-projects.vercel.app/recent-hotspots/)

我想由 eBird 的 [最新紀錄清單](https://ebird.org/region/TW/recent-checklists) 找到最近幾天的熱門地點，故建立了 [eBird 最近熱門地點](https://e-bird-christorngs-projects.vercel.app/recent-hotspots/) 網頁。可以選擇台灣的指定縣市，它會抓最近兩百個紀錄清單，將相同地點之項目群組起來，方便檢視最近幾天最多人去的地點。

此功能目前只能在本機開發環境使用，參考 [本機開發執行](https://github.com/ChrisTorng/eBird?tab=readme-ov-file#%E6%9C%AC%E6%A9%9F%E9%96%8B%E7%99%BC%E5%9F%B7%E8%A1%8C)。

![](images\eBird-recent-hotspots.png)

## [鳥訊快報整理](https://e-bird-christorngs-projects.vercel.app/alerts/)
  
  因為訂閱 [eBird 鳥訊快報](https://ebird.org/alerts)，覺得純文字內容閱讀很吃力，故自己寫了 [eBird 鳥訊快報整理](https://e-bird-christorngs-projects.vercel.app/alerts/)網頁。它會將相同地點之項目群組起來，可輕易看到某地所有的鳥種項目。也把超連結加在地點及時間上，瀏覽時不會看到網址。另將地點及鳥名中外文部份皆刪除，僅留中文部份，看起來應該輕鬆多了。

  ![清單](images/eBirdList.png)
  ![表格](images/eBirdTable.png)

## 本機開發執行

最近熱門鳥點需要執行於本機開發執行環境，因為需要使用 Playwright 來抓取 eBird 網站的內容。

### 第一次環境設定 (所有平台)

```
uv venv .venv
./.venv/Scripts/Activate.ps1   # Windows PowerShell
uv pip install -r requirements.txt
python -m playwright install
```

### 快速啟動 (啟動腳本)

以下腳本「僅」負責：
1. 啟動既有虛擬環境 `.venv`
2. 執行 `python index.py`
3. 等待服務就緒並開啟瀏覽器 `http://localhost:5000/recent-hotspots/`

初次安裝 (建立 venv / 安裝套件 / Playwright) 請先依「第一次環境設定」手動完成，腳本不再自動安裝，避免覆寫或拖慢啟動。

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
./.venv/Scripts/Activate.ps1   # Windows (PowerShell)
# 或 source .venv/bin/activate # Mac / Linux
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