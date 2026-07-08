const path = require('path');
const fs = require('fs').promises;
const { Op } = require('sequelize');
const OrderDocument = require('../models/OrderDocument');
const { getSeller } = require('../constants/sellers');

const UPLOAD_ROOT = path.join(__dirname, '../uploads/order-documents');

async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

function getDayBounds(date = new Date()) {
    const dt = date instanceof Date ? date : new Date(date);
    const start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
}

function formatDailyDocumentNumber(date = new Date(), sequence = 1) {
    const dt = date instanceof Date ? date : new Date(date);
    const stamp = `${String(dt.getDate()).padStart(2, '0')}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getFullYear()).slice(-2)}`;
    return `${stamp}/${Math.max(1, Number(sequence) || 1)}`;
}

function buildInvoiceFileName(orderNumber) {
    const safe = String(orderNumber || 'order').replace(/\//g, '_');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `Rahunok_${safe}_${stamp}.pdf`;
}

function serializeDocument(doc) {
    const row = doc.toJSON ? doc.toJSON() : doc;
    return {
        id: row.id,
        orderId: row.orderId,
        type: row.type,
        fileName: row.fileName,
        sellerId: row.sellerId,
        title: row.title,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
    };
}

async function getNextDailyDocumentSequence({ date = new Date(), types = [] } = {}) {
    const { start, end } = getDayBounds(date);
    const where = {
        createdAt: {
            [Op.gte]: start,
            [Op.lt]: end,
        },
    };
    if (Array.isArray(types) && types.length) {
        where.type = { [Op.in]: types };
    }
    const count = await OrderDocument.count({ where });
    return count + 1;
}

function buildDepositInvoiceFileName(orderNumber) {
    const safe = String(orderNumber || 'order').replace(/\//g, '_');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `Rahunok_zastava_${safe}_${stamp}.pdf`;
}

function buildRentalApplicationFileName(applicationNumber) {
    const safe = String(applicationNumber || 'new').replace(/[^\w.-]+/g, '_');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `zaiavka_${safe}_${stamp}.pdf`;
}

function buildRentalReturnActFileName(applicationNumber) {
    const safe = String(applicationNumber || 'new').replace(/[^\w.-]+/g, '_');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `akt_povernennia_${safe}_${stamp}.pdf`;
}

function buildRentalContractFileName(orderNumber) {
    const safe = String(orderNumber || 'order').replace(/\//g, '_');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `dogovir_${safe}_${stamp}.pdf`;
}

function buildRentalProtocolFileName(orderNumber) {
    const safe = String(orderNumber || 'order').replace(/\//g, '_');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `protokol_${safe}_${stamp}.pdf`;
}

async function saveOrderDocument({
    orderId,
    type,
    fileName,
    title,
    pdfBuffer,
    sellerId = null,
    createdBy = null,
}) {
    const storageKey = path.join(String(orderId), fileName).replace(/\\/g, '/');
    const absolutePath = path.join(UPLOAD_ROOT, storageKey);

    await ensureDir(path.dirname(absolutePath));
    await fs.writeFile(absolutePath, pdfBuffer);

    const doc = await OrderDocument.create({
        orderId,
        type,
        fileName,
        storageKey,
        sellerId,
        title,
        createdBy: createdBy || null,
    });

    return serializeDocument(doc);
}

async function saveInvoiceDocument({ orderId, orderNumber, sellerId, pdfBuffer, createdBy }) {
    const seller = getSeller(sellerId);
    const fileName = buildInvoiceFileName(orderNumber);
    return saveOrderDocument({
        orderId,
        type: 'invoice',
        fileName,
        title: `Рахунок · ${seller.label}`,
        pdfBuffer,
        sellerId,
        createdBy,
    });
}

async function saveRentalApplicationDocument({
    orderId,
    applicationNumber,
    pdfBuffer,
    createdBy,
    fileName,
    title,
}) {
    return saveOrderDocument({
        orderId,
        type: 'rental_application',
        fileName: fileName || buildRentalApplicationFileName(applicationNumber),
        title: title || `Заявка · ${applicationNumber || 'нова'}`,
        pdfBuffer,
        createdBy,
    });
}

async function saveDepositInvoiceDocument({ orderId, orderNumber, sellerId, pdfBuffer, createdBy }) {
    const seller = getSeller(sellerId);
    const fileName = buildDepositInvoiceFileName(orderNumber);
    return saveOrderDocument({
        orderId,
        type: 'deposit_invoice',
        fileName,
        title: `Рахунок (застава) · ${seller.label}`,
        pdfBuffer,
        sellerId,
        createdBy,
    });
}

async function saveRentalContractDocument({ orderId, orderNumber, sellerId, pdfBuffer, createdBy, fileName }) {
    const seller = getSeller(sellerId);
    return saveOrderDocument({
        orderId,
        type: 'rental_contract',
        fileName: fileName || buildRentalContractFileName(orderNumber),
        title: `Договір оренди · ${seller.label}`,
        pdfBuffer,
        sellerId,
        createdBy,
    });
}

async function saveRentalProtocolDocument({ orderId, orderNumber, sellerId, pdfBuffer, createdBy, fileName }) {
    const seller = getSeller(sellerId);
    return saveOrderDocument({
        orderId,
        type: 'rental_protocol',
        fileName: fileName || buildRentalProtocolFileName(orderNumber),
        title: `Протокол (Додаток №1) · ${seller.label}`,
        pdfBuffer,
        sellerId,
        createdBy,
    });
}

async function saveRentalReturnActDocument({
    orderId,
    applicationNumber,
    pdfBuffer,
    createdBy,
    fileName,
    title,
}) {
    return saveOrderDocument({
        orderId,
        type: 'rental_return_act',
        fileName: fileName || buildRentalReturnActFileName(applicationNumber),
        title: title || `Акт повернення · ${applicationNumber || 'нова'}`,
        pdfBuffer,
        createdBy,
    });
}

async function listOrderDocuments(orderId) {
    const docs = await OrderDocument.findAll({
        where: { orderId },
        order: [['createdAt', 'DESC']],
    });
    return docs.map(serializeDocument);
}

async function getOrderDocumentFile(orderId, docId) {
    const doc = await OrderDocument.findOne({ where: { id: docId, orderId } });
    if (!doc) return null;

    const absolutePath = path.join(UPLOAD_ROOT, doc.storageKey);
    try {
        const buffer = await fs.readFile(absolutePath);
        return { doc, buffer };
    } catch {
        return null;
    }
}

async function deleteOrderDocument(orderId, docId) {
    const doc = await OrderDocument.findOne({ where: { id: docId, orderId } });
    if (!doc) return false;

    try {
        await fs.unlink(path.join(UPLOAD_ROOT, doc.storageKey));
    } catch {
        // file may already be missing
    }

    await doc.destroy();
    return true;
}

async function deleteOrderDocuments(orderId) {
    const docs = await OrderDocument.findAll({ where: { orderId } });
    for (const doc of docs) {
        try {
            await fs.unlink(path.join(UPLOAD_ROOT, doc.storageKey));
        } catch {
            // file may already be missing
        }
        await doc.destroy();
    }

    try {
        await fs.rmdir(path.join(UPLOAD_ROOT, String(orderId)));
    } catch {
        // directory may not exist
    }
}

module.exports = {
    saveOrderDocument,
    saveInvoiceDocument,
    saveDepositInvoiceDocument,
    saveRentalContractDocument,
    saveRentalProtocolDocument,
    saveRentalApplicationDocument,
    saveRentalReturnActDocument,
    listOrderDocuments,
    getOrderDocumentFile,
    deleteOrderDocument,
    deleteOrderDocuments,
    getNextDailyDocumentSequence,
    formatDailyDocumentNumber,
};
