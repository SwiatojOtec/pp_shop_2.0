import jsPDF from 'jspdf';
import QRCode from 'qrcode';

/** QR кодує саме цей рядок — мобільний сканер переобліку розпізнає
 *  префікс "PPU:" і дістає id (docs plan «Переоблік зі сканером»). */
export function unitQrPayload(unitId) {
    return `PPU:${unitId}`;
}

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

const COLS = 3;
const ROWS = 6;
const MARGIN = 36;
const QR_SIZE = 110;

/** Аркуш QR-наліпок для друку — по одній на фізичну одиницю товару
 *  (server/models/ProductUnit.js). Той самий підхід, що
 *  exportWarehousePdf.js (jsPDF + Roboto для кирилиці, doc.save). */
export async function exportUnitLabelsPdf({ warehouseName, units }) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    let fontName = 'helvetica';

    try {
        const [regularB64] = await Promise.all([
            loadFontAsBase64('/fonts/Roboto-Regular.ttf'),
        ]);
        doc.addFileToVFS('Roboto-Regular.ttf', regularB64);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        fontName = 'Roboto';
    } catch (e) {
        console.warn('Labels PDF font load failed, using fallback', e);
    }
    doc.setFont(fontName, 'normal');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const cellW = (pageWidth - MARGIN * 2) / COLS;
    const cellH = (pageHeight - MARGIN * 2) / ROWS;
    const perPage = COLS * ROWS;

    for (let i = 0; i < units.length; i += 1) {
        const onPageIndex = i % perPage;
        if (i > 0 && onPageIndex === 0) doc.addPage();

        const col = onPageIndex % COLS;
        const row = Math.floor(onPageIndex / COLS);
        const x = MARGIN + col * cellW;
        const y = MARGIN + row * cellH;

        const unit = units[i];
        const qrDataUrl = await QRCode.toDataURL(unitQrPayload(unit.id), { margin: 0, width: 300 });
        const qrX = x + (cellW - QR_SIZE) / 2;
        doc.addImage(qrDataUrl, 'PNG', qrX, y + 6, QR_SIZE, QR_SIZE);

        doc.setFontSize(8);
        const name = String(unit.Product?.name || '').slice(0, 40);
        const label = unit.inventoryNumber || unit.serialNumber || `#${unit.id}`;
        doc.text(name, x + cellW / 2, y + QR_SIZE + 22, { align: 'center', maxWidth: cellW - 8 });
        doc.setFont(fontName, 'bold');
        doc.text(String(label), x + cellW / 2, y + QR_SIZE + 36, { align: 'center', maxWidth: cellW - 8 });
        doc.setFont(fontName, 'normal');
    }

    const safeName = String(warehouseName || 'sklad').replace(/[^\wЀ-ӿ-]+/g, '_');
    doc.save(`qr_nalipky_${safeName}.pdf`);
}
