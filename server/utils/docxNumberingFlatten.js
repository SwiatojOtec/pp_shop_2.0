const PizZip = require('pizzip');

function parseNumberingXml(xml) {
    const abstractNums = new Map();
    const numToAbstract = new Map();

    const abstractBlocks = xml.match(/<w:abstractNum[\s\S]*?<\/w:abstractNum>/g) || [];
    for (const block of abstractBlocks) {
        const idMatch = block.match(/w:abstractNumId="(\d+)"/);
        if (!idMatch) continue;
        const abstractNumId = idMatch[1];
        const levels = new Map();

        const lvlBlocks = block.match(/<w:lvl[\s\S]*?<\/w:lvl>/g) || [];
        for (const lvlBlock of lvlBlocks) {
            const ilvlMatch = lvlBlock.match(/w:ilvl="(\d+)"/);
            if (!ilvlMatch) continue;
            const ilvl = ilvlMatch[1];
            const startMatch = lvlBlock.match(/<w:start w:val="(\d+)"/);
            const fmtMatch = lvlBlock.match(/<w:numFmt w:val="([^"]+)"/);
            const textMatch = lvlBlock.match(/<w:lvlText w:val="([^"]+)"/);
            levels.set(ilvl, {
                start: startMatch ? parseInt(startMatch[1], 10) : 1,
                numFmt: fmtMatch ? fmtMatch[1] : 'decimal',
                lvlText: textMatch ? textMatch[1] : '%1.',
            });
        }

        abstractNums.set(abstractNumId, levels);
    }

    const numBlocks = xml.match(/<w:num[\s\S]*?<\/w:num>/g) || [];
    for (const block of numBlocks) {
        const numIdMatch = block.match(/w:numId="(\d+)"/);
        const abstractMatch = block.match(/<w:abstractNumId w:val="(\d+)"/);
        if (numIdMatch && abstractMatch) {
            numToAbstract.set(numIdMatch[1], abstractMatch[1]);
        }
    }

    return { abstractNums, numToAbstract };
}

function formatNumber(value, numFmt) {
    if (numFmt === 'bullet') return '–';
    return String(value);
}

function buildLabel(lvlText, counters, levels) {
    return lvlText.replace(/%(\d+)/g, (_, levelIndex) => {
        const ilvl = String(Number(levelIndex) - 1);
        const level = levels.get(ilvl);
        const counter = counters.get(ilvl) ?? level?.start ?? 1;
        return formatNumber(counter, level?.numFmt || 'decimal');
    });
}

function getParagraphText(pBlock) {
    return (pBlock.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
        .map((t) => t.replace(/<[^>]+>/g, ''))
        .join('');
}

function isCenteredSection(pBlock, text) {
    if (!text) return false;
    if (/<w:jc w:val="center"/.test(pBlock)) return true;
    if (/<w:pStyle w:val="2"/.test(pBlock) && /Договору|оренди|передачі|повернення|Строк|Порядок|Мета|Відповідальність|Розірвання|Форс|Заключні|Додаткові/i.test(text)) {
        return true;
    }
    return false;
}

function escapeXmlText(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function prependRun(pBlock, label) {
    const insert = `<w:r><w:rPr><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(label)} </w:t></w:r>`;
    if (/<\/w:pPr>/.test(pBlock)) {
        return pBlock.replace(/<\/w:pPr>/, `</w:pPr>${insert}`);
    }
    return pBlock.replace(/(<w:p[^>]*>)/, `$1<w:pPr/>${insert}`);
}

function stripNumPr(pBlock) {
    return pBlock.replace(/<w:numPr>[\s\S]*?<\/w:numPr>/g, '');
}

function findMatchingXmlTagEnd(xml, start, tagName) {
    const open = `<${tagName}`;
    const close = `</${tagName}>`;
    let depth = 0;
    let i = start;
    while (i < xml.length) {
        if (xml.slice(i, i + open.length) === open && (xml[i + open.length] === '>' || xml[i + open.length] === ' ')) {
            depth += 1;
            i = xml.indexOf('>', i) + 1;
            continue;
        }
        if (xml.slice(i, i + close.length) === close) {
            depth -= 1;
            if (depth === 0) return i + close.length;
            i += close.length;
            continue;
        }
        i += 1;
    }
    return -1;
}

function flattenAllNestedTablesInXml(tblXml) {
    let out = tblXml;
    let prev;
    do {
        prev = out;
        const nestedStart = out.indexOf('<w:tbl>', '<w:tbl>'.length);
        if (nestedStart === -1) break;
        const nestedEnd = findMatchingXmlTagEnd(out, nestedStart, 'w:tbl');
        if (nestedEnd === -1) break;
        const nested = out.slice(nestedStart, nestedEnd);
        const paragraphs = nested.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
        out = out.slice(0, nestedStart) + paragraphs.join('') + out.slice(nestedEnd);
    } while (out !== prev);
    return out;
}

function getTcBlocks(trXml) {
    const cells = [];
    let pos = 0;
    while (pos < trXml.length) {
        const start = trXml.indexOf('<w:tc', pos);
        if (start === -1) break;
        const end = findMatchingXmlTagEnd(trXml, start, 'w:tc');
        if (end === -1) break;
        cells.push(trXml.slice(start, end));
        pos = end;
    }
    return cells;
}

function getTcContentOnly(tcXml) {
    return tcXml
        .replace(/^<w:tc[^>]*>/, '')
        .replace(/<\/w:tc>$/, '')
        .replace(/<w:tcPr>[\s\S]*?<\/w:tcPr>/, '');
}

function getTcPr(tcXml) {
    return tcXml.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] || '<w:tcPr><w:tcW w:w="5103" w:type="dxa"/></w:tcPr>';
}

function collapseFirstRowToTwoCells(tblXml) {
    const trStart = tblXml.search(/<w:tr[\s>]/);
    if (trStart === -1) return tblXml;

    const trEnd = findMatchingXmlTagEnd(tblXml, trStart, 'w:tr');
    if (trEnd === -1) return tblXml;

    const trXml = tblXml.slice(trStart, trEnd);
    const trPr = trXml.match(/<w:trPr>[\s\S]*?<\/w:trPr>/)?.[0] || '';
    const cells = getTcBlocks(trXml);
    if (cells.length <= 2) return tblXml;

    const inner0 = getTcContentOnly(cells[0]);
    const inner1 = cells.slice(1).map(getTcContentOnly).join('');
    const newTr = `<w:tr>${trPr}<w:tc>${getTcPr(cells[0])}${inner0}</w:tc><w:tc>${getTcPr(cells[1])}${inner1}</w:tc></w:tr>`;

    return tblXml.slice(0, trStart) + newTr + tblXml.slice(trEnd);
}

function findSignaturesTableBounds(documentXml) {
    const markerIdx = documentXml.search(/ОРЕНДОДАВЕЦЬ|18\. Юридичні адреси/);
    if (markerIdx === -1) {
        const last = documentXml.lastIndexOf('<w:tbl>');
        if (last === -1) return null;
        return { start: last, end: findMatchingXmlTagEnd(documentXml, last, 'w:tbl') };
    }

    let best = null;
    let pos = documentXml.indexOf('<w:tbl>');
    while (pos !== -1 && pos <= markerIdx + 8000) {
        const end = findMatchingXmlTagEnd(documentXml, pos, 'w:tbl');
        if (end === -1) break;
        const slice = documentXml.slice(pos, end);
        if (slice.includes('ОРЕНДОДАВЕЦЬ') || slice.includes('ОРЕНДАР')) {
            best = { start: pos, end };
        }
        pos = documentXml.indexOf('<w:tbl>', pos + 1);
    }

    if (best) return best;

    const last = documentXml.lastIndexOf('<w:tbl>');
    if (last === -1) return null;
    return { start: last, end: findMatchingXmlTagEnd(documentXml, last, 'w:tbl') };
}

function cleanupSignaturesTableInDocx(documentXml) {
    const bounds = findSignaturesTableBounds(documentXml);
    if (!bounds) return documentXml;

    const { start: tblStart, end: tblEnd } = bounds;
    let tbl = documentXml.slice(tblStart, tblEnd);
    tbl = flattenAllNestedTablesInXml(tbl);
    tbl = collapseFirstRowToTwoCells(tbl);
    tbl = tbl.replace(
        /<w:tblGrid>[\s\S]*?<\/w:tblGrid>/,
        '<w:tblGrid><w:gridCol w:w="5103"/><w:gridCol w:w="5103"/></w:tblGrid>'
    );

    let after = documentXml.slice(tblEnd);
    after = after.replace(
        /<w:p[\s\S]*?<w:t[^>]*>\s*-\s*<\/w:t>[\s\S]*?<\/w:p>/,
        (match) => (match.length < 600 ? '' : match)
    );

    return documentXml.slice(0, tblStart) + tbl + after;
}

function stripPageBreaks(pBlock) {
    return pBlock
        .replace(/<w:pageBreakBefore[^>]*\/>/g, '')
        .replace(/<w:lastRenderedPageBreak\/>/g, '');
}

function addPageBreakBeforeSignatures(documentXml) {
    const paragraphs = documentXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
    const updated = paragraphs.map((pBlock) => {
        const text = getParagraphText(pBlock);
        if (/РЕКВІЗИТИ СТОРІН/.test(text)) {
            return stripPageBreaks(pBlock);
        }
        if (!/18\. Юридичні адреси/.test(text)) return pBlock;
        if (/<w:pageBreakBefore/.test(pBlock)) return pBlock;
        if (/<w:pPr>/.test(pBlock)) {
            return pBlock.replace('<w:pPr>', '<w:pPr><w:pageBreakBefore w:val="1"/>');
        }
        return pBlock.replace(/(<w:p[^>]*>)/, '$1<w:pPr><w:pageBreakBefore w:val="1"/></w:pPr>');
    });

    let idx = 0;
    return documentXml.replace(/<w:p[\s\S]*?<\/w:p>/g, () => updated[idx++] || '');
}

function removeSignatureTablePageBreaks(documentXml) {
    const bounds = findSignaturesTableBounds(documentXml);
    if (!bounds) return documentXml;

    const before = documentXml.slice(0, bounds.start);
    let tbl = documentXml.slice(bounds.start, bounds.end);
    const after = documentXml.slice(bounds.end);

    tbl = tbl.replace(/<w:pageBreakBefore[^>]*\/>/g, '');
    tbl = tbl.replace(/<w:lastRenderedPageBreak\/>/g, '');

    return before + tbl + after;
}

function flattenDocxNumbering(docxBuffer) {
    const zip = new PizZip(docxBuffer);
    const numberingXml = zip.file('word/numbering.xml')?.asText() || '';
    const { abstractNums, numToAbstract } = parseNumberingXml(numberingXml);

    let documentXml = zip.file('word/document.xml').asText();
    const paragraphs = documentXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
    const countersByNumId = new Map();

    const updated = paragraphs.map((pBlock) => {
        const numPrMatch = pBlock.match(/<w:numPr>[\s\S]*?<\/w:numPr>/);
        if (!numPrMatch) return pBlock;

        const ilvlMatch = numPrMatch[0].match(/w:ilvl w:val="(\d+)"/);
        const numIdMatch = numPrMatch[0].match(/w:numId w:val="(\d+)"/);
        if (!ilvlMatch || !numIdMatch) return stripNumPr(pBlock);

        const ilvl = ilvlMatch[1];
        const numId = numIdMatch[1];
        const abstractNumId = numToAbstract.get(numId);
        const levels = abstractNums.get(abstractNumId);
        if (!levels) return stripNumPr(pBlock);

        if (!countersByNumId.has(numId)) countersByNumId.set(numId, new Map());
        const counters = countersByNumId.get(numId);

        for (const key of [...counters.keys()]) {
            if (Number(key) > Number(ilvl)) counters.delete(key);
        }

        const level = levels.get(ilvl);
        const current = counters.has(ilvl) ? counters.get(ilvl) + 1 : (level?.start ?? 1);
        counters.set(ilvl, current);

        const label = buildLabel(level?.lvlText || '%1.', counters, levels);
        const text = getParagraphText(pBlock).trim();
        let next = stripNumPr(pBlock);

        if (label && label !== '–') {
            const displayLabel = isCenteredSection(pBlock, text)
                ? (label.endsWith('.') ? label : `${label}.`)
                : label;
            next = prependRun(next, displayLabel);
        }

        return next;
    });

    let idx = 0;
    documentXml = documentXml.replace(/<w:p[\s\S]*?<\/w:p>/g, () => updated[idx++] || '');
    documentXml = addPageBreakBeforeSignatures(documentXml);
    documentXml = removeSignatureTablePageBreaks(documentXml);
    documentXml = cleanupSignaturesTableInDocx(documentXml);
    zip.file('word/document.xml', documentXml);
    return zip.generate({ type: 'nodebuffer' });
}

module.exports = {
    flattenDocxNumbering,
};
