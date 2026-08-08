import jsPDF from 'jspdf';
import { buildRentalActContractRef, formatContractDate } from './rentalContractRef';
import autoTable from 'jspdf-autotable';

const PAGE_BOTTOM = 205;
const PAGE_RIGHT = 292;

const fmt = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '—');
const fmtMoney = (n, zeroAmounts) => (zeroAmounts ? '0.00' : fmt(n));
const fmtDate = (d) => {
    if (!d) return '___.____.______';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
};

const fmtFormalUaDate = (d) => {
    if (!d) return '«____» _____.______';
    const { day, month, year } = formatContractDate(d);
    if (!month || day === '__') return '«____» _____.______';
    return `«${day}» ${month} ${year}`;
};

const loadFontAsBase64 = async (url) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
};

const HANDOVER_LEGAL_TEXT = [
    '1. Підтвердження стану Обладнання та інструктажу (АКТОВА ЧАСТИНА):',
    '1.1. Підписанням цього документа Орендар підтверджує, що він особисто оглянув Обладнання, перевірив його працездатність, комплектність та зовнішній вигляд у присутності Орендодавця. Обладнання передається у технічно справному стані. Претензій Орендар не має.',
    '1.2. Орендар підтверджує, що Орендодавець провів інструктаж з техніки безпеки та правил експлуатації Обладнання. Будь-які ризики випадкової загибелі або пошкодження переходять до Орендаря з моменту підписання цього документа.',
    '1.3. АКЦЕПТ ОФЕРТИ: Підписанням цієї Специфікації-Акта Орендар повністю та беззаперечно приймає (акцептує) усі умови Публічного договору (оферти) оренди обладнання, затвердженого Орендодавцем, та надає згоду на обробку своїх персональних даних.',
    '2. Заключні положення: Ця Специфікація-Акт складена на паперовому носії у двох ідентичних примірниках, які мають однакову юридичну силу, і є невід\'ємною частиною Публічного договору (оферти) оренди обладнання.',
];

export const RENTAL_PDF_VARIANTS = {
    handover: {
        title: (formalDate) => `Специфікація-Акт прийому-передачі № _____ від  ${formalDate} року.`,
        titleDate: (items) => items[0]?.rentFrom,
        filename: (applicationNumber) => `zaiavka-${applicationNumber || 'new'}.pdf`,
        zeroAmounts: false,
        isHandover: true,
    },
    return_inspection: {
        title: (date) => `АКТ ПОВЕРНЕННЯ-ОГЛЯДУ ТЕХНІЧНОГО СТАНУ №_____ від ${date} року.`,
        titleDate: (items) => items[0]?.rentTo || items[0]?.rentFrom,
        filename: (applicationNumber) => `akt-povernennia-${applicationNumber || 'new'}.pdf`,
        zeroAmounts: true,
        isHandover: false,
    },
};

function resolveMinRentDays(items = []) {
    const days = (items || [])
        .map((item) => Number(item?.days) || 0)
        .filter((n) => n > 0);
    if (!days.length) return '____';
    return String(Math.max(...days));
}

function countKitRows(items = []) {
    return (items || []).reduce(
        (sum, item) => sum + (Array.isArray(item.kitItems) ? item.kitItems.length : 0),
        0
    );
}

export const generateRentalPdf = async ({
    applicationNumber,
    lessor,
    client,
    responsible,
    items,
    totalRental,
    totalDeposit,
    discountType = 'fixed',
    discountValue = 0,
    discountAmount = 0,
    totalRentalAfterDiscount,
    contractRef,
}, options = {}) => {
    const variantKey = options.variant === 'return_inspection' ? 'return_inspection' : 'handover';
    const variant = RENTAL_PDF_VARIANTS[variantKey];
    const zeroAmounts = variant.zeroAmounts;
    const isHandover = !!variant.isHandover;
    const kitRows = countKitRows(items);
    const compact = isHandover && kitRows >= 5;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    let fontName = 'helvetica';
    try {
        const [regularB64, boldB64] = await Promise.all([
            loadFontAsBase64('/fonts/Roboto-Regular.ttf'),
            loadFontAsBase64('/fonts/Roboto-Bold.ttf'),
        ]);
        doc.addFileToVFS('Roboto-Regular.ttf', regularB64);
        doc.addFileToVFS('Roboto-Bold.ttf', boldB64);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
        fontName = 'Roboto';
        doc.setFont(fontName);
    } catch (e) {
        console.warn('Font load failed, using fallback', e);
        doc.setFont('helvetica');
    }

    // --- Title / appendix ---
    const ref = contractRef || buildRentalActContractRef(null, { id: applicationNumber, applicationNumber });
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.setFont(fontName, 'normal');
    ref.appendixLines.forEach((line, index) => {
        doc.text(line, PAGE_RIGHT, 7 + index * 3.2, { align: 'right' });
    });

    doc.setFontSize(compact ? 9.5 : 10.5);
    doc.setTextColor(0, 0, 0);
    doc.setFont(fontName, 'bold');
    const titleDateRaw = variant.titleDate(items);
    const titleText = isHandover
        ? variant.title(fmtFormalUaDate(titleDateRaw))
        : variant.title(fmtDate(titleDateRaw));
    doc.text(titleText, 148.5, 16, { align: 'center' });
    doc.setFont(fontName, 'normal');

    // --- Parties ---
    autoTable(doc, {
        startY: 18.5,
        head: [['ОРЕНДОДАВЕЦЬ', 'ОРЕНДАР']],
        body: [
            [
                [
                    `ФОП П.І.Б.: ${lessor.name}`,
                    `ІПН: ${lessor.ipn}`,
                    `Адреса: ${lessor.address}`,
                    `Телефон: ${lessor.phone}`,
                    `E-mail: ${lessor.email}`,
                    `Склад: ${lessor.warehouseAddress}`,
                ].join('\n'),
                [
                    `Фіз. особа П.І.Б.: ${client.name || '___________________________'}`,
                    `Телефон: ${client.phone || '___________________________'}`,
                    `E-mail: ${client.email || '___________________________'}`,
                    `Паспорт/ID: ${client.passport || '___________________________'}`,
                    `Адреса проживання: ${client.address || '___________________________'}`,
                    `Адреса майданчика: ${client.siteAddress || '___________________________'}`,
                    ...(responsible && responsible.length > 0
                        ? responsible.map((r, i) => `Відп. особа${responsible.length > 1 ? ` ${i + 1}` : ''}: ${r.name}${r.phone ? `, ${r.phone}` : ''}`)
                        : ['Відповідальна особа: ___________________________']),
                ].join('\n'),
            ],
        ],
        styles: { fontSize: compact ? 6.5 : 7, cellPadding: compact ? 1.2 : 1.6, valign: 'top', font: fontName, lineWidth: 0.2 },
        headStyles: {
            fillColor: [180, 180, 180],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: compact ? 6.5 : 7,
            font: fontName,
            cellPadding: compact ? 1 : 1.3,
        },
        columnStyles: { 0: { cellWidth: 143 }, 1: { cellWidth: 144 } },
        theme: 'grid',
        margin: { left: 5, right: 5 },
    });

    let afterParties = doc.lastAutoTable.finalY + 1.2;

    // --- Preamble ---
    if (isHandover) {
        const preamble1 = 'Сторони склали цю Специфікацію-Акт прийому-передачі про те, що Орендодавець передає, а Орендар приймає у строкове платне користування наступне Обладнання';
        const preamble2 = `Мінімальний строк оренди інструменту за цим Актом: ${resolveMinRentDays(items)} діб.`;
        doc.setFontSize(compact ? 6.5 : 7);
        doc.setFont(fontName, 'normal');
        doc.setTextColor(0, 0, 0);
        const lines1 = doc.splitTextToSize(preamble1, 287);
        doc.text(lines1, 5, afterParties + 2.8);
        afterParties += 2.8 + lines1.length * (compact ? 2.7 : 3);
        doc.text(preamble2, 5, afterParties + 1.5);
        afterParties += compact ? 4 : 4.8;
    }

    // --- INSTRUMENT label ---
    const labelH = compact ? 4.5 : 5.2;
    doc.setFillColor(220, 220, 220);
    doc.rect(5, afterParties, 287, labelH, 'F');
    doc.setFontSize(compact ? 7.5 : 8);
    doc.setFont(fontName, 'bold');
    doc.text('ІНСТРУМЕНТ:', 148.5, afterParties + labelH * 0.72, { align: 'center' });
    doc.setFont(fontName, 'normal');

    // --- Main table ---
    const tableHead = [[
        '№', 'Комплектація', 'Серійний №', 'Інвентарний №', 'Техн. стан', 'Од.', 'К-сть', 'Вага кг',
        'Відновл. варт. / од.', 'Відновл. варт. сума', 'Заст. %', 'Заст. сума',
        'Оренда з', 'Оренда по', 'Діб', 'Тариф/доба', 'Сума оренди',
    ]];

    const tableBody = [];
    items.forEach((item, idx) => {
        tableBody.push([
            { content: String(idx + 1), styles: { fontStyle: 'bold', halign: 'center', fillColor: [245, 245, 245] } },
            { content: item.name || '', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            item.serialNumber || 'б/н',
            item.inventoryNumber || '—',
            item.technicalCondition || '—',
            item.unit || 'шт',
            { content: String(item.quantity || 1), styles: { halign: 'center' } },
            { content: String(item.weightTotal || '—'), styles: { halign: 'center' } },
            { content: fmtMoney(item.replacementCostPerUnit, zeroAmounts), styles: { halign: 'right' } },
            { content: fmtMoney(item.replacementCostTotal, zeroAmounts), styles: { halign: 'right' } },
            { content: zeroAmounts ? '0%' : `${item.depositPercent || 0}%`, styles: { halign: 'center' } },
            { content: fmtMoney(item.depositAmount, zeroAmounts), styles: { halign: 'right' } },
            { content: fmtDate(item.rentFrom), styles: { halign: 'center' } },
            { content: fmtDate(item.rentTo), styles: { halign: 'center' } },
            { content: String(item.days || 0), styles: { halign: 'center' } },
            { content: fmtMoney(item.pricePerDay, zeroAmounts), styles: { halign: 'right' } },
            {
                content: fmtMoney(item.totalRental, zeroAmounts),
                styles: {
                    halign: 'right',
                    fontStyle: 'bold',
                    textColor: zeroAmounts ? [0, 0, 0] : [22, 163, 74],
                },
            },
        ]);

        if (Array.isArray(item.kitItems)) {
            item.kitItems.forEach((kit, ki) => {
                tableBody.push([
                    { content: `${idx + 1}.${ki + 1}`, styles: { halign: 'center', textColor: [120, 120, 120], fontSize: 6 } },
                    { content: `  ${kit}`, styles: { textColor: [70, 70, 70], fontSize: 6 } },
                    { content: 'б/н', styles: { fontSize: 6, textColor: [140, 140, 140] } },
                    { content: '—', styles: { fontSize: 6, textColor: [140, 140, 140] } },
                    { content: 'справний', styles: { fontSize: 6, textColor: [100, 100, 100] } },
                    { content: 'шт', styles: { fontSize: 6 } },
                    { content: '1', styles: { halign: 'center', fontSize: 6 } },
                    '', '', '', '', '', '', '', '', '', '',
                ]);
            });
        }
    });

    const sumReplacement = zeroAmounts
        ? 0
        : items.reduce((s, i) => s + parseFloat(i.replacementCostTotal || 0), 0);
    const displayTotalDeposit = zeroAmounts ? 0 : totalDeposit;
    const displayTotalRental = zeroAmounts ? 0 : totalRental;

    tableBody.push([
        { content: 'РАЗОМ:', colSpan: 9, styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: fmtMoney(sumReplacement, zeroAmounts), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: '', styles: { fillColor: [230, 230, 230] } },
        { content: fmtMoney(displayTotalDeposit, zeroAmounts), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: '', colSpan: 4, styles: { fillColor: [230, 230, 230] } },
        { content: fmtMoney(displayTotalRental, zeroAmounts), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
    ]);

    autoTable(doc, {
        startY: afterParties + labelH + 0.8,
        head: tableHead,
        body: tableBody,
        styles: {
            fontSize: compact ? 6.2 : 6.8,
            cellPadding: compact ? 0.7 : 1,
            overflow: 'linebreak',
            font: fontName,
            lineWidth: 0.15,
            valign: 'middle',
        },
        headStyles: {
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: compact ? 5.8 : 6.3,
            halign: 'center',
            valign: 'middle',
            font: fontName,
            cellPadding: compact ? 0.6 : 0.8,
        },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 42 },
            2: { cellWidth: 17 },
            3: { cellWidth: 17 },
            4: { cellWidth: 17 },
            5: { cellWidth: 9 },
            6: { cellWidth: 9 },
            7: { cellWidth: 12 },
            8: { cellWidth: 18 },
            9: { cellWidth: 18 },
            10: { cellWidth: 11 },
            11: { cellWidth: 18 },
            12: { cellWidth: 18 },
            13: { cellWidth: 18 },
            14: { cellWidth: 9 },
            15: { cellWidth: 17 },
            16: { cellWidth: 19 },
        },
        theme: 'grid',
        margin: { left: 5, right: 5 },
    });

    // --- Totals ---
    const safeTotalRental = zeroAmounts ? 0 : parseFloat(totalRental || 0);
    const safeTotalDeposit = zeroAmounts ? 0 : parseFloat(totalDeposit || 0);
    const safeDiscountAmount = zeroAmounts ? 0 : Math.max(0, parseFloat(discountAmount || 0));
    const hasDiscount = safeDiscountAmount > 0.0001;
    const safeTotalRentalAfterDiscount = zeroAmounts
        ? 0
        : (totalRentalAfterDiscount != null
            ? parseFloat(totalRentalAfterDiscount || 0)
            : Math.max(safeTotalRental - safeDiscountAmount, 0));
    const due = zeroAmounts ? 0 : (safeTotalRentalAfterDiscount + safeTotalDeposit);

    let cursorY = doc.lastAutoTable.finalY + (compact ? 2.5 : 3.5);

    if (isHandover) {
        const discountPctLabel = discountType === 'percent'
            ? `${Number(discountValue || 0).toFixed(0)}%`
            : 'грн';

        const moneyLines = [
            { label: 'Загальна сума платежу за послуги оренди:', value: `${fmt(safeTotalRental)} грн`, bold: false },
        ];
        if (hasDiscount) {
            moneyLines.push(
                { label: `Знижка на послуги оренди (${discountPctLabel}):`, value: `-${fmt(safeDiscountAmount)} грн`, bold: false },
                { label: 'Загальна сума платежу за послуги оренди зі знижкою:', value: `${fmt(safeTotalRentalAfterDiscount)} грн`, bold: false },
            );
        }
        moneyLines.push(
            { label: 'Загальна сума гарантійного платежу:', value: `${fmt(safeTotalDeposit)} грн`, bold: false },
            { label: 'Всього до сплати (Аванс + Застава):', value: `${fmt(due)} грн`, bold: true },
        );

        // Two-column footer: legal left, money right — saves vertical space
        const moneyStartY = cursorY;
        const moneyX = PAGE_RIGHT;
        const moneyWidth = 118;
        const legalWidth = 165;
        const lineH = compact ? 3.3 : 3.6;

        doc.setFontSize(compact ? 7 : 7.5);
        moneyLines.forEach((row) => {
            doc.setFont(fontName, row.bold ? 'bold' : 'normal');
            doc.text(`${row.label} ${row.value}`, moneyX, cursorY, { align: 'right' });
            cursorY += lineH;
        });

        doc.setFont(fontName, 'normal');
        doc.setFontSize(compact ? 6 : 6.5);
        const note = 'Ці суми Орендар сплачує на підставі виставленого рахунку до моменту фактичної видачі Обладнання';
        const noteLines = doc.splitTextToSize(note, moneyWidth);
        doc.text(noteLines, moneyX, cursorY + 0.8, { align: 'right' });
        const moneyBlockBottom = cursorY + 0.8 + noteLines.length * (compact ? 2.5 : 2.8);

        // Legal text on the left, starting at same Y as money
        let legalY = moneyStartY;
        doc.setFontSize(compact ? 5.8 : 6.2);
        doc.setFont(fontName, 'normal');
        HANDOVER_LEGAL_TEXT.forEach((paragraph) => {
            const wrapped = doc.splitTextToSize(paragraph, legalWidth);
            doc.text(wrapped, 5, legalY);
            legalY += wrapped.length * (compact ? 2.35 : 2.55) + (compact ? 0.6 : 0.8);
        });

        cursorY = Math.max(moneyBlockBottom, legalY) + (compact ? 2 : 3);
    } else {
        doc.setFontSize(9);
        doc.setFont(fontName, 'bold');
        doc.text(`До сплати: ${fmt(due)} грн`, PAGE_RIGHT, cursorY, { align: 'right' });
        doc.setFont(fontName, 'normal');
        cursorY += 6;
    }

    // --- Signatures ---
    const sigBlockH = 22;
    if (cursorY + sigBlockH > PAGE_BOTTOM) {
        // Soft squeeze: keep on page if barely over
        if (cursorY + sigBlockH <= PAGE_BOTTOM + 4) {
            cursorY = PAGE_BOTTOM - sigBlockH;
        } else {
            doc.addPage();
            cursorY = 12;
        }
    }

    const sigY = cursorY;
    doc.setFontSize(7);
    doc.setFont(fontName, 'bold');
    doc.text('Передав (Орендодавець):', 20, sigY);
    doc.text('Прийняв (Орендар):', 180, sigY);
    doc.setFont(fontName, 'normal');

    const sigLines = [
        [`П.І.Б.: ${lessor.name}`, `П.І.Б.: ${client.name || '___________________________'}`],
        ['Підпис: ___________________________', 'Підпис: ___________________________'],
        ['Дата: ____/____/________', 'Дата: ____/____/________'],
    ];
    sigLines.forEach((row, i) => {
        doc.text(row[0], 20, sigY + 5 + i * 5.5);
        doc.text(row[1], 180, sigY + 5 + i * 5.5);
    });

    const filename = variant.filename(applicationNumber);
    const download = options.download !== false;
    const returnBlob = !!options.returnBlob;

    if (download) {
        doc.save(filename);
    }

    if (returnBlob) {
        return { blob: doc.output('blob'), filename };
    }
};
