const Order = require('../../../models/Order');
const { normalizeUaPhone } = require('../../../utils/phoneUtils');
const { resolveSellerId } = require('../../../constants/sellers');
const { generateInvoice, generateDepositInvoice } = require('../services/invoiceService');
const {
    saveInvoiceDocument,
    saveDepositInvoiceDocument,
    saveRentalContractDocument,
    saveRentalProtocolDocument,
    saveRentalApplicationDocument,
    saveRentalReturnActDocument,
    listOrderDocuments,
    getOrderDocumentFile,
    deleteOrderDocuments,
    deleteOrderDocument,
    getNextDailyDocumentSequence,
    formatDailyDocumentNumber,
    reserveRentalActNumber,
} = require('../services/orderDocumentService');
const { createOrGetRentalApplicationFromOrder } = require('../services/orderRentalService');
const {
    checkRentalContractReadiness,
    generateRentalContractPdf,
} = require('../services/rentalContractService');
const {
    checkRentalProtocolReadiness,
    generateRentalProtocolPdf,
} = require('../services/rentalProtocolService');
const {
    persistOrder,
    loadOrderWithClient,
    upsertClientForContract,
    getOrdersByClient,
} = require('../services/orderService');
const { decodeBase64Pdf } = require('../utils/decodeBase64Pdf');

async function createOrder(req, res) {
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
}

async function createAdminOrder(req, res) {
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
}

async function getOrdersByClientHandler(req, res) {
    try {
        const clientId = parseInt(req.params.clientId, 10);
        if (Number.isNaN(clientId) || clientId <= 0) {
            return res.status(400).json({ message: 'Некоректний id клієнта' });
        }

        const merged = await getOrdersByClient(clientId);
        res.json(merged);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function getAllOrders(req, res) {
    try {
        const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* sellers list removed — frontend uses constants/sellers */

async function listDocuments(req, res) {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });
        const documents = await listOrderDocuments(order.id);
        res.json(documents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function createInvoiceDocument(req, res) {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });
        if (!Array.isArray(order.items) || !order.items.length) {
            return res.status(400).json({ message: 'У замовленні немає товарів для рахунку' });
        }

        const sellerId = resolveSellerId(req.body?.sellerId || order.sellerId);
        const baseDate = new Date(order.createdAt || Date.now());
        const sequence = await getNextDailyDocumentSequence({
            date: baseDate,
            types: ['invoice', 'deposit_invoice'],
        });
        const documentNumber = formatDailyDocumentNumber(baseDate, sequence);
        const pdfBuffer = await generateInvoice(order, { sellerId, documentNumber });
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
}

async function createDepositInvoiceDocument(req, res) {
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
        const baseDate = new Date(freshOrder.createdAt || Date.now());
        const sequence = await getNextDailyDocumentSequence({
            date: baseDate,
            types: ['invoice', 'deposit_invoice'],
        });
        const documentNumber = formatDailyDocumentNumber(baseDate, sequence);
        const pdfBuffer = await generateDepositInvoice(freshOrder, {
            sellerId,
            rentalApplication: application,
            documentNumber,
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
}

async function checkRentalContract(req, res) {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const ctx = await loadOrderWithClient(orderId);
        if (!ctx) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const { application } = await createOrGetRentalApplicationFromOrder(orderId, req.user?.id || null);
        const sellerId = resolveSellerId(req.body?.sellerId || ctx.order.sellerId);
        const patch = req.body?.clientData || {};

        const result = checkRentalContractReadiness({
            order: ctx.order,
            client: ctx.client,
            rentalApplication: application,
            sellerId,
            patch,
        });

        res.json({
            ready: result.ready,
            missing: result.missing || [],
        });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
}

async function createRentalContractDocument(req, res) {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const ctx = await loadOrderWithClient(orderId);
        if (!ctx) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const { application } = await createOrGetRentalApplicationFromOrder(orderId, req.user?.id || null);
        const sellerId = resolveSellerId(req.body?.sellerId || ctx.order.sellerId);
        const patch = req.body?.clientData || {};

        const precheck = checkRentalContractReadiness({
            order: ctx.order,
            client: ctx.client,
            rentalApplication: application,
            sellerId,
            patch,
        });

        if (!precheck.ready) {
            return res.status(400).json({
                message: 'Даних для створення не вистачає, будь ласка заповніть поля:',
                missing: precheck.missing,
            });
        }

        const client = await upsertClientForContract(ctx.order, patch);
        const freshOrder = await Order.findByPk(orderId);
        const baseDate = new Date(freshOrder.createdAt || Date.now());
        const sequence = await getNextDailyDocumentSequence({
            date: baseDate,
            types: ['rental_contract'],
        });
        const contractNumber = formatDailyDocumentNumber(baseDate, sequence);

        const { pdfBuffer, fileName } = await generateRentalContractPdf({
            order: freshOrder,
            sellerId,
            client,
            rentalApplication: application,
            patch: { ...patch, contractNumber },
        });

        const document = await saveRentalContractDocument({
            orderId: freshOrder.id,
            orderNumber: freshOrder.orderNumber,
            sellerId,
            pdfBuffer,
            createdBy: req.user?.id || null,
            fileName,
        });

        res.status(201).json({ application, client, document });
    } catch (err) {
        res.status(err.status || 500).json({
            message: err.message,
            missing: err.missing || undefined,
        });
    }
}

async function checkRentalProtocol(req, res) {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const ctx = await loadOrderWithClient(orderId);
        if (!ctx) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const { application } = await createOrGetRentalApplicationFromOrder(orderId, req.user?.id || null);
        const sellerId = resolveSellerId(req.body?.sellerId || ctx.order.sellerId);
        const patch = req.body?.clientData || {};

        const result = checkRentalProtocolReadiness({
            order: ctx.order,
            client: ctx.client,
            rentalApplication: application,
            sellerId,
            patch,
        });

        res.json({
            ready: result.ready,
            missing: result.missing || [],
        });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
}

async function createRentalProtocolDocument(req, res) {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const ctx = await loadOrderWithClient(orderId);
        if (!ctx) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const { application } = await createOrGetRentalApplicationFromOrder(orderId, req.user?.id || null);
        const sellerId = resolveSellerId(req.body?.sellerId || ctx.order.sellerId);
        const patch = req.body?.clientData || {};

        const precheck = checkRentalProtocolReadiness({
            order: ctx.order,
            client: ctx.client,
            rentalApplication: application,
            sellerId,
            patch,
        });

        if (!precheck.ready) {
            return res.status(400).json({
                message: 'Даних для створення не вистачає, будь ласка заповніть поля:',
                missing: precheck.missing,
            });
        }

        const client = await upsertClientForContract(ctx.order, patch);
        const freshOrder = await Order.findByPk(orderId);

        const { pdfBuffer, fileName } = await generateRentalProtocolPdf({
            order: freshOrder,
            sellerId,
            client,
            rentalApplication: application,
            patch,
        });

        const document = await saveRentalProtocolDocument({
            orderId: freshOrder.id,
            orderNumber: freshOrder.orderNumber,
            sellerId,
            pdfBuffer,
            createdBy: req.user?.id || null,
            fileName,
        });

        res.status(201).json({ application, client, document });
    } catch (err) {
        res.status(err.status || 500).json({
            message: err.message,
            missing: err.missing || undefined,
        });
    }
}

async function getDocumentFile(req, res) {
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
}

async function deleteDocument(req, res) {
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
}

async function getNextRentalActNumber(req, res) {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const type = String(req.body?.type || req.query?.type || '').trim();
        const allowedTypes = new Set(['rental_application', 'rental_return_act']);
        if (!allowedTypes.has(type)) {
            return res.status(400).json({ message: 'Некоректний тип документа' });
        }

        const { actNumber, actDate } = await reserveRentalActNumber(new Date());

        res.json({ actNumber, actDate: actDate.toISOString() });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function uploadRentalApplicationDocument(req, res) {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const { contentBase64, fileName, title } = req.body || {};
        const decoded = decodeBase64Pdf(contentBase64);
        if (!decoded.ok) {
            return res.status(decoded.status).json({ message: decoded.message });
        }
        const { pdfBuffer } = decoded;

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
}

async function uploadRentalReturnActDocument(req, res) {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({ message: 'Некоректний id замовлення' });
        }

        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });

        const { contentBase64, fileName, title } = req.body || {};
        const decoded = decodeBase64Pdf(contentBase64);
        if (!decoded.ok) {
            return res.status(decoded.status).json({ message: decoded.message });
        }
        const { pdfBuffer } = decoded;

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
}

async function createRentalApplicationFromOrder(req, res) {
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
}

async function getOrderById(req, res) {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Замовлення не знайдено' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function updateOrder(req, res) {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        const updates = { ...req.body };
        if (updates.customerPhone != null) {
            updates.customerPhone = normalizeUaPhone(updates.customerPhone);
        }
        if (updates.discount != null) {
            const n = Number(String(updates.discount).replace(',', '.'));
            updates.discount = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
        }
        if (updates.sellerId != null) {
            updates.sellerId = resolveSellerId(updates.sellerId);
        }
        await order.update(updates);
        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}

async function deleteOrder(req, res) {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        await deleteOrderDocuments(order.id);
        await order.destroy();
        res.json({ message: 'Order deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

module.exports = {
    createOrder,
    createAdminOrder,
    getOrdersByClientHandler,
    getAllOrders,
    listDocuments,
    createInvoiceDocument,
    createDepositInvoiceDocument,
    checkRentalContract,
    createRentalContractDocument,
    checkRentalProtocol,
    createRentalProtocolDocument,
    getDocumentFile,
    deleteDocument,
    getNextRentalActNumber,
    uploadRentalApplicationDocument,
    uploadRentalReturnActDocument,
    createRentalApplicationFromOrder,
    getOrderById,
    updateOrder,
    deleteOrder,
};
