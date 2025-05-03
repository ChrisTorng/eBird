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

function getFullTitle(text) {
    const startPos1 = text.indexOf('謝謝你訂閱');
    if (startPos1 > 0) {
        return text.substring(startPos1 + 5, text.indexOf('。', startPos1));
    }

    const startPos2 = text.indexOf('謝謝您訂閱');
    if (startPos2 > 0) {
        return text.substring(startPos2 + 5, text.indexOf('。', startPos2));
    }

    const startPos3 = text.indexOf('謝謝您的訂閱');
    if (startPos3 > 0) {
        return text.substring(startPos3 + 6, text.indexOf('.', startPos3));
    }

    console.log("沒有 '謝謝你訂閱' 或 '謝謝您訂閱' 或 '謝謝您的訂閱'");
    throw '目前剪貼簿內容格式不正確。請複製全部鳥訊快報內容，貼入上方文字方塊。或請允許讀取剪貼簿權限要求。';
}

function extractTitle(text) {
    const fullTitle = getFullTitle(text);
    const frequency = fullTitle.substring(fullTitle.indexOf('<') + 1, fullTitle.indexOf('>'));

    const needsPos = fullTitle.indexOf('需要');
    if (needsPos > 0) {
        const city = fullTitle.substring(needsPos + 2, fullTitle.indexOf('的鳥訊快報', needsPos)).trim();
        const cityName = convertToChinesePlace(city);
        console.log(needsPos, city, cityName);
        return `${cityName} ${frequency} 鳥訊快報`;
    }

    const rarePos = fullTitle.indexOf('稀有鳥種快報');
    if (rarePos > 0) {
        const city = fullTitle.substring(fullTitle.indexOf('>') + 2, rarePos).trim();
        const cityName = convertToChinesePlace(city);
        return `${cityName} ${frequency} 稀有鳥種快報`;
    }
    const yearlyPos = fullTitle.indexOf('的當年度鳥訊快報');
    if (yearlyPos > 0) {
        const city = fullTitle.substring(fullTitle.indexOf('>') + 2, yearlyPos).trim();
        const cityName = convertToChinesePlace(city);
        return `${cityName} ${frequency} 當年度鳥訊快報`;
    }

    const restTitle = fullTitle.substring(fullTitle.indexOf(' '));
    return `${frequency} ${restTitle} 鳥訊快報`;
}

function convertToChinesePlace(place) {
    const nameMap = {
        "Taiwan": "臺灣",
        "Keelung City": "基隆市",
        "Taipei City": "臺北市",
        "New Taipei City": "新北市",
        "Taoyuan City": "桃園市",
        "Hsinchu City": "新竹市",
        "Hsinchu County": "新竹縣",
        "Miaoli County": "苗栗縣",
        "Taichung City": "臺中市",
        "Changhua County": "彰化縣",
        "Nantou County": "南投縣",
        "Yunlin County": "雲林縣",
        "Chiayi City": "嘉義市",
        "Chiayi County": "嘉義縣",
        "Tainan City": "臺南市",
        "Kaohsiung City": "高雄市",
        "Pingtung County": "屏東縣",
        "Yilan County": "宜蘭縣",
        "Hualien County": "花蓮縣",
        "Taitung County": "臺東縣",
        "Penghu County": "澎湖縣",
        "Kinmen County": "金門縣",
        "Lienchiang County": "連江縣"
    };

    return nameMap[place] || place;
}

function extractTitleDetail(text) {
    const startPos = text.indexOf('.  ');
    if (startPos > 0) {
        return text.substring(startPos + 3, text.indexOf('。', startPos));
    }
    return '';
}

function extractAlertUrl(text) {
    const startPos = text.indexOf('https://ebird.org/alert/summary?sid=');
    if (startPos > 0) {
        return text.substring(startPos, text.indexOf('\n', startPos));
    }
    return null;
}

function getRecords(source) {
    source = truncateOthers(source);
    const recordsText = source.split('\n\n');
    const records = [];
    for (const recordText of recordsText) {
        records.push(getRecord(recordText));
    }

    records.sort((record1, record2) => record1.place.localeCompare(record2.place));

    // 合併僅有回報人不同的紀錄
    const mergedRecords = [];
    for (const record of records) {
        const lastRecord = mergedRecords[mergedRecords.length - 1];
        if (lastRecord && isMergeable(lastRecord, record)) {
            lastRecord.reporter += `, <a href="${record.recordUrl}" target="_blank">${record.reporter}</a>`;
        } else {
            mergedRecords.push(record);
        }
    }

    return mergedRecords;
}

function isMergeable(record1, record2) {
    return record1.count === record2.count &&
        record1.fullName === record2.fullName &&
        record1.confirmed === record2.confirmed &&
        record1.date.getTime() === record2.date.getTime() &&
        record1.fullPlace === record2.fullPlace &&
        record1.mapUrl === record2.mapUrl &&
        record1.videos === record2.videos &&
        record1.photos === record2.photos &&
        record1.comment === record2.comment;
}

function truncateOthers(source) {
    source = source.substring(source.indexOf('please-bird-mindfully') + 'please-bird-mindfully'.length + 2)
    source = source.substring(0, source.indexOf('***********') - 2)
        .replace(/\r\n/, '') // remove beginning newline when get from clipboard
        .replace(/\r\n/g, '\n');

    // for comment's "", change new line chars into <br\> to avoid record splitting error
    source = source.replace(/^- 備註: "[\s\S]*?"$/gm, (matched) => {
        return matched.replace(/\n/g, '<br/>');
    });
    return source;
}

function makeChineseName(name) {
    const chineseNamePattern = /^\p{Script=Han}{1,2} \p{Script=Han}$/u;
    if (chineseNamePattern.test(name)) {
        const nameParts = name.split(' ');
        return nameParts[1] + nameParts[0];
    }
    return name;
}

function getRecord(recordText) {
    console.log(recordText);
    const lines = recordText.split('\n');
    let count = lines[0].substring(lines[0].lastIndexOf('(') + 1, lines[0].lastIndexOf(')'));
    let fullName = lines[0].substring(0, lines[0].lastIndexOf('('));
    let name = fullName.substring(0, fullName.lastIndexOf('(') - 1);
    if (!+count) {
        count = 'X';
        fullName = lines[0];
        name = fullName.substring(0, fullName.lastIndexOf('(') - 1);
    }
    let confirmed = lines[0].indexOf('確認') >= 0;

    const timeWithReporter = lines[1].replace('- 回報 ', '').split(' by ');

    let date;
    if (timeWithReporter[0].indexOf(':') > 0) {
        const dateTimeParser = /(\d+)月 (\d+), (\d+) (\d+):(\d+)/;
        const dateMatch = timeWithReporter[0].match(dateTimeParser);
        date = new Date(
            dateMatch[3],   // year
            dateMatch[1]-1, // monthIndex
            dateMatch[2],   // day
            dateMatch[4],   // hours
            dateMatch[5]    // minutes
        );
    
    } else {
        const dateParser = /(\d+)月 (\d+), (\d+)/;
        const dateMatch = timeWithReporter[0].match(dateParser);
        date = new Date(
            dateMatch[3],   // year
            dateMatch[1]-1, // monthIndex
            dateMatch[2]    // day
        );
    }

    const reporter = makeChineseName(timeWithReporter[1]);
    const fullPlace = lines[2].substring(2);
    let place;
    if (/^[^\p{Script=Han}]*$/u.test(fullPlace)) {
        place = fullPlace;
    } else {
        place = fullPlace.replace(/\([a-z\- ]*\)/i, '') // remove (English place)
            .replace(/\(\d+.\d+, \d+.\d+\)/, '') // remove position (25.033, 121.525)
            .replace(/[ ,'a-z]+$/i, '') // remove trailing alphabets
            .replace(/\([\(\) ,\.\-\&\/'\da-z]+\)/i, '') // remove middle (a-z0-9 (),.-&/')
            .replace(/[ ,\-]*/g, '') // remove - , and spaces
            .replace(/^[a-z]*/i, ''); // remove beginning "Auto selected"/TW...
        if (!place) {
            place = fullPlace;
        }
    }

    const mapUrl = lines[3].substring(6);
    const recordUrl = lines[4].substring(8);

    // 2 Videos, 17 Photos
    const media = (lines[5] && lines[5].indexOf('- 媒體: ') === 0 ?
        lines[5].substring(6, lines[5].length) :
        '');
    
    let videos = 0;
    let photos = 0;
    if (media) {
        const medias = media.split(', ');
        if (medias[0].indexOf(' Video')) {
            videos = +medias[0].substring(0, medias[0].indexOf(' Video'));
        }
        if (medias[0].indexOf(' Photo')) {
            photos = +medias[0].substring(0, medias[0].indexOf(' Photo'));
        }
        if (medias.length > 1 && medias[1].indexOf(' Photo')) {
            photos = +medias[1].substring(0, medias[1].indexOf(' Photo'));
        }
    }

    const commentLine = media ? 6 : 5;
    const comment = lines[commentLine] && lines[commentLine].indexOf('- 備註: "') === 0 ? 
        lines[commentLine].substring(7, lines[commentLine].length - 1) :
        '';

    return {
        count,
        fullName,
        name,
        confirmed,
        date,
        reporter,
        fullPlace,
        place,
        mapUrl,
        recordUrl,
        videos,
        photos,
        comment
    };
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
