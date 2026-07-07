const CONTRACT_PRINT_CSS = `
@page { size: A4; margin: 18mm 15mm 18mm 20mm; }
* { box-sizing: border-box; }
body {
    font-family: Tahoma, Arial, sans-serif;
    font-size: 9.5pt;
    line-height: 11.25pt;
    color: #000;
    margin: 0;
    padding: 0;
}
p, li, h1, h2, h3, h4, h5, h6 {
    margin: 0;
    padding: 0;
    text-align: justify;
    font-size: 9.5pt;
    line-height: 11.25pt;
    font-weight: normal;
}
strong, b { font-weight: 700; }
ul, ol {
    list-style: none;
    margin: 0;
    padding: 0;
}
li { margin: 0; padding: 0; }
p.contract-title {
    font-weight: 700;
    text-align: center !important;
    margin: 0 0 3pt;
}
p.contract-meta {
    display: flex;
    justify-content: space-between;
    text-align: left !important;
    margin: 0 0 3pt;
}
p.contract-meta span { font-weight: 700; }
p.contract-section {
    font-weight: 700;
    text-align: center !important;
    margin: 3pt 0 2pt;
}
p.protocol-attach {
    text-align: right !important;
    margin: 0;
}
p.protocol-title,
p.protocol-subtitle {
    font-weight: 700;
    text-align: center !important;
    margin: 0;
}
p.protocol-subtitle {
    margin: 0 0 4pt;
}
p.protocol-meta {
    display: flex;
    justify-content: space-between;
    text-align: left !important;
    margin: 0 0 4pt;
    font-weight: 700;
}
p.protocol-meta span { font-weight: 700; }
p.contract-bullet {
    padding-left: 12pt;
    text-indent: -8pt;
}
table { border-collapse: collapse; width: 100%; }
.contract-signatures-block {
    page-break-before: always;
    break-before: page;
}
.protocol-signatures-block {
    margin-top: 4pt;
}
.contract-signatures-block table.contract-signatures-table,
.protocol-signatures-block table.contract-signatures-table {
    page-break-inside: avoid;
    break-inside: avoid;
    table-layout: fixed;
    border: 1px solid #000;
}
.contract-signatures-block table.contract-signatures-table > tr > td,
.contract-signatures-block table.contract-signatures-table > tbody > tr > td,
.protocol-signatures-block table.contract-signatures-table > tr > td,
.protocol-signatures-block table.contract-signatures-table > tbody > tr > td {
    border: 1px solid #000;
    width: 50%;
    padding: 4pt 6pt;
    vertical-align: top;
}
td, th {
    border: 1px solid #bbb;
    padding: 2px 4px;
    vertical-align: top;
    font-size: 9.5pt;
    line-height: 11.25pt;
}
.contract-signatures-block td,
.contract-signatures-block th,
.protocol-signatures-block td,
.protocol-signatures-block th {
    border-color: #000;
}
`;

function flattenNestedTablesInHtml(html) {
    let prev;
    do {
        prev = html;
        html = html.replace(
            /(<td[^>]*>)([\s\S]*?)<table>([\s\S]*?)<\/table>/i,
            (_, tdOpen, before, tableInner) => {
                const rows = tableInner.match(/<tr[\s\S]*?<\/tr>/gi) || [];
                const content = rows
                    .map((row) => {
                        const cells = row.match(/<td[\s\S]*?<\/td>/gi) || [];
                        return cells
                            .map((cell) => cell.replace(/^<td[^>]*>/i, '').replace(/<\/td>$/i, ''))
                            .join('');
                    })
                    .join('');
                return `${tdOpen}${before}${content}`;
            }
        );
    } while (html !== prev);
    return html;
}

function collapseSignaturesTableRow(html) {
    return html.replace(
        /(<table[^>]*>)(\s*<tr[^>]*>)([\s\S]*?)(<\/tr>)/i,
        (_, tableOpen, trOpen, rowInner, trClose) => {
            const tds = rowInner.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
            if (tds.length <= 2) return `${tableOpen}${trOpen}${rowInner}${trClose}`;

            const content = (td) => td.replace(/^<td[^>]*>/i, '').replace(/<\/td>$/i, '');
            const left = content(tds[0]);
            const right = tds
                .slice(1)
                .map(content)
                .filter((cell) => cell.replace(/<[^>]+>/g, '').trim())
                .join('');

            return `${tableOpen}${trOpen}<td>${left}</td><td>${right}</td>${trClose}`;
        }
    );
}

function cleanupOneSignaturesBlock(html, blockClass) {
    const start = html.indexOf(`<div class="${blockClass}">`);
    if (start === -1) return html;

    const tableStart = html.indexOf('<table', start);
    const tableEnd = findMatchingTableEnd(html, tableStart);
    if (tableEnd === -1) return html;

    const blockEnd = html.indexOf('</div>', tableEnd);
    let block = html.slice(start, blockEnd + 6);
    let tail = html.slice(blockEnd + 6);

    block = flattenNestedTablesInHtml(block);
    block = collapseSignaturesTableRow(block);
    block = block.replace(/<td>\s*<\/td>/gi, '');
    block = block.replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, '');
    block = block.replace(/<p>\s*-\s*<\/p>/gi, '');
    block = block.replace(/Тел\.:\s*/gi, 'тел.: ');
    block = block.replace(/(^|[\s>])\.:\s*\+/g, '$1тел.: +');
    block = block.replace(/(^|[\s>])\.:\s*/g, '$1тел.: ');
    block = block.replace(/<table>/i, '<table class="contract-signatures-table">');
    block = block.replace(/<table(?![^>]*class=)/i, '<table class="contract-signatures-table"');

    tail = tail.replace(/^\s*<p>\s*-\s*<\/p>/i, '');

    return html.slice(0, start) + block + tail;
}

function cleanupSignaturesBlock(html) {
    let out = html;
    out = cleanupOneSignaturesBlock(out, 'contract-signatures-block');
    out = cleanupOneSignaturesBlock(out, 'protocol-signatures-block');
    return out;
}

function findMatchingTableEnd(html, start) {
    let depth = 0;
    let i = start;
    while (i < html.length) {
        if (html.slice(i, i + 6).toLowerCase() === '<table') {
            depth += 1;
            i = html.indexOf('>', i) + 1;
            continue;
        }
        if (html.slice(i, i + 8).toLowerCase() === '</table>') {
            depth -= 1;
            if (depth === 0) return i + 8;
            i += 8;
            continue;
        }
        i += 1;
    }
    return -1;
}

function fixBulletGlyphs(html) {
    return html
        .replace(/[\uF0B7\uF0A7\uF076]/g, '• ')
        .replace(/<p>(\s*•\s*)/g, '<p class="contract-bullet">• ');
}

function cleanupStrayUnderscores(html) {
    return html
        .replace(/<p>\s*,\s*паспорт:/g, '<p>паспорт:')
        .replace(/<p>_____\s*,\s*/g, '<p>')
        .replace(/виданий\s+_+(\d)/g, 'виданий $1')
        .replace(/(№\s*[^_<]+?)_+(?=[,<])/g, '$1')
        .replace(/([^_\s<])_{3,}(?=<\/p>)/g, '$1')
        .replace(/([^_\s<])_{3,}(?=\s)/g, '$1');
}

function normalizeProtocolHeader(html) {
    if (!html.includes('Додаток №1')) return html;

    let out = html;

    out = out.replace(
        /<p class="contract-meta"><span>м\.\s*Київ<\/span><span>від\s+([^<]*)<\/span><\/p>/i,
        '<p class="protocol-meta"><span>м.Київ</span><span>Від $1</span></p>'
    );
    out = out.replace(
        /<p><strong>м\.Київ[\s\u00a0]+Від\s+([\s\S]*?)<\/strong><\/p>/i,
        '<p class="protocol-meta"><span>м.Київ</span><span>Від $1</span></p>'
    );
    out = out.replace(
        /<p><strong>м\.\s*Київ[\s\u00a0]+від\s+([\s\S]*?)<\/strong><\/p>/i,
        '<p class="protocol-meta"><span>м.Київ</span><span>Від $1</span></p>'
    );

    out = out.replace(/<p>Додаток №1[^<]*<\/p>/, '<p class="protocol-attach">Додаток №1</p>');
    out = out.replace(
        /<p>(до\s+Договору оренди\s+обладнання №[^<]*)<\/p>/,
        '<p class="protocol-attach">$1</p>'
    );
    out = out.replace(
        /<p>(від[^<]*року\.)<\/p>/i,
        '<p class="protocol-attach">$1</p>'
    );
    out = out.replace(
        /<p><strong>ПРОТОКОЛ<\/strong><\/p>/,
        '<p class="protocol-title"><strong>ПРОТОКОЛ</strong></p>'
    );
    out = out.replace(
        /<p><strong>Умови приймання та видачі обладнання\.<\/strong><\/p>/,
        '<p class="protocol-subtitle"><strong>Умови приймання та видачі обладнання.</strong></p>'
    );
    out = out.replace(
        /<p class="protocol-meta"><span>м\.Київ<\/span><span>Від (\d{2})([а-яіїєґ]+) (\d{4} року\.)<\/span><\/p>/iu,
        '<p class="protocol-meta"><span>м.Київ</span><span>Від $1/$2 $3</span></p>'
    );

    return out;
}

function wrapSignaturesBlock(html) {
    const markers = [
        { text: '18. Юридичні адреси', blockClass: 'contract-signatures-block' },
        { text: 'РЕКВІЗИТИ СТОРІН', blockClass: 'protocol-signatures-block' },
    ];
    let out = html;

    for (const { text: marker, blockClass } of markers) {
        const sectionIdx = out.indexOf(marker);
        if (sectionIdx === -1) continue;

        let sectionStart = out.lastIndexOf('<p class="contract-section">', sectionIdx);
        if (sectionStart === -1) {
            sectionStart = out.lastIndexOf('<p', sectionIdx);
        }
        if (sectionStart === -1) continue;

        const tableStart = out.indexOf('<table', sectionIdx);
        if (tableStart === -1) continue;

        const tableEnd = findMatchingTableEnd(out, tableStart);
        if (tableEnd === -1) continue;

        out = `${out.slice(0, sectionStart)}<div class="${blockClass}">${out.slice(sectionStart, tableEnd)}</div>${out.slice(tableEnd)}`;
    }

    return out;
}

function normalizeContractHtml(html) {
    let out = html;

    out = fixBulletGlyphs(out);
    out = normalizeProtocolHeader(out);

    out = out.replace(
        /<p><strong>Договір оренди обладнання №([^<]*)<\/strong><\/p>/i,
        '<p class="contract-title"><strong>Договір оренди обладнання №$1</strong></p>'
    );
    if (!out.includes('protocol-attach')) {
        out = out.replace(
            /<p><strong>м\.\s*Київ[\s\u00a0]+від\s+([\s\S]*?)<\/strong><\/p>/i,
            '<p class="contract-meta"><span>м. Київ</span><span>від $1</span></p>'
        );
    }
    out = out.replace(/<h2>([\s\S]*?)<\/h2>/gi, '<p class="contract-section">$1</p>');
    out = out.replace(
        /<p class="contract-bullet">•[^<]*<strong>РЕКВІЗИТИ СТОРІН<\/strong><\/p>/gi,
        '<p class="contract-section"><strong>РЕКВІЗИТИ СТОРІН</strong></p>'
    );
    out = out.replace(/<p><strong>РЕКВІЗИТИ СТОРІН<\/strong><\/p>/gi, '<p class="contract-section"><strong>РЕКВІЗИТИ СТОРІН</strong></p>');
    out = out.replace(/<ul>\s*<li>\s*<ol>/gi, '<div class="contract-list">');
    out = out.replace(/<\/ol>\s*<\/li>\s*<\/ul>/gi, '</div>');
    out = out.replace(/<\/?ol>/gi, '');
    out = out.replace(/<\/?ul>/gi, '');
    out = out.replace(/<li>/gi, '<p>');
    out = out.replace(/<\/li>/gi, '</p>');

    out = cleanupStrayUnderscores(out);
    out = wrapSignaturesBlock(out);
    out = cleanupSignaturesBlock(out);

    return out;
}

function wrapContractHtml(bodyHtml) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CONTRACT_PRINT_CSS}</style></head><body>${normalizeContractHtml(bodyHtml)}</body></html>`;
}

module.exports = {
    CONTRACT_PRINT_CSS,
    normalizeContractHtml,
    wrapContractHtml,
    wrapSignaturesBlock,
    findMatchingTableEnd,
    cleanupSignaturesBlock,
    flattenNestedTablesInHtml,
};
