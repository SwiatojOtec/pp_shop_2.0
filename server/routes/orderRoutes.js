const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Client = require('../models/Client');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { sendTelegramMessage } = require('../utils/telegram');
const { Op } = require('sequelize');
const { normalizeUaPhone, parsePhones, phoneTailsMatch } = require('../utils/phoneUtils');
const { generateInvoice, generateDepositInvoice } = require('../services/invoiceService');
const { resolveSellerId, getSellerOptions } = require('../constants/sellers');
const {
    saveInvoiceDocument,
    saveDepositInvoiceDocument,
    saveRentalApplicationDocument,
    saveRentalReturnActDocument,
    listOrderDocuments,
    getOrderDocumentFile,
    deleteOrderDocuments,
    deleteOrderDocument,
} = require('../services/orderDocumentService');
const { createOrGetRentalApplicationFromOrder } = require('../services/orderRentalService');

async function generateOrderNumber() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const countToday = await Order.count({
        where: {
            createdAt: {
                [Op.gte]: startOfDay
            }
        }
    });

    const dailyNumber = countToday + 1;
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${dailyNumber}/${day}/${month}/${year}`;
}

/**
 * @param {object} payload — same shape as public checkout
 * @param {{ sendTelegram?: boolean }} opts
 */
async function persistOrder(payload, { sendTelegram = false } = {}) {
    const {
        customerName,
        customerPhone: rawPhone,
        customerEmail,
        address,
        deliveryMethod,
        paymentMethod,
        items,
        totalAmount,
        discount,
        clientId: rawClientId,
        sellerId: rawSellerId,
    } = payload;

    const customerPhone = normalizeUaPhone(rawPhone);
    const sellerId = resolveSellerId(rawSellerId);

    const cid = Number(rawClientId);
    const clientId = Number.isFinite(cid) && cid > 0 ? Math.floor(cid) : null;

    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
        orderNumber,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        address: address || null,
        deliveryMethod: deliveryMethod || 'pickup',
        paymentMethod: paymentMethod || 'invoice',
        items: Array.isArray(items) ? items : [],
        totalAmount: totalAmount != null ? Number(totalAmount) : 0,
        discount: discount != null ? Number(discount) : 0,
        clientId,
        sellerId,
    });

    if (sendTelegram) {
        const lines = (order.items || []).map(
            (item) => `- ${item.name} x ${item.quantity} (${Number(item.price).toFixed(2)} грн)`
        );
        const message = `
📦 <b>Нове замовлення: ${orderNumber}</b>
👤 Клієнт: ${customerName}
📞 Телефон: ${customerPhone}
📧 Email: ${customerEmail || 'не вказано'}
🚚 Доставка: ${deliveryMethod}
📍 Адреса: ${address || 'не вказано'}
💳 Оплата: ${paymentMethod}
💰 Сума: ${Number(totalAmount).toFixed(2)} грн

🛒 Товари:
${lines.length ? lines.join('\n') : '(поки без позицій)'}
        `;

        await sendTelegramMessage(message, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🧾 Сформувати рахунок', callback_data: `gen_invoice_${order.id}` },
                        { text: '✏️ Редагувати', callback_data: `edit_order_${order.id}` }
                    ]
                ]
            }
        });
    }

    return order;
}

// Create new order (public checkout — з Telegram)
router.post('/', async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            customerEmail,
            address,
            deliveryMethod,
            paymentMethod,
            items,
            totalAmount,
            discount
        } = req.body;

        const order = await persistOrder(
            {
                customerName,
                customerPhone,
                customerEmail,
                address,
                deliveryMethod,
                paymentMethod,
                items,
                totalAmount,
                discount
            },
            { sendTelegram: true }
        );

        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Створення замовлення з адмінки (без Telegram — щоб не спамити при чернетках)
router.post('/admin', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            customerEmail,
            address,
            deliveryMethod,
            paymentMethod,
            items,
            totalAmount,
            discount,
            clientId,
            sellerId,
        } = req.body;

        if (!String(customerName || '').trim() || !String(customerPhone || '').trim()) {
            return res.status(400).json({ message: "Потрібні ім'я клієнта та телефон" });
        }

        const order = await persistOrder(
            {
                customerName: String(customerName).trim(),
                customerPhone: String(customerPhone).trim(),
                customerEmail,
                address,
                deliveryMethod,
                paymentMethod,
                items,
                totalAmount,
                discount,
                clientId,
                sellerId,
            },
            { sendTelegram: false }
        );

        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

/** Замовлення для картки клієнта: за clientId + старі без clientId за збігом телефону. */
router.get('/by-client/:clientId', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const clientId = parseInt(req.params.clientId, 10);
        if (Number.isNaN(clientId) || clientId <= 0) {
            return res.status(400).json({ message: 'Некоректний id клієнта' });
        }

        const client = await Client.findByPk(clientId);
        if (!client) {
            return res.json([]);
        }

        const byLink = await Order.findAll({
            where: { clientId },
            order: [['createdAt', 'DESC']]
        });

        const phoneList = parsePhones(client.phone);

        let byPhone = [];
        if (phoneList.length) {
            const candidates = await Order.findAll({
                where: { clientId: { [Op.is]: null } },
                order: [['createdAt', 'DESC']],
                limit: 2500
            });
            byPhone = candidates.filter((o) => phoneTailsMatch(client.phone, o.customerPhone));
        }

        const map = new Map();
        for (const o of [...byLink, ...byPhone]) {
            if (!map.has(o.id)) map.set(o.id, o);
        }
        const merged = [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(merged);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all orders (admin only)
router.get('/', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Список продавців для рахунків
router.get('/sellers/list', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), (req, res) => {
    res.json(getSellerOptions());
});

// Документи замовлення
router.get('/:id/documents', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });
        const documents = await listOrderDocuments(order.id);
        res.json(documents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/:id/documents/invoice', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });
        if (!Array.isArray(order.items) || !order.items.length) {
            return res.status(400).json({ message: 'У замовленні немає товарів для рахунку' });
        }

        const sellerId = resolveSellerId(req.body?.sellerId || order.sellerId);
        const pdfBuffer = await generateInvoice(order, { sellerId });
        const document = await saveInvoiceDocument({
            orderId: order.id,
            orderNumber: order.orderNumber,
            sellerId,
            pdfBuffer,
            createdBy: req.user?.id || null,
        });

        res.status(201).json(document);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/:id/documents/deposit-invoice', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const { application } = await createOrGetRentalApplicationFromOrder(
            orderId,
            req.user?.id || null
        );

        const freshOrder = await Order.findByPk(orderId);
        const sellerId = resolveSellerId(req.body?.sellerId || freshOrder.sellerId);
        const pdfBuffer = await generateDepositInvoice(freshOrder, {
            sellerId,
            rentalApplication: application,
        });
        const document = await saveDepositInvoiceDocument({
            orderId: freshOrder.id,
            orderNumber: freshOrder.orderNumber,
            sellerId,
            pdfBuffer,
            createdBy: req.user?.id || null,
        });

        res.status(201).json({ application, document });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
});

router.get('/:id/documents/:docId', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const docId = parseInt(req.params.docId, 10);
        if (!Number.isFinite(orderId) || !Number.isFinite(docId)) {
            return res.status(400).json({ message: 'Некоректний id' });
        }

        const result = await getOrderDocumentFile(orderId, docId);
        if (!result) return res.status(404).json({ message: 'Документ не знайдено' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${result.doc.fileName}"`);
        res.send(result.buffer);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id/documents/:docId', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const docId = parseInt(req.params.docId, 10);
        if (!Number.isFinite(orderId) || !Number.isFinite(docId)) {
            return res.status(400).json({ message: 'Некоректний id' });
        }

        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const deleted = await deleteOrderDocument(orderId, docId);
        if (!deleted) return res.status(404).json({ message: 'Документ не знайдено' });

        res.json({ message: 'Документ видалено' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/:id/documents/rental-application', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const { contentBase64, fileName, title } = req.body || {};
        if (!contentBase64) {
            return res.status(400).json({ message: 'Не передано PDF-файл' });
        }

        let pdfBuffer;
        try {
            pdfBuffer = Buffer.from(contentBase64, 'base64');
        } catch {
            return res.status(400).json({ message: 'Некоректний формат файлу' });
        }

        if (!pdfBuffer.length) {
            return res.status(400).json({ message: 'Порожній файл' });
        }

        const { application } = await createOrGetRentalApplicationFromOrder(
            orderId,
            req.user?.id || null
        );

        const document = await saveRentalApplicationDocument({
            orderId: order.id,
            applicationNumber: application.applicationNumber,
            pdfBuffer,
            createdBy: req.user?.id || null,
            fileName: fileName || undefined,
            title: title || undefined,
        });

        res.status(201).json({ application, document });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
});

router.post('/:id/documents/rental-return-act', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const { contentBase64, fileName, title } = req.body || {};
        if (!contentBase64) {
            return res.status(400).json({ message: 'Не передано PDF-файл' });
        }

        let pdfBuffer;
        try {
            pdfBuffer = Buffer.from(contentBase64, 'base64');
        } catch {
            return res.status(400).json({ message: 'Некоректний формат файлу' });
        }

        if (!pdfBuffer.length) {
            return res.status(400).json({ message: 'Порожній файл' });
        }

        const { application } = await createOrGetRentalApplicationFromOrder(
            orderId,
            req.user?.id || null
        );

        const document = await saveRentalReturnActDocument({
            orderId: order.id,
            applicationNumber: application.applicationNumber,
            pdfBuffer,
            createdBy: req.user?.id || null,
            fileName: fileName || undefined,
            title: title || undefined,
        });

        res.status(201).json({ application, document });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
});

router.post('/:id/rental-application', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const { application, created } = await createOrGetRentalApplicationFromOrder(
            orderId,
            req.user?.id || null
        );

        res.status(created ? 201 : 200).json({ application, created });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
});

// Get single order (admin)
router.get('/:id/invoice', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const sellerId = resolveSellerId(req.query.sellerId || order.sellerId);
        const pdfBuffer = await generateInvoice(order, { sellerId });
        const fileName = `Invoice_${String(order.orderNumber || order.id).replace(/\//g, '_')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfBuffer);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single order (admin)
router.get('/:id', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update order (admin only)
router.put('/:id', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        const updates = { ...req.body };
        if (updates.customerPhone != null) {
            updates.customerPhone = normalizeUaPhone(updates.customerPhone);
        }
        if (updates.sellerId != null) {
            updates.sellerId = resolveSellerId(updates.sellerId);
        }
        await order.update(updates);
        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete order (admin only)
router.delete('/:id', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        await deleteOrderDocuments(order.id);
        await order.destroy();
        res.json({ message: 'Order deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
