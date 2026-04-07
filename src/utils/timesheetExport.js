import ExcelJS from 'exceljs';

/** Скільки стовпців на один календарний день (об’єднуються в одну широку клітинку). */
const COLS_PER_DAY = 3;

function excelColName(colIndex) {
    let n = colIndex;
    let s = '';
    while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(65 + r) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

function colStartForDay(day) {
    return 2 + (day - 1) * COLS_PER_DAY;
}

/** Один рядок часу у форматі HH:MM (як у ручному табелі). */
function formatTimePair(h, m) {
    const hs = String(h ?? '').trim();
    const ms = String(m ?? '').trim();
    if (!hs && !ms) return '—';
    const hh = hs === '' ? '00' : String(Math.min(23, Math.max(0, parseInt(hs, 10) || 0))).padStart(2, '0');
    const mm = ms === '' ? '00' : String(Math.min(59, Math.max(0, parseInt(ms, 10) || 0))).padStart(2, '0');
    return `${hh}:${mm}`;
}

function mergeDayRange(rowIndex, day) {
    const c0 = colStartForDay(day);
    return `${excelColName(c0)}${rowIndex}:${excelColName(c0 + COLS_PER_DAY - 1)}${rowIndex}`;
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Експорт: на кожен день — 3 стовпці, злиті в одну клітинку; час приходу/виходу текстом «12:00».
 * Заголовки днів теж злиті на 3 стовпці (як у шаблоні користувача).
 */
export async function downloadTimesheetXlsx({ year, month, lastDay, dayMeta, labels, getCell }) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Табель', {
        properties: { defaultRowHeight: 18 }
    });

    const lastColIndex = 1 + lastDay * COLS_PER_DAY;

    const monthTitle = new Date(year, month - 1, 1).toLocaleString('uk-UA', { month: 'long', year: 'numeric' });
    const title = `ПАН ПІВДЕНЬБУД — табель, ${monthTitle}`;

    sheet.mergeCells(`A1:${excelColName(lastColIndex)}1`);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let d = 1; d <= lastDay; d++) {
        sheet.mergeCells(mergeDayRange(2, d));
        const c0 = colStartForDay(d);
        const cell = sheet.getCell(2, c0);
        cell.value = d;
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    sheet.getCell(2, 1).value = '';

    for (let d = 1; d <= lastDay; d++) {
        sheet.mergeCells(mergeDayRange(3, d));
        const c0 = colStartForDay(d);
        const meta = dayMeta[d - 1];
        const cell = sheet.getCell(3, c0);
        cell.value = meta.wdLabel;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (meta.weekend) {
            cell.font = { color: { argb: 'FFC53030' } };
        }
    }
    sheet.getCell(3, 1).value = '';

    let r = 4;
    for (let slot = 1; slot <= 3; slot++) {
        const name = labels[slot - 1] || `Співробітник ${slot}`;

        const rowArr = sheet.getRow(r);
        rowArr.getCell(1).value = `${name} — прихід`;
        rowArr.getCell(1).font = { bold: true };
        for (let d = 1; d <= lastDay; d++) {
            const c = getCell(d, slot);
            sheet.mergeCells(mergeDayRange(r, d));
            const c0 = colStartForDay(d);
            const cell = rowArr.getCell(c0);
            cell.value = formatTimePair(c.ah, c.am);
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        r++;
        const rowDep = sheet.getRow(r);
        rowDep.getCell(1).value = `${name} — вихід`;
        rowDep.getCell(1).font = { bold: true };
        for (let d = 1; d <= lastDay; d++) {
            const c = getCell(d, slot);
            sheet.mergeCells(mergeDayRange(r, d));
            const c0 = colStartForDay(d);
            const cell = rowDep.getCell(c0);
            cell.value = formatTimePair(c.dh, c.dm);
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        r++;
    }

    sheet.getColumn(1).width = 30;
    for (let col = 2; col <= lastColIndex; col++) {
        sheet.getColumn(col).width = 5;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const fn = `tabil-pan-pivdenbud-${year}-${String(month).padStart(2, '0')}.xlsx`;
    triggerDownload(blob, fn);
}
