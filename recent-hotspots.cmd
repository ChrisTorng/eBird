@echo off
REM 啟動 eBird 最近熱門地點 (Windows CMD / PowerShell 皆可呼叫)
REM 設定 UTF-8 以避免中文亂碼
chcp 65001 >nul
SETLOCAL ENABLEDELAYEDEXPANSION

REM 切換到腳本所在目錄 (支援從其他路徑呼叫)
CD /D "%~dp0"

IF NOT EXIST .venv\Scripts\python.exe (
  echo [ERROR] 找不到虛擬環境 .venv，請先依 README 進行初始安裝。
  goto :error
)

REM 啟動虛擬環境
CALL .venv\Scripts\activate.bat || goto :error

REM 啟動伺服器 (背景執行)
START "recent-hotspots" cmd /c python index.py

REM 等待服務啟動 (最多 12 秒)
SET /A retries=24
:waitloop
>nul 2>&1 (powershell -NoLogo -NoProfile -Command "try { $r = iwr -UseBasicParsing http://127.0.0.1:5000/recent-hotspots/ -Method Head -TimeoutSec 1 } catch {}") && goto :open
PING 127.0.0.1 -n 2 >NUL
SET /A retries-=1
IF !retries! GTR 0 GOTO :waitloop
ECHO [WARN] 未偵測到服務啟動，仍嘗試開啟瀏覽器。

:open
SET "BASE_URL=http://localhost:5000/recent-hotspots/"
IF NOT "%~1"=="" SET "BASE_URL=%BASE_URL%?location=%~1"
START "" "%BASE_URL%"
GOTO :eof

:error
echo [ERROR] 腳本執行失敗。& exit /b 1

ENDLOCAL
