const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const parser = require('../alerts/parser');

const alertsDir = path.join(__dirname, '../alerts');
const sampleFiles = fs.readdirSync(alertsDir).filter(name => /^samples.*\.txt$/.test(name)).sort();
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected-alerts.json'), 'utf8'));
const read = file => fs.readFileSync(path.join(alertsDir, file), 'utf8');

function snapshot(records) {
    return records.map(record => ({
        ...record,
        date: [record.date.getFullYear(), record.date.getMonth() + 1, record.date.getDate(), record.date.getHours(), record.date.getMinutes()],
        reporters: [...record.reporters].sort((a, b) => a.recordUrl < b.recordUrl ? -1 : 1)
    })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
}

test('every repository sample has reviewed expectations', () => {
    assert.deepEqual(sampleFiles, Object.keys(expected).sort());
});

for (const file of sampleFiles) {
    for (const ending of ['LF', 'CRLF', 'CR']) {
        test(`${file}: all fields, ${ending}`, () => {
            const source = read(file).replace(/\r\n?/g, '\n').replace(/\n/g, { LF: '\n', CRLF: '\r\n', CR: '\r' }[ending]);
            const records = parser.getRecords(source);
            assert.deepEqual(snapshot(records), expected[file].records);
            assert.equal(parser.extractTitle(source), expected[file].title);
            assert.equal(parser.extractAlertUrl(source), expected[file].alertUrl);
            // Every original observation must survive, including shared checklists and repeated species.
            const checklistIds = parser.normalizeSource(source).match(/^-\s*(?:紀錄清單|记录清单): https:\/\/ebird\.org\/checklist\/S\d+/gm)
                .map(line => line.match(/S\d+$/)[0]).sort();
            assert.deepEqual(records.flatMap(r => r.reporters.map(p => p.recordUrl.match(/S\d+$/)[0])).sort(), checklistIds);
            for (const record of records) {
                assert.match(record.mapUrl, /^https?:\/\/maps\.google\.com\/\?/);
                assert.match(record.recordUrl, /^https:\/\/ebird\.org\/checklist\/S\d+$/);
                assert.ok(Number.isFinite(record.date.getTime()));
                assert.ok(Number.isInteger(record.videos) && Number.isInteger(record.photos));
            }
        });
    }
}

test('Taipei: 14 observations, new notice, Chinese reporter, photos and multiline comment', () => {
    const source = read('samplesSimplifiedTaipei.txt');
    assert.ok(!source.includes('please-bird-mindfully'));
    const records = parser.getRecords(source);
    assert.equal(records.length, 14);
    const goose = records.find(r => r.name === '白額雁');
    assert.deepEqual(goose.reporters, [{ name: '陳韋勳', recordUrl: 'https://ebird.org/checklist/S400154616' }]);
    assert.deepEqual([goose.date.getFullYear(), goose.date.getMonth() + 1, goose.date.getDate(), goose.date.getHours(), goose.date.getMinutes()], [2026, 10, 8, 6, 44]);
    assert.equal(goose.photos, 2);
    assert.equal(goose.comment, '遠遠的往關渡自然公園方向飛去<br/>鳥友大哥提供的較能辨識的照片');
    assert.match(parser.extractTitleDetail(source), /^根据您的 eBird 记录/);
});

test('Taoyuan: all 22 observations survive, 19 rows after merging three shared reports', () => {
    const records = parser.getRecords(read('samplesSimplifiedTaoyuan.txt'));
    assert.equal(records.length, 19);
    assert.equal(records.reduce((total, r) => total + r.reporters.length, 0), 22);
    for (const name of ['鸕鷀', '紅隼', '極北柳鶯']) {
        assert.equal(records.find(r => r.name === name).reporters.length, 2);
    }
    assert.equal(records.filter(r => r.name === '翻石鷸').length, 3);
    assert.equal(records.find(r => r.name === '黃嘴角鴞').comment, '17&#xff1a;55第一聲');
});

test('wrapped address preserves both lines without shifting map, checklist or date', () => {
    const source = read('samplesMultilineAddress.txt');
    for (const text of [source, parser.normalizeSource(source)]) {
        const [record] = parser.getRecords(text);
        assert.equal(record.fullPlace, '桶後林道, 孝義里, 新北市 10k→13k, New Taipei City');
        assert.equal(record.place, '桶後林道孝義里新北市10k→13k');
        assert.equal(record.mapUrl, 'http://maps.google.com/?ie=UTF8&t=p&z=13&q=24.8430288,121.6328654&ll=24.8430288,121.6328654');
        assert.equal(record.recordUrl, 'https://ebird.org/checklist/S351213363');
        assert.equal(record.reporters[0].name, 'Peter Hsu');
        assert.equal(record.date.getHours(), 11);
        assert.equal(record.date.getMinutes(), 22);
    }
});

test('old examples retain unknown counts, date-only reports, quoted multiline notes and media', () => {
    const records = parser.getRecords(read('samplesOld.txt'));
    assert.equal(records.find(r => r.name === '鳳頭蒼鷹').count, 'X');
    assert.equal(records.find(r => r.name === '鳳頭蒼鷹').videos, 2);
    assert.equal(records.find(r => r.name === '鳳頭蒼鷹').photos, 17);
    assert.equal(records.find(r => r.name === '斑點鶇').date.getHours(), 0);
    assert.equal(records.find(r => r.name === '斑點鶇').photos, 0);
    assert.equal(records.find(r => r.name === '小啄木').comment, '行號 1<br/>行號 2 "引號" 測<br/><br/>行號 4');
});

test('merging shared reports keeps independent times and media separate', () => {
    const records = parser.getRecords(read('samplesNew.txt'));
    const eagles = records.filter(r => r.name === '大冠鷲');
    assert.equal(eagles.length, 3);
    assert.deepEqual(eagles.map(r => r.reporters.length).sort(), [1, 1, 3]);
    assert.equal(records.find(r => r.name === '黑長尾雉').reporters.length, 2);
    const [merged] = eagles.filter(r => r.reporters.length === 3);
    assert.ok(merged.reporter.includes('S130433452') && merged.reporter.includes('S130433453'));
});

test('new Traditional Chinese fields, notice and Markdown/plain text are equivalent', () => {
    const source = parser.normalizeSource(read('samplesSimplifiedTaipei.txt'));
    const traditional = source.replaceAll('感谢您订阅', '感謝您訂閱').replaceAll('按需鸟讯快报', '按需鳥訊快報')
        .replaceAll('记录于', '記錄於').replaceAll('地图:', '地圖:').replaceAll('记录清单:', '紀錄清單:')
        .replaceAll('影像资料:', '影像資料:').replaceAll('备注:', '備註:');
    assert.equal(parser.extractTitle(traditional), '臺北市 每天 鳥訊快報');
    assert.deepEqual(snapshot(parser.getRecords(traditional)), snapshot(parser.getRecords(source)));
});

test('all title formats work at character zero, with no spaces after frequency', () => {
    const cases = [
        ['謝謝您的訂閱<每天> New Taipei City 稀有鳥種快報. ', '新北市 每天 稀有鳥種快報'],
        ['謝謝你訂閱<每天>Taiwan的當年度鳥訊快報。', '臺灣 每天 當年度鳥訊快報'],
        ['謝謝您訂閱<每天>需要New Taipei City的鳥訊快報。', '新北市 每天 鳥訊快報'],
        ['感谢您订阅<每小时>Taipei City罕见鸟种快报。', '臺北市 每小时 稀有鳥種快報'],
        ['感谢您订阅<每天>Taoyuan City年度按需鸟讯快报。', '桃園市 每天 當年度鳥訊快報']
    ];
    for (const [source, title] of cases) assert.equal(parser.extractTitle(source), title);
    assert.equal(parser.extractAlertUrl('https://ebird.org/alert/summary?sid=SN45866'), 'https://ebird.org/alert/summary?sid=SN45866');
});

test('record boundaries tolerate extra blank lines and missing legacy footer', () => {
    const source = parser.normalizeSource(read('samplesSimplifiedTaipei.txt'));
    const withoutFooter = source.split('***********')[0];
    assert.deepEqual(snapshot(parser.getRecords(withoutFooter)), snapshot(parser.getRecords(source)));
    const [wrapped] = parser.getRecords(parser.normalizeSource(read('samplesMultilineAddress.txt')).replaceAll('\n', '\n\n'));
    assert.equal(wrapped.fullPlace, '桶後林道, 孝義里, 新北市 10k→13k, New Taipei City');
});

test('confirmed statuses and invalid input produce explicit results', () => {
    const source = parser.normalizeSource(read('samplesMultilineAddress.txt'));
    for (const [status, confirmed] of [['已確認', true], ['已确认', true], ['尚未確認', false], ['尚未确认', false]]) {
        assert.equal(parser.getRecords(source.replace('(2)', `(2) ${status}`))[0].confirmed, confirmed);
    }
    assert.throws(() => parser.getRecords('unrelated clipboard text'), /格式不正確/);
    assert.throws(() => parser.extractTitle('unrelated clipboard text'), /格式不正確/);
    assert.throws(() => parser.getRecords(source.replace('6月 02', '13月 02')), /無效的回報時間/);
    assert.throws(() => parser.getRecords(source.replace(/^- 地圖:.*$/m, '')), /缺少地圖/);
});

// Run the actual browser scripts against a small DOM adapter, exercising paste and both views.
function browserPage(style) {
    const tables = [];
    const elements = {};
    function table() {
        return { rows: [], insertRow() { const row = { innerHTML: '' }; this.rows.push(row); return row; } };
    }
    const history = {
        _html: '',
        get innerHTML() { return this._html; },
        set innerHTML(html) {
            this._html = html;
            if (!html) tables.length = 0;
            if (html.includes('id="birdsTable"')) { elements.birdsTable = table(); tables.push(elements.birdsTable); }
        },
        appendChild(element) { tables.push(element); }
    };
    Object.assign(elements, { history, source: {}, list: {}, table: {} });
    let onpaste;
    const context = vm.createContext({ console, navigator: { userAgent: 'Desktop' }, window: { scrollTo() {} },
        document: { getElementById: id => elements[id], querySelector: () => ({ id: style }),
            createElement: table, addEventListener(name, handler) { if (name === 'paste') onpaste = handler; } } });
    const html = read('index.html');
    const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
    assert.deepEqual(scripts, ['parser.js', 'index.js']);
    for (const script of scripts) vm.runInContext(read(script), context, { filename: script });
    return { paste(source) { onpaste({ preventDefault() {}, clipboardData: { getData: () => source } }); }, tables, history };
}

for (const file of sampleFiles) {
    for (const style of ['list', 'table']) {
        test(`${file}: paste renders ${style} and can be pasted again`, () => {
            const page = browserPage(style);
            for (let i = 0; i < 2; i++) {
                page.paste(read(file));
                assert.ok(page.history.innerHTML.includes(expected[file].title));
                assert.equal(page.tables.reduce((total, table) => total + table.rows.length, 0), expected[file].records.length);
                const rendered = page.tables.flatMap(table => table.rows.map(row => row.innerHTML)).join('\n');
                assert.ok(!rendered.includes('undefined') && !rendered.includes('NaN'));
                for (const record of expected[file].records) assert.ok(rendered.includes(record.recordUrl));
            }
        });
    }
}
