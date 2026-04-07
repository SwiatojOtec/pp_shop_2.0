import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (n) => n ? Number(n).toFixed(2) : '—';
const fmtDate = (d) => {
    if (!d) return '___.____.______';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
};

const loadFontAsBase64 = async (url) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
};

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
    totalRentalAfterDiscount
}) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Load and embed Roboto (Cyrillic support)
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

    // --- Title ---
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont(fontName, 'normal');
    doc.text(`Додаток № 2 до Договору оренди обладнання №____ від __________ 2026 року.`, 297 - 10, 10, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(fontName, 'bold');
    doc.text(`АКТ ПРИЙМАННЯ-ПЕРЕДАЧІ №_____ від ${fmtDate(items[0]?.rentFrom)} року.`, 148.5, 18, { align: 'center' });
    doc.setFont(fontName, 'normal');

    // --- Parties table ---
    autoTable(doc, {
        startY: 22,
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
                        ? responsible.map((r, i) => `Відп. особа${responsible.length > 1 ? ` ${i+1}` : ''}: ${r.name}${r.phone ? `, ${r.phone}` : ''}`)
                        : [`Відповідальна особа: ___________________________`]
                    ),
                ].join('\n')
            ]
        ],
        styles: { fontSize: 8, cellPadding: 3, valign: 'top', font: fontName },
        headStyles: { fillColor: [180, 180, 180], textColor: [0,0,0], fontStyle: 'bold', fontSize: 8, font: fontName },
        columnStyles: { 0: { cellWidth: 143 }, 1: { cellWidth: 144 } },
        theme: 'grid',
        margin: { left: 5, right: 5 },
    });

    // --- INSTRUMENT label ---
    const afterParties = doc.lastAutoTable.finalY + 2;
    doc.setFillColor(220, 220, 220);
    doc.rect(5, afterParties, 287, 6, 'F');
    doc.setFontSize(9);
    doc.setFont(fontName, 'bold');
    doc.text('ІНСТРУМЕНТ:', 148.5, afterParties + 4.5, { align: 'center' });
    doc.setFont(fontName, 'normal');

    // --- Main table ---
    const tableHead = [[
        '№',
        'Комплектація',
        'Серійний №',
        'Інвентарний №',
        'Техн. стан',
        'Од.',
        'К-сть',
        'Вага кг',
        'Відновл. варт. / од.',
        'Відновл. варт. сума',
        'Заст. %',
        'Заст. сума',
        'Оренда з',
        'Оренда по',
        'Діб',
        'Тариф/доба',
        'Сума оренди',
    ]];

    const tableBody = [];

    items.forEach((item, idx) => {
        // Main row
        tableBody.push([
            { content: String(idx + 1), styles: { fontStyle: 'bold', halign: 'center', fillColor: [245, 245, 245] } },
            { content: item.name || '', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            item.serialNumber || 'b/n',
            item.inventoryNumber || '—',
            item.technicalCondition || '—',
            item.unit || 'sht',
            { content: String(item.quantity || 1), styles: { halign: 'center' } },
            { content: String(item.weightTotal || '—'), styles: { halign: 'center' } },
            { content: fmt(item.replacementCostPerUnit), styles: { halign: 'right' } },
            { content: fmt(item.replacementCostTotal), styles: { halign: 'right' } },
            { content: `${item.depositPercent || 0}%`, styles: { halign: 'center' } },
            { content: fmt(item.depositAmount), styles: { halign: 'right' } },
            { content: fmtDate(item.rentFrom), styles: { halign: 'center' } },
            { content: fmtDate(item.rentTo), styles: { halign: 'center' } },
            { content: String(item.days || 0), styles: { halign: 'center' } },
            { content: fmt(item.pricePerDay), styles: { halign: 'right' } },
            { content: fmt(item.totalRental), styles: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] } },
        ]);

        // Kit sub-rows
        if (Array.isArray(item.kitItems)) {
            item.kitItems.forEach((kit, ki) => {
                tableBody.push([
                    { content: `${idx+1}.${ki+1}`, styles: { halign: 'center', textColor: [150,150,150], fontSize: 7 } },
                    { content: `    ${kit}`, styles: { textColor: [80,80,80], fontSize: 7 } },
                    { content: 'б/н', styles: { fontSize: 7, textColor: [150,150,150] } },
                    { content: '—', styles: { fontSize: 7, textColor: [150,150,150] } },
                    { content: 'справний', styles: { fontSize: 7, textColor: [100,100,100] } },
                    { content: 'шт', styles: { fontSize: 7 } },
                    { content: '1', styles: { halign: 'center', fontSize: 7 } },
                    '','','','','','','','','','',
                ]);
            });
        }
    });

    // Totals row
    tableBody.push([
        { content: 'РАЗОМ:', colSpan: 9, styles: { halign: 'right', fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: fmt(items.reduce((s,i) => s + parseFloat(i.replacementCostTotal||0), 0)), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: '', styles: { fillColor: [230,230,230] } },
        { content: fmt(totalDeposit), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: '', colSpan: 4, styles: { fillColor: [230,230,230] } },
        { content: fmt(totalRental), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230,230,230] } },
    ]);

    autoTable(doc, {
        startY: afterParties + 8,
        head: tableHead,
        body: tableBody,
        styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak', font: fontName },
        headStyles: { fillColor: [200, 200, 200], textColor: [0,0,0], fontStyle: 'bold', fontSize: 7, halign: 'center', valign: 'middle', font: fontName },
        columnStyles: {
            0:  { cellWidth: 8 },
            1:  { cellWidth: 42 },
            2:  { cellWidth: 17 },
            3:  { cellWidth: 17 },
            4:  { cellWidth: 17 },
            5:  { cellWidth: 9 },
            6:  { cellWidth: 9 },
            7:  { cellWidth: 12 },
            8:  { cellWidth: 18 },
            9:  { cellWidth: 18 },
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

    // --- Totals block (discount + due) ---
    const safeTotalRental = parseFloat(totalRental || 0);
    const safeTotalDeposit = parseFloat(totalDeposit || 0);
    const safeDiscountAmount = Math.max(0, parseFloat(discountAmount || 0));
    const safeTotalRentalAfterDiscount =
        totalRentalAfterDiscount != null
            ? parseFloat(totalRentalAfterDiscount || 0)
            : Math.max(safeTotalRental - safeDiscountAmount, 0);
    const due = (safeTotalRentalAfterDiscount + safeTotalDeposit).toFixed(2);
    const dueY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setFont(fontName, 'normal');
    if (safeDiscountAmount > 0) {
        const discountLabel =
            discountType === 'percent'
                ? `Знижка (${Number(discountValue || 0).toFixed(2)}%)`
                : 'Знижка (грн)';
        doc.text(`${discountLabel}: -${fmt(safeDiscountAmount)} грн`, 292, dueY, { align: 'right' });
        doc.text(`Оренда зі знижкою: ${fmt(safeTotalRentalAfterDiscount)} грн`, 292, dueY + 5, { align: 'right' });
    }
    doc.setFont(fontName, 'bold');
    doc.text(`До сплати: ${fmt(due)} грн`, 292, dueY + (safeDiscountAmount > 0 ? 10 : 0), { align: 'right' });
    doc.setFont(fontName, 'normal');

    // --- Signatures ---
    const sigY = dueY + (safeDiscountAmount > 0 ? 20 : 10);
    doc.setFontSize(8);
    doc.setFont(fontName, 'bold');
    doc.text('Передав (Орендодавець):', 20, sigY);
    doc.text('Прийняв (Орендар):', 180, sigY);
    doc.setFont(fontName, 'normal');

    const sigLines = [
        [`П.І.Б.: ${lessor.name}`, `П.І.Б.: ${client.name || '___________________________'}`],
        [`Підпис: ___________________________`, `Підпис: ___________________________`],
        [`Дата: ____/____/________`, `Дата: ____/____/________`],
    ];
    sigLines.forEach((row, i) => {
        doc.text(row[0], 20, sigY + 6 + i * 7);
        doc.text(row[1], 180, sigY + 6 + i * 7);
    });

    // Save
    const filename = `zaiavka-${applicationNumber || 'new'}.pdf`;
    doc.save(filename);
};
