import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStockStatusBadgeProps } from './stockStatus';

const loadFontAsBase64 = async (url) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

/** Builds and downloads the "Звіт по залишках" PDF for the currently viewed warehouse. */
export async function exportWarehousePdf({ warehouseName, rows }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
        doc.setFont(fontName, 'normal');
    } catch (e) {
        console.warn('Warehouse PDF font load failed, using fallback', e);
        doc.setFont('helvetica', 'normal');
    }

    doc.setFont(fontName, 'bold');
    doc.setFontSize(16);
    doc.text('Склади · Звіт по залишках', 40, 40);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(10);
    doc.text(`Склад: ${warehouseName || '—'}`, 40, 58);
    doc.text(`Сформовано: ${dateStr}`, 40, 72);
    doc.text(`Позицій: ${rows.length}`, 40, 86);

    const body = rows.map((row) => {
        const p = row.Product || {};
        return [
            p.name || '—',
            p.inventoryNumber || p.sku || '—',
            p.category || '—',
            getStockStatusBadgeProps(p, row).label,
            row.quantity ?? 0,
            row.committedQuantity ?? 0,
            p.quantityAvailable ?? 0,
        ];
    });

    autoTable(doc, {
        startY: 102,
        head: [['Товар', 'Інв. № / SKU', 'Категорія', 'Статус', 'На складі', 'В оренді', 'Вільно']],
        body,
        styles: { font: fontName, fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [26, 26, 26], font: fontName, fontStyle: 'bold' },
        margin: { left: 24, right: 24 },
        tableWidth: 'auto',
        columnStyles: {
            0: { cellWidth: 280 },
            1: { cellWidth: 90 },
            2: { cellWidth: 90 },
            3: { cellWidth: 100 },
            4: { cellWidth: 56, halign: 'right' },
            5: { cellWidth: 56, halign: 'right' },
            6: { cellWidth: 56, halign: 'right' },
        },
    });

    const safeName = String(warehouseName || 'sklad').replace(/[^\wЀ-ӿ-]+/g, '_');
    doc.save(`sklad_${safeName}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`);
}

/** "Журнал → Експорт" (docs/admin-redesign/03-screens.md, 1.3) — exports the
 *  currently loaded/filtered events feed. */
export async function exportWarehouseEventsPdf({ events }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
        doc.setFont(fontName, 'normal');
    } catch (e) {
        console.warn('Events PDF font load failed, using fallback', e);
        doc.setFont('helvetica', 'normal');
    }

    doc.setFont(fontName, 'bold');
    doc.setFontSize(16);
    doc.text('Склад · Журнал подій', 40, 40);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(10);
    doc.text(`Сформовано: ${dateStr}`, 40, 58);
    doc.text(`Подій: ${events.length}`, 40, 72);

    const fmtDateTime = (d) => {
        if (!d) return '—';
        const x = new Date(d);
        return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
    };

    const body = events.map((ev) => [
        fmtDateTime(ev.createdAt),
        ev.action || '—',
        ev.productName || '—',
        ev.quantity ?? '—',
        ev.fromWarehouseName || '—',
        ev.toWarehouseName || '—',
        ev.userDisplayName || 'Система',
    ]);

    autoTable(doc, {
        startY: 92,
        head: [['Час', 'Дія', 'Товар', 'К-сть', 'Звідки', 'Куди', 'Хто']],
        body,
        styles: { font: fontName, fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [26, 26, 26], font: fontName, fontStyle: 'bold' },
        margin: { left: 24, right: 24 },
        tableWidth: 'auto',
    });

    doc.save(`sklad_zhurnal_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`);
}
