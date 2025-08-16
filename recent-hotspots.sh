#!/usr/bin/env bash
# 啟動 eBird 最近熱門地點 (Mac / Linux)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .venv/bin/python ]; then
  echo "[ERROR] 找不到虛擬環境 .venv，請先依 README 進行初始安裝。" >&2
  exit 1
fi

# 啟動虛擬環境
source .venv/bin/activate

# 啟動伺服器於背景
python index.py &
SERVER_PID=$!

# 當腳本結束時終止背景伺服器
cleanup() {
  if ps -p $SERVER_PID > /dev/null 2>&1; then
    kill $SERVER_PID 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# 等待服務啟動 (最多 12 秒)
RETRIES=24
until curl -fs -o /dev/null "http://127.0.0.1:5000/recent-hotspots/" || [ $RETRIES -le 0 ]; do
  sleep 0.5
  RETRIES=$((RETRIES-1))
  printf '.'
Done
fi

BASE_URL="http://localhost:5000/recent-hotspots/"
if [ "${1-}" != "" ]; then
  LOC="$1"
  # 僅允許 A-Z a-z 0-9 - _
  if printf '%s' "$LOC" | grep -Eq '^[A-Za-z0-9_-]+$'; then
    BASE_URL="${BASE_URL}?location=${LOC}"
  else
    echo "[WARN] 參數 '$LOC' 含非預期字元，已忽略。"
  fi
fi

# 開啟預設瀏覽器
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$BASE_URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$BASE_URL"
else
  echo "[INFO] 請手動開啟瀏覽器: $BASE_URL"
fi

# 等待伺服器 (前景等待 Ctrl+C)
wait $SERVER_PID
