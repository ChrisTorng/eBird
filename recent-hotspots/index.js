// recent-hotspots/index.js

async function fetchAndRender() {
  const params = new URLSearchParams(window.location.search);
  const location = params.get('location') || 'TW-TPQ';
  // 使用本機 proxy server 解決 CORS 問題
  const url = `http://127.0.0.1:5000/proxy?url=${encodeURIComponent(`https://ebird.org/region/${location}/recent-checklists`)}`;
  const html = await fetchHtml(url);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const title = doc.querySelector('h1')?.innerText?.trim() || '';
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
  renderTable(title, records);
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
  const y = d.getFullYear();
  const m = (d.getMonth()+1).toString().padStart(2,'0');
  const day = d.getDate().toString().padStart(2,'0');
  const hh = d.getHours().toString().padStart(2,'0');
  const mm = d.getMinutes().toString().padStart(2,'0');
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

function renderTable(title, records) {
  // 過濾掉地點為標題的紀錄
  const filtered = records.filter(r => {
    const loc = parseLocationName(r.location);
    return loc !== title && loc !== '' && loc !== 'Location';
  });
  // 依地點分組
  const groupMap = {};
  filtered.forEach(r => {
    const loc = parseLocationName(r.location);
    if (!groupMap[loc]) groupMap[loc] = [];
    groupMap[loc].push(r);
  });
  // 排序: 依數量多到少，數量相同依最新時間
  const groups = Object.entries(groupMap).map(([loc, arr]) => {
    arr.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    return { loc, count: arr.length, latest: parseDate(arr[0].date), arr };
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
  const rangeStr = minDate && maxDate ? `${formatDate(maxDate).split(' ')[0]}-${formatDate(minDate).split(' ')[0]}` : '';

  // 標題
  document.getElementById('main-title').innerText = `${title} (${rangeStr})`;

  // 表格
  let html = '<div class="table-wrap"><table><thead><tr><th>地點次數</th><th>地點</th><th></th><th>日期</th><th>鳥種數</th><th>日期</th><th>鳥友名</th></tr></thead><tbody>';
  groups.forEach(g => {
    html += `<tr class="group-row"><td>${g.count}</td><td colspan="6">${g.loc}</td></tr>`;
    g.arr.forEach(r => {
      // 鳥種數
      let species = r.species.replace(/<a /, '<a target="_blank" class="species-link" ');
      // 日期
      const d = parseDate(r.date);
      let dateStr = d ? formatDate(d) : '';
      // 鳥友名
      let observer = r.observer.replace(/<svg[\s\S]*?svg>/, '').replace(/<span class="is-visuallyHidden">.*?<\/span>/, '').trim();
      // 地點
      let locHtml = r.location.replace(/<a /, '<a target="_blank" class="location-link" ');
      html += `<tr><td></td><td>${locHtml}</td><td></td><td>${dateStr}</td><td>${species}</td><td>${dateStr}</td><td>${observer}</td></tr>`;
    });
  });
  html += '</tbody></table></div>';
  document.getElementById('table-area').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', fetchAndRender);
