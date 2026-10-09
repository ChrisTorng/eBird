const { extractTitle, extractTitleDetail, extractAlertUrl, getRecords } = eBirdAlerts;

function isVirtualKeyboard() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isVirtualKeyboard()) {
    document.getElementById('source').focus();
}

const history = document.getElementById('history');
const sourceElement = document.getElementById('source');
const initialNotExistedPlace = 'initialNotExistedPlace';
let lastPlace = initialNotExistedPlace;
let value;
let getFromClipboard = false;

document.getElementById('list').onclick = async e => {
    if (getFromClipboard || !value) {
        value = await getClipboard();
        getFromClipboard = true;
    }

    if (value) {
        catchError(() => run(value));
    }
};
document.getElementById('table').onclick = async e => {
    if (getFromClipboard || !value) {
        value = await getClipboard();
        getFromClipboard = true;
    }

    if (value) {
        catchError(() => run(value));
    }
};

async function getClipboard() {
   try {
        return await navigator.clipboard.readText();
    } catch {
        throw '請複製全部鳥訊快報內容，貼入上方文字方塊。或請允許讀取剪貼簿權限要求。';
    }
}

document.getElementById('source').onpaste = e => {
    e.preventDefault();
    value = e.clipboardData.getData('text/plain');
    catchError(() => run(value));
};

document.addEventListener('paste', e => {
    e.preventDefault();
    value = e.clipboardData.getData('text/plain');
    catchError(() => run(value));
});

async function catchError(func) {
    try {
        func();
    } catch (ex) {
        clearHistory();
        appendHistory(ex);
    }
}

function run(value) {
    const style = document.querySelector('input[name="style"]:checked');
    if (style.id == "list") {
        catchError(() => list(value));
    }
    else if (style.id == "table") {
        catchError(() => table(value));
    }
    scrollToTop();
}

function scrollToTop() {
    window.scrollTo(0, 0);
}

// function getTruncatedForChatRecord(record) {
//     const arr = record.split('\n');
//     const removed = arr.splice(3, 2);
//     const result = arr.join('\n');
//     return result;
// }

function displayHeaderAndGetRecord(source) {
    clearHistory();
    const title = extractTitle(source);
    let titleDetail;
    if (title) {
        titleDetail = extractTitleDetail(source);
    }

    const alertUrl = extractAlertUrl(source);
    if (title) {
        appendHistory(`<a href='${alertUrl}' target='_blank' title='${titleDetail}'><b>${title}</b></a>`);
    }

    return getRecords(source);
}

function list(source) {
    const records = displayHeaderAndGetRecord(source)
    for (const record of records) {
        outputListHtmlOrderByPlace(record);
    }
}

function table(source) {
    const records = displayHeaderAndGetRecord(source)
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
