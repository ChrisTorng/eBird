以下使用 GitHub Copilot Agent/GPT-4.1:

1. 請使用 playwright 工具，抓取 https://ebird.org/region/TW-TPQ/recent-checklists ，取得裡面的最新紀錄清單表格。然後建立 html/css/js 檔，裡面會由目前網址後的 ?location=TW-TPQ 這樣的格式，抓取以上網頁內容，再依「地點」為群組，依出現數量由多至少排序，若數量相同，以時間越近越前面，顯示以下資訊:
| 地點次數 | 地點 |
|         | 日期 | 鳥種數 | 日期 | 鳥友名 |
原表格內的資訊，若有連結網址都要保留，以另開新頁籤的方式顯示。鳥種原網頁以方框方式顯示，整個都是連結可以點也要保留。
日期格式: YYYY/MM/DD HH:MM
表格中的地點，若有與標題相同的地點，則不顯示。以上述目標網頁而言，標題 New Taipei City，則表格裡面的地點裡也有重覆的 New Taipei City，則不顯示。
網頁標題除了原始網頁標題地名外，還要顯示日期範圍，以目前網頁為例，顯示範圍為 2025/5/3-4/30。
2. 請增加 Flash py server 端來解決 CORS 問題。
3. 請檢查 http://127.0.0.1:3001/recent-hotspots/ 執行中的錯誤並修正。
4. Flask 要能支援一般網頁請求，目前包括 html/css/js/png 檔。
5. Flask 增加支援 README.md 轉為 HTML 作為 index.html 的效果。另增加支援子目錄下 / 即傳回預設 index.html 功能。
6. 目前 serve_alerts() 的實作，會導致呼叫 alert/index.js 卻傳回 recent-hotspots/index.js。
7. 目前地點在次數一行已經有了，請將地點連結標示在次數該行。而底下的就不要再重覆地點。因此群組標題行:
| 地點次數 | 地點                         |
但其下的每一行:
|         | 日期 | 鳥種數 | 日期 | 鳥友名 |
也就是只有地點次數格是空白，而「日期/鳥種數/日期/鳥友名」與「地點」是共用垂直欄位空間。
另你的「日期」欄有重覆，「鳥友名」應該補上連結。