/**
 * Decode a base64 PDF payload from an upload request body.
 * @returns {{ ok: true, pdfBuffer: Buffer } | { ok: false, status: number, message: string }}
 */
function decodeBase64Pdf(contentBase64) {
    if (!contentBase64) {
        return { ok: false, status: 400, message: 'Не передано PDF-файл' };
    }

    let pdfBuffer;
    try {
        pdfBuffer = Buffer.from(contentBase64, 'base64');
    } catch {
        return { ok: false, status: 400, message: 'Некоректний формат файлу' };
    }

    if (!pdfBuffer.length) {
        return { ok: false, status: 400, message: 'Порожній файл' };
    }

    return { ok: true, pdfBuffer };
}

module.exports = {
    decodeBase64Pdf,
};
