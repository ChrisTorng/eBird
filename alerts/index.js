const { extractTitle, extractTitleDetail, extractAlertUrl, getRecords } = eBirdAlerts;

function isVirtualKeyboard() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const history = document.getElementById('history');
const sourceElement = document.getElementById('source');
const currentReportElement = document.getElementById('current-report');
const noticeElement = document.getElementById('notice');
const initialHtml = history.innerHTML;
const initialTitle = document.title;
const initialNotExistedPlace = 'initialNotExistedPlace';

// All alert contents live only in this page instance. A reload starts a new session.
const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
const reports = new Map();
let nextReportId = 0;
let activeReportId = null;
let activeStyle = null;
let lastPlace = initialNotExistedPlace;

window.history.replaceState(null, '', window.location.pathname + window.location.search);
window.addEventListener('popstate', restoreNavigation);
window.addEventListener('hashchange', restoreNavigation);

if (isVirtualKeyboard()) {
    sourceElement.focus();
}

document.getElementById('list').onclick = () => { void selectStyle('list'); };
document.getElementById('table').onclick = () => { void selectStyle('table'); };

async function selectStyle(style) {
    if (activeReportId === null) {
        try {
            const clipboard = await getClipboard();
            if (activeReportId === null) openSource(clipboard);
        } catch (ex) {
            showError(ex);
        }
        return;
    }
    if (activeStyle !== style) {
        pushNavigation(reports.get(activeReportId), style);
    }
}

async function getClipboard() {
    try {
        return await navigator.clipboard.readText();
    } catch {
        throw new Error('請複製全部鳥訊快報內容，貼入上方文字方塊。或請允許讀取剪貼簿權限要求。');
    }
}

// One listener handles both the input box and page-wide Ctrl+V without double-pasting.
document.addEventListener('paste', e => {
    if (!e.clipboardData) return;
    e.preventDefault();
    openSource(e.clipboardData.getData('text/plain'));
});

function showError(ex) {
    noticeElement.textContent = ex && ex.message ? ex.message : String(ex);
    if (activeStyle) {
        document.getElementById(activeStyle).checked = true;
    }
}

function formatDate(date) {
    return date.getFullYear() + '-' + padTwoDigit(date.getMonth() + 1) + '-' + padTwoDigit(date.getDate());
}

function getReportDate(source, records) {
    // A copied email body often omits the sent date. Never imply that an observation
    // date is the date the alert was sent.
    const header = source.match(/^(?:Date|日期|寄送日期|傳送日期|发送日期)\s*[:：]\s*(.+)$/im);
    if (header) {
        const headerText = header[1].trim();
        // Preserve the calendar day written by the sender, even if the browser
        // runs in a different timezone from the email's Date header.
        const numeric = headerText.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/) ||
            headerText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        const rfc = headerText.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/i);
        let sent;
        if (numeric) {
            sent = new Date(+numeric[1], +numeric[2] - 1, +numeric[3]);
        } else if (rfc) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months.findIndex(name => name.toLowerCase() === rfc[2].toLowerCase());
            sent = new Date(+rfc[3], month, +rfc[1]);
        } else {
            sent = new Date(headerText);
        }
        if (!Number.isNaN(sent.getTime())) {
            return { date: formatDate(sent), dateLabel: '快報日期' };
        }
    }
    const newest = new Date(Math.max(...records.map(record => record.date.getTime())));
    return { date: formatDate(newest), dateLabel: '最新紀錄日' };
}

function openSource(source) {
    if (!source || !source.trim()) {
        showError(new Error('沒有可辨識的鳥訊快報內容。'));
        return;
    }
    try {
        // Validate before changing the URL or discarding the previously shown alert.
        const title = extractTitle(source);
        const records = getRecords(source);
        const meta = getReportDate(source, records);
        const report = { id: ++nextReportId, source, title, date: meta.date, dateLabel: meta.dateLabel };
        reports.set(report.id, report);
        const selected = document.querySelector('input[name="style"]:checked');
        pushNavigation(report, selected && selected.id === 'list' ? 'list' : 'table');
    } catch (ex) {
        showError(ex);
    }
}

function getRoute(report, style) {
    // Include a session token so URLs from before a reload cannot match new reports.
    return '#/alert/' + sessionId + '/' + report.id + '/' + report.date + '/' +
        encodeURIComponent(report.title) + '/' + style;
}

function pushNavigation(report, style) {
    window.history.pushState({ eBirdSession: sessionId, reportId: report.id, style }, '', getRoute(report, style));
    showReport(report, style);
}

function restoreNavigation() {
    const parts = window.location.hash.split('/');
    if (parts.length === 7 && parts[1] === 'alert' && parts[2] === sessionId &&
        /^\d+$/.test(parts[3]) && (parts[6] === 'list' || parts[6] === 'table')) {
        const report = reports.get(Number(parts[3]));
        try {
            if (report && parts[4] === report.date && decodeURIComponent(parts[5]) === report.title) {
                showReport(report, parts[6]);
                return;
            }
        } catch {
            // Malformed or stale hash: return to the empty view.
        }
    }
    showWelcome();
}

function showWelcome() {
    activeReportId = null;
    activeStyle = null;
    history.innerHTML = initialHtml;
    currentReportElement.textContent = '';
    noticeElement.textContent = '';
    document.title = initialTitle;
    document.getElementById('table').checked = true;
    document.getElementById('list').checked = false;
    lastPlace = initialNotExistedPlace;
    scrollToTop();
}

function showReport(report, style) {
    activeReportId = report.id;
    activeStyle = style;
    document.getElementById('list').checked = style === 'list';
    document.getElementById('table').checked = style === 'table';
    noticeElement.textContent = '';
    currentReportElement.textContent = report.title + '｜' + report.dateLabel + ' ' + report.date +
        '｜' + (style === 'list' ? '條列' : '表格');
    document.title = report.title + '｜' + report.dateLabel + ' ' + report.date +
        '｜' + (style === 'list' ? '條列' : '表格') + ' - ' + initialTitle;
    if (style === 'list') list(report.source);
    else table(report.source);
    scrollToTop();
}

function scrollToTop() {
    window.scrollTo(0, 0);
}

function displayHeaderAndGetRecord(source) {
    clearHistory();
    const title = extractTitle(source);
    let titleDetail;
    if (title) {
        titleDetail = extractTitleDetail(source);
    }

    const alertUrl = extractAlertUrl(source);
    if (title) {
        appendHistory("<a href='" + alertUrl + "' target='_blank' title='" + titleDetail +
            "'><b>" + title + "</b></a>");
    }

    return getRecords(source);
}

function list(source) {
    const records = displayHeaderAndGetRecord(source);
    for (const record of records) {
        outputListHtmlOrderByPlace(record);
    }
}

function table(source) {
    const records = displayHeaderAndGetRecord(source);
    outputTable();
    for (const record of records) {
        addTableRow(record);
    }
}

function getTimeHtml(date) {
    if (date.getHours() === 0 && date.getMinutes() === 0) {
        return `<span title="${getFullDateText(date)}">${getShortDateText(date)}</span>`
    }
    return `<span title="${getFullDateText(date)} ${getTimeText(date)}">${getShortDateText(date)}&nbsp;${getTimeText(date)}</span>`
}

function getShortDateText(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getFullDateText(date) {
    return `${date.getFullYear()}/${getShortDateText(date)}`;
}

function getTimeText(date) {
    return `${padTwoDigit(date.getHours())}:${padTwoDigit(date.getMinutes())}`;
}

function padTwoDigit(number) {
    return ('0' + number).slice(-2);
}

function getListHtml(record) {
    const commentWithBr = record.comment ? `<br/>${record.comment}` : '';
    const media = getMediaText(record.videos, record.photos);
    return `<p>${record.count}
<span title="${record.fullName} ${getConfirmedText(record.confirmed)}">${record.name} ${getConfirmedSymbol(record.confirmed)}</span> ${media} 
<a href="${record.recordUrl}" target="_blank">${getTimeHtml(record.date)}</a> ${record.reporter}<br/>
<a href="${record.mapUrl}" target="_blank" title="${record.fullPlace}">${record.place}</a>
${commentWithBr}</p>`;
}

function outputListTable() {
    appendHistory(`<table>
    <tbody>
    </tbody>
</table>`);
}

function getMediaHtml(videos, photos) {
    if (videos === 0) {
        if (photos === 0) {
            return '';
        }
        return `<span title="${photos} 張照片">${photos} 張</span>`;
    }
    if (photos === 0) {
        return `<span title="${videos} 部影片">${videos} 部</span>`;
    }
    return `<span title="${videos} 部影片 ${photos} 張照片">${videos} 部 ${photos} 張</span>`;
}

function getConfirmedSymbol(confirmed) {
    return confirmed ? '✔' : '';
}

function getConfirmedText(confirmed) {
    return confirmed ? '已確認' : '未確認';
}

let lastTable;
function outputListHtmlOrderByPlace(record) {
    if (record.place !== lastPlace) {
        if (history.innerHTML) {
            appendHistory('<br/>');
        }
        appendHistory(`<a class="break-long-word" href="${record.mapUrl}" target="_blank" title="${record.fullPlace}">${record.place}</a>`);
        lastPlace = record.place;
        lastTable = document.createElement('table');
        history.appendChild(lastTable);
    }

    const media = getMediaHtml(record.videos, record.photos);
    const row = lastTable.insertRow(-1);
    row.innerHTML = `<td class="right-align">${record.count}</td>
<td title="${record.fullName} ${getConfirmedText(record.confirmed)}">${record.name} ${getConfirmedSymbol(record.confirmed)}</td>
<td class="right-align"><a href="${record.recordUrl}" target="_blank">${getTimeHtml(record.date)}</a></td>
<td>${record.reporter}</td>
<td>${media}</td>
<td>${record.comment}</td>`;
}

function outputTable() {
    appendHistory(`<table id="birdsTable">
    <thead>
        <tr>
            <th title="原始地點完整名稱">地點</th>
            <th>數量</th>
            <th title="原始鳥種完整名稱">鳥種</th>
            <th>時間</th>
            <th>回報人</th>
            <th>媒體</th>
            <th>備註</th>
        </tr>
    </thead>
    <tbody>
    </tbody>
</table>`);
}

function addTableRow(record) {
    let placeText = '';
    let placeDivider = '';
    if (record.place !== lastPlace) {
        placeText = `<a class="break-long-word" href="${record.mapUrl}" target="_blank" title="${record.fullPlace}">${record.place}</a>`;
        placeDivider = 'place-divider';
        lastPlace = record.place;
    }

    const media = getMediaHtml(record.videos, record.photos);
    const birdsTable = document.getElementById('birdsTable');
    const row = birdsTable.insertRow(-1);
    row.innerHTML = `<tr>
    <td class="${placeDivider}">${placeText}</td>
    <td class="${placeDivider} right-align">${record.count}</td>
    <td class="${placeDivider}" title="${record.fullName} ${getConfirmedText(record.confirmed)}">${record.name} ${getConfirmedSymbol(record.confirmed)}</td>
    <td class="${placeDivider} right-align"><a href="${record.recordUrl}" target="_blank">${getTimeHtml(record.date)}</a></td>
    <td class="${placeDivider}">${record.reporter}</td>
    <td class="${placeDivider}">${media}</td>
    <td class="${placeDivider}">${record.comment}</td>
</tr>`;
}

function clearHistory() {
    history.innerHTML = '';
    lastPlace = initialNotExistedPlace;
}

function appendHistory(message) {
    history.innerHTML = `${history.innerHTML}
${message}`;
}
