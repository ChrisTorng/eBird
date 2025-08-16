// recent-hotspots/index.js

// 台灣地區與縣市中文對應表（最前面加上台灣）
const TAIWAN_REGIONS = [
  { code: 'TW', name: '台灣' },
  { code: 'TW-TPE', name: '臺北市' },
  { code: 'TW-TPQ', name: '新北市' },
  { code: 'TW-TAO', name: '桃園市' },
  { code: 'TW-TXG', name: '臺中市' },
  { code: 'TW-TNN', name: '臺南市' },
  { code: 'TW-KHH', name: '高雄市' },
  { code: 'TW-KEE', name: '基隆市' },
  { code: 'TW-HSZ', name: '新竹市' },
  { code: 'TW-HSQ', name: '新竹縣' },
  { code: 'TW-MIA', name: '苗栗縣' },
  { code: 'TW-CHA', name: '彰化縣' },
  { code: 'TW-NAN', name: '南投縣' },
  { code: 'TW-YUN', name: '雲林縣' },
  { code: 'TW-CYI', name: '嘉義市' },
  { code: 'TW-CYQ', name: '嘉義縣' },
  { code: 'TW-PIF', name: '屏東縣' },
  { code: 'TW-ILA', name: '宜蘭縣' },
  { code: 'TW-HUA', name: '花蓮縣' },
  { code: 'TW-TTT', name: '臺東縣' },
  { code: 'TW-PEN', name: '澎湖縣' },
  { code: 'TW-KIN', name: '金門縣' },
  { code: 'TW-LIE', name: '連江縣' },
];

function getRegionName(code) {
  const found = TAIWAN_REGIONS.find(r => r.code === code);
  return found ? found.name : code;
}

function renderRegionLinks(currentCode) {
  let html = '<div class="region-link-list" id="region-link-list">';
  TAIWAN_REGIONS.forEach(r => {
    if (r.code === currentCode) {
      html += `<b class="region-link-current">${r.name}</b>\n`;
    } else {
      html += `<a href="?location=${r.code}" class="region-link">${r.name}</a>\n`;
    }
  });
  html += '</div>';
  return html;
}

async function fetchAndRender(location) {
  if (!location) return;
  // 先顯示標題、地區選擇列、資料來源與載入中
  const area = document.getElementById('table-area');
  const regionName = getRegionName(location);
  let html = '';
  html += renderRegionLinks(location);
  html += `<h2 id="main-title"><a href="https://e-bird-christorngs-projects.vercel.app/" target="_blank">eBird 工具</a> - ${regionName} eBird 熱門鳥點查詢</h2>`;
  html += '<div class="loading">載入中...</div>';
  html += `<div class="data-source">資料來源：<a href="https://ebird.org/region/${location}/recent-checklists" target="_blank">eBird 最新紀錄紀錄 - ${regionName}</a></div>`;
  area.innerHTML = html;
  // 使用本機 proxy server 解決 CORS 問題
  const url = `../proxy?url=${encodeURIComponent(`https://ebird.org/region/${location}/recent-checklists`)}`;
  const htmlText = await fetchHtml(url);
  const doc = new DOMParser().parseFromString(htmlText, 'text/html');
  const rows = Array.from(doc.querySelectorAll('.RecentChecklists .Chk-species'));
  const records = [];
  rows.forEach(speciesDiv => {
    const parent = speciesDiv.parentElement;
    const dateDiv = parent.querySelector('.Chk-date');
    const observerDiv = parent.querySelector('.Chk-observer');
    const locationDiv = parent.querySelector('.Chk-location');
    if (speciesDiv && dateDiv && observerDiv && locationDiv) {
      records.push({
        species: speciesDiv.innerHTML,
        date: dateDiv.innerHTML,
        observer: observerDiv.innerHTML,
        location: locationDiv.innerHTML
      });
    }
  });
  renderTable(location, records);
}
function renderLocationSelector(currentCode) {
  const area = document.getElementById('table-area');
  area.innerHTML = renderRegionLinks(currentCode || 'TW');
  document.getElementById('main-title').innerText = '台灣 eBird 熱門鳥點查詢';
}

async function fetchHtml(url) {
  // 若 CORS 問題，請改用 server 端 proxy
  const res = await fetch(url);
  return await res.text();
}

function parseLocationName(locationHtml) {
  // 取 u-loc-name 內容
  const div = document.createElement('div');
  div.innerHTML = locationHtml;
  const name = div.querySelector('.u-loc-name');
  return name ? name.textContent.trim() : div.textContent.trim();
}

function parseDate(dateHtml) {
  // 取 time datetime 屬性
  const div = document.createElement('div');
  div.innerHTML = dateHtml;
  const time = div.querySelector('time');
  if (time && time.getAttribute('datetime')) {
    const d = new Date(time.getAttribute('datetime').replace(/-/g, '/'));
    return d;
  }
  return null;
}

function formatDate(d) {
  if (!d) return '';
  const m = (d.getMonth()+1).toString();
  const day = d.getDate().toString().padStart(2,'0');
  const hh = d.getHours().toString().padStart(2,'0');
  const mm = d.getMinutes().toString().padStart(2,'0');
  return `${m}/${day} ${hh}:${mm}`;
}

function renderTable(locationCode, records) {
  // 用地區中文名過濾
  const regionName = getRegionName(locationCode);
  const filtered = records.filter(r => {
    const loc = parseLocationName(r.location);
    return loc !== regionName && loc !== '' && loc !== 'Location';
  });
  // 依地點分組
  const groupMap = {};
  filtered.forEach(r => {
    const loc = parseLocationName(r.location);
    if (!groupMap[loc]) groupMap[loc] = [];
    groupMap[loc].push(r);
  });
  // 排序: 依數量多到少，數量相同依最新時間
  // 解析鳥種數字
  function extractSpeciesNumber(speciesHtml) {
    const div = document.createElement('div');
    div.innerHTML = speciesHtml;
    const text = (div.textContent || '').trim();
    const m = text.match(/(\d+)/); // 擷取第一個數字
    return m ? parseInt(m[1], 10) : null;
  }

  const groups = Object.entries(groupMap).map(([loc, arr], idx) => {
    // 依最新日期排序（同一地點內）
    arr.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    // 計算唯一鳥友（同名只算一次）
    const observerSet = new Set();
    arr.forEach(r => {
      const div = document.createElement('div');
      div.innerHTML = r.observer;
      // 可能是 <a> 包裹，也保留非 a 的純文字情況
      const links = div.querySelectorAll('a');
      if (links.length) {
        links.forEach(a => {
          const name = (a.textContent || '').trim();
          if (name) observerSet.add(name);
        });
      } else {
        const name = (div.textContent || '').trim();
        if (name) observerSet.add(name);
      }
    });
    // 最近一天（依最新紀錄日期判斷的日）統計
    const latestDateObj = parseDate(arr[0].date);
    let latestDateStr = '';
    let latestCount = 0;
    let latestSpeciesAvg = 0;
    if (latestDateObj) {
      latestDateStr = `${latestDateObj.getMonth()+1}/${latestDateObj.getDate().toString().padStart(2,'0')}`;
      const sameDay = arr.filter(r => {
        const d = parseDate(r.date);
        return d && d.getFullYear() === latestDateObj.getFullYear() && d.getMonth() === latestDateObj.getMonth() && d.getDate() === latestDateObj.getDate();
      });
      latestCount = sameDay.length;
      let sum = 0, n = 0;
      sameDay.forEach(r => {
        const num = extractSpeciesNumber(r.species);
        if (num != null) { sum += num; n++; }
      });
      latestSpeciesAvg = n ? Math.round(sum / n) : 0;
    }
    return { loc, count: arr.length, observerCount: observerSet.size, latest: parseDate(arr[0].date), latestDateStr, latestCount, latestSpeciesAvg, arr, idx };
  });
  groups.sort((a, b) => b.count - a.count || b.latest - a.latest);


  // 日期範圍
  let minDate = null, maxDate = null;
  filtered.forEach(r => {
    const d = parseDate(r.date);
    if (!d) return;
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  });
  const rangeStr = minDate && maxDate ? `${maxDate.getFullYear()}/${minDate.getMonth()+1}/${minDate.getDate()}-${maxDate.getMonth()+1}/${maxDate.getDate()}` : '';

  // 組合標題
  const pageTitle = `${regionName}${rangeStr ? ' (' + rangeStr + ')' : ''} eBird 最近熱門地點`;
  document.title = pageTitle;

  // 展開/收合按鈕
  const expandCollapseBtns = `
    <button id="expand-all-btn" class="expand-collapse-btn">全部展開</button>
    <button id="collapse-all-btn" class="expand-collapse-btn">全部收合</button>
  `;

  // 標題（加上日期範圍）
  let html = '';
  html += `<h2 id="main-title"><a href="https://e-bird-christorngs-projects.vercel.app/" target="_blank">eBird 工具</a> - ${pageTitle}</h2>`;
  html += expandCollapseBtns;

  html += '<div class="table-wrap"><table><thead><tr>'+
    '<th style="text-align:right" title="總紀錄數 / 唯一鳥友人數">紀錄 / 人</th>'+
    '<th style="text-align:center" title="該地點最近一天的日期">最近日期</th>'+
    '<th style="text-align:center" title="最近一天平均鳥種數 / 當日紀錄數">平均鳥種 / 紀錄</th>'+
    '<th title="單筆紀錄的鳥種數" >鳥種</th>'+
    '<th title="單筆紀錄時間 (月/日 時:分)">日期</th>'+
    '<th class="observer-cell" title="紀錄提交者">鳥友名</th>'+
    '</tr></thead><tbody>';
  groups.forEach(g => {
    // 取地點連結
    let locDiv = document.createElement('div');
    locDiv.innerHTML = g.arr[0].location;
    let locA = locDiv.querySelector('a');
    if (locA) {
      locA.href += '/bird-list?yr=curM';
      locA.setAttribute('target', '_blank');
      locA.classList.add('location-link');
      // 只保留 a 標籤
      locDiv.innerHTML = '';
      locDiv.appendChild(locA);
    }
    let locHtml = locA ? locDiv.innerHTML : g.loc;
    // group id for toggle
    const groupId = `group-${g.idx}`;
  const dateTooltip = g.latestDateStr ? `最近一天日期：${g.latestDateStr}（共有 ${g.latestCount} 筆紀錄）` : '無最近日期資料';
  const avgTooltip = g.latestDateStr ? `最近一天平均鳥種數：${g.latestSpeciesAvg} / 當日紀錄數：${g.latestCount}` : '無平均資料';
  const countTooltip = `總紀錄數 ${g.count} / 唯一鳥友 ${g.observerCount}`;
  html += `<tr class="group-row" data-group="${groupId}">`+
    `<td class="count-cell" title="${countTooltip}"><button class="toggle-group-btn" data-group="${groupId}" aria-expanded="false" title="展開/收合">▶</button> ${g.count} / ${g.observerCount}</td>`+
    `<td style="text-align:center" title="${dateTooltip}">${g.latestDateStr || ''}</td>`+
    `<td style="text-align:center" title="${avgTooltip}">${g.latestDateStr ? g.latestSpeciesAvg + ' / ' + g.latestCount : ''}</td>`+
    `<td colspan="3">${locHtml}</td>`+
    `</tr>`;
    g.arr.forEach((r, i) => {
      // 鳥種數
      let species = r.species.replace(/<a /, '<a target="_blank" class="species-link" ');
      // 日期
      const d = parseDate(r.date);
      let dateStr = d ? formatDate(d) : '';
      // 鳥友名
      let observer = r.observer.replace(/<a /, '<a target="_blank" class="species-link" ');
      html += `<tr class="group-detail-row location-item-row" data-group="${groupId}" style="display:none">`+
        `<td></td><td></td><td></td>`+ // 對齊前 3 欄（紀錄/人、最近日期、平均鳥種/紀錄）
        `<td>${species}</td>`+
        `<td>${dateStr}</td>`+
        `<td class="observer-cell">${observer}</td>`+
        `</tr>`;
    });
  });
  html += '</tbody></table></div>';
  html += expandCollapseBtns;
  // 資料來源
  html += `<div class="data-source">資料來源：<a href="https://ebird.org/region/${locationCode}/recent-checklists" target="_blank">eBird 最新紀錄紀錄 - ${regionName}</a></div>`;
  // 只更新內容（不再加地區列，因 fetchAndRender 已處理）
  const area = document.getElementById('table-area');
  area.innerHTML = renderRegionLinks(locationCode) + html;

  // 掛載展開/收合事件
  setTimeout(() => {
    // 單一地點展開/收合
    document.querySelectorAll('.toggle-group-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const group = this.getAttribute('data-group');
        const expanded = this.getAttribute('aria-expanded') === 'true';
        document.querySelectorAll(`.group-detail-row[data-group="${group}"]`).forEach(row => {
          row.style.display = expanded ? 'none' : '';
        });
        this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        this.textContent = expanded ? '▶' : '▼';
      });
    });
    // 全部展開
    document.querySelectorAll('#expand-all-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.toggle-group-btn').forEach(tbtn => {
          tbtn.setAttribute('aria-expanded', 'true');
          tbtn.textContent = '▼';
        });
        document.querySelectorAll('.group-detail-row').forEach(row => {
          row.style.display = '';
        });
      });
    });
    // 全部收合
    document.querySelectorAll('#collapse-all-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.toggle-group-btn').forEach(tbtn => {
          tbtn.setAttribute('aria-expanded', 'false');
          tbtn.textContent = '▶';
        });
        document.querySelectorAll('.group-detail-row').forEach(row => {
          row.style.display = 'none';
        });
      });
    });
  }, 0);
}

document.addEventListener('DOMContentLoaded', function() {
  const params = new URLSearchParams(window.location.search);
  let location = params.get('location');
  if (!location) {
    // 未指定地區自動導向台灣
    const url = new URL(window.location.href);
    url.searchParams.set('location', 'TW');
    window.location.replace(url.toString());
    return;
  }
  fetchAndRender(location);
});
