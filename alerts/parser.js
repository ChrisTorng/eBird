// Shared by the static page and the dependency-free Node.js regression tests.
(function (root) {
    'use strict';

    const formatError = '目前剪貼簿內容格式不正確。請複製全部鳥訊快報內容，貼入上方文字方塊。或請允許讀取剪貼簿權限要求。';

    function normalizeSource(text) {
        return text.replace(/\r\n?/g, '\n')
            .replace(/\\([\\`*_{}\[\]()#+.!:>&-])/g, '$1')
            .replace(/\\[ \t]*$/gm, '')
            .replace(/\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)/g, '$2');
    }

    function getFullTitle(text) {
        const match = normalizeSource(text).match(/(?:謝謝你訂閱|謝謝您訂閱|謝謝您的訂閱|感謝您訂閱|感谢您订阅)\s*([^\n。]+?)(?:。|\.\s|$)/m);
        if (!match) throw new Error(formatError);
        return match[1].trim();
    }

    function convertToChinesePlace(place) {
        const nameMap = {
            'Taiwan': '臺灣', 'Keelung City': '基隆市', 'Taipei City': '臺北市',
            'New Taipei City': '新北市', 'Taoyuan City': '桃園市', 'Hsinchu City': '新竹市',
            'Hsinchu County': '新竹縣', 'Miaoli County': '苗栗縣', 'Taichung City': '臺中市',
            'Changhua County': '彰化縣', 'Nantou County': '南投縣', 'Yunlin County': '雲林縣',
            'Chiayi City': '嘉義市', 'Chiayi County': '嘉義縣', 'Tainan City': '臺南市',
            'Kaohsiung City': '高雄市', 'Pingtung County': '屏東縣', 'Yilan County': '宜蘭縣',
            'Hualien County': '花蓮縣', 'Taitung County': '臺東縣', 'Penghu County': '澎湖縣',
            'Kinmen County': '金門縣', 'Lienchiang County': '連江縣'
        };
        return nameMap[place] || place;
    }

    function extractTitle(text) {
        const fullTitle = getFullTitle(text);
        const match = fullTitle.match(/^<([^>]+)>\s*(.*)$/);
        if (!match) return fullTitle;
        const frequency = match[1];
        const rest = match[2];
        const kinds = [
            [/^需要\s*(.*?)的鳥訊快報/, '鳥訊快報'],
            [/^(.*?)(?:的)?(?:當年度鳥訊快報|当年度鸟讯快报|年度按需鸟讯快报|年度按需鳥訊快報)/, '當年度鳥訊快報'],
            [/^(.*?)(?:的)?(?:按需鸟讯快报|按需鳥訊快報|按需鸟种快报|按需鳥種快報)/, '鳥訊快報'],
            [/^(.*?)(?:的)?(?:稀有鳥種快報|罕见鸟种快报|罕見鳥種快報|罕见鸟讯快报|罕見鳥訊快報)/, '稀有鳥種快報']
        ];
        for (const [pattern, kind] of kinds) {
            const city = rest.match(pattern);
            if (city) return `${convertToChinesePlace(city[1].trim())} ${frequency} ${kind}`;
        }
        return `${frequency} ${rest} 鳥訊快報`;
    }

    function extractTitleDetail(text) {
        const match = normalizeSource(text).match(/(?:。|\.\s)\s*((?:根據|根据|以下|這是)[^\n。]+)[。\n]?/);
        return match ? match[1] : '';
    }

    function extractAlertUrl(text) {
        const match = normalizeSource(text).match(/https:\/\/ebird\.org\/alert\/summary\?sid=[A-Za-z0-9]+/);
        return match ? match[0] : null;
    }

    function recordStarts(lines) {
        const starts = [];
        for (let i = 0; i < lines.length; i++) {
            // A species heading must be followed by a report field; summary and comments do not qualify.
            if (!/^[^-].*\([A-Za-z][^\n]*\)/.test(lines[i])) continue;
            let next = i + 1;
            while (next < lines.length && !lines[next].trim()) next++;
            if (/^-\s*(?:回報|記錄於|记录于)\s+/.test(lines[next] || '')) starts.push(i);
        }
        return starts;
    }

    function truncateOthers(text) {
        const lines = normalizeSource(text).split('\n');
        const starts = recordStarts(lines);
        if (!starts.length) throw new Error(formatError);
        const footer = lines.findIndex((line, i) => i > starts[0] && /^\s*\*{11,}\s*$/.test(line));
        return lines.slice(starts[0], footer < 0 ? undefined : footer).join('\n').trim();
    }

    function makeChineseName(name) {
        return /^\p{Script=Han}{1,2} \p{Script=Han}$/u.test(name) ? name.split(' ').reverse().join('') : name;
    }

    function getRecord(text) {
        const lines = normalizeSource(text).trim().split('\n');
        const heading = lines[0].trim();
        const countMatch = heading.match(/\s+\((\d+|X)\)(?:\s*.*)?$/);
        const count = countMatch ? countMatch[1] : 'X';
        const fullName = countMatch ? heading.slice(0, countMatch.index).trim() : heading;
        const scientific = fullName.match(/\s+\([A-Za-z][^)]*\)/);
        const name = scientific ? fullName.slice(0, scientific.index) : fullName;
        const confirmed = /(?:已確認|已确认|(?<!未|不)確認|(?<!未|不)确认)/.test(heading);
        const reportIndex = lines.findIndex(line => /^-\s*(?:回報|記錄於|记录于)\s+/.test(line));
        const report = (lines[reportIndex] || '').match(/^-\s*(?:回報|記錄於|记录于)\s+(.*?)\s+(?:by|由)\s+(.+)$/);
        const dateMatch = report && report[1].match(/^(\d+)月\s+(\d+),\s+(\d{4})(?:\s+(\d+):(\d+))?$/);
        if (!dateMatch) throw new Error(`無法讀取回報時間：${heading}`);
        const date = new Date(+dateMatch[3], +dateMatch[1] - 1, +dateMatch[2], +(dateMatch[4] || 0), +(dateMatch[5] || 0));
        if (date.getFullYear() !== +dateMatch[3] || date.getMonth() !== +dateMatch[1] - 1 || date.getDate() !== +dateMatch[2] || date.getHours() !== +(dateMatch[4] || 0) || date.getMinutes() !== +(dateMatch[5] || 0)) {
            throw new Error(`無效的回報時間：${report[1]}`);
        }
        const mapIndex = lines.findIndex(line => /^-\s*地[圖图]\s*[:：]/.test(line));
        const checklistIndex = lines.findIndex(line => /^-\s*(?:紀錄清單|記錄清單|记录清单)\s*[:：]/.test(line));
        if (mapIndex <= reportIndex || checklistIndex < 0) throw new Error(`缺少地圖或紀錄清單：${heading}`);
        const fullPlace = lines.slice(reportIndex + 1, mapIndex).map(line => line.trim()).filter(Boolean).join(' ').replace(/^-\s*/, '');
        if (!fullPlace) throw new Error(`缺少地點：${heading}`);
        let place = fullPlace;
        if (/\p{Script=Han}/u.test(fullPlace)) {
            place = fullPlace.replace(/\([a-z\- ]*\)/i, '')
                .replace(/\(\d+\.\d+, \d+\.\d+\)/, '')
                .replace(/,\s*[a-z][a-z ,']*$/i, '')
                .replace(/\([() ,.\-&\/'\da-z]+\)/i, '')
                .replace(/[ ,\-]/g, '')
                .replace(/^[a-z]*/i, '') || fullPlace;
        }
        const mapUrl = lines[mapIndex].match(/https?:\/\/[^\s<>]+/)?.[0];
        const recordUrl = lines[checklistIndex].match(/https:\/\/ebird\.org\/checklist\/S\d+/)?.[0];
        if (!mapUrl || !recordUrl) throw new Error(`無效的地圖或紀錄清單網址：${heading}`);
        const media = lines.find(line => /^-\s*(?:媒體|影像資料|影像资料)\s*[:：]/.test(line)) || '';
        const videos = +(media.match(/(\d+)\s+Videos?\b/)?.[1] || 0);
        const photos = +(media.match(/(\d+)\s+Photos?\b/)?.[1] || 0);
        const commentMatch = lines.join('\n').match(/^-\s*(?:備註|备注)\s*[:：]\s*"([\s\S]*)"\s*$/m);
        const comment = commentMatch ? commentMatch[1].replace(/\n/g, '<br/>') : '';
        return { count, fullName, name, confirmed, date,
            reporters: [{ name: makeChineseName(report[2].trim()), recordUrl }],
            fullPlace, place, mapUrl, recordUrl, videos, photos, comment };
    }

    function isMergeable(a, b) {
        return a.date.getTime() === b.date.getTime() &&
            ['count', 'fullName', 'confirmed', 'fullPlace', 'mapUrl', 'videos', 'photos', 'comment'].every(key => a[key] === b[key]);
    }

    function sortReporters(reporters) {
        reporters.sort((a, b) => a.name.localeCompare(b.name) || a.recordUrl.localeCompare(b.recordUrl));
    }

    function buildReporterHtml(reporters) {
        const [first, ...others] = reporters;
        if (!first) return '';
        return [first.name, ...others.map(r => `<a href="${r.recordUrl}" target="_blank">${r.name}</a>`)].join(', ');
    }

    function getRecords(source) {
        const lines = truncateOthers(source).split('\n');
        const starts = recordStarts(lines);
        const records = starts.map((start, i) => getRecord(lines.slice(start, starts[i + 1]).join('\n')));
        records.sort((a, b) => a.place.localeCompare(b.place));
        const merged = [];
        for (const record of records) {
            // Equal records can be separated by another species or an independent observation.
            const previous = merged.find(other => isMergeable(other, record));
            if (previous) previous.reporters.push(...record.reporters);
            else merged.push(record);
        }
        for (const record of merged) {
            sortReporters(record.reporters);
            record.recordUrl = record.reporters[0].recordUrl;
            record.reporter = buildReporterHtml(record.reporters);
        }
        return merged;
    }

    const api = { normalizeSource, getFullTitle, extractTitle, extractTitleDetail, extractAlertUrl,
        convertToChinesePlace, truncateOthers, makeChineseName, getRecord, getRecords,
        isMergeable, sortReporters, buildReporterHtml };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.eBirdAlerts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
