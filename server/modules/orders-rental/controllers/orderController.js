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
const {
    createOrGetRentalApplicationFromOrder,
    saveDealWithRentalApplication,
} = require('../services/orderRentalService');
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
    listDeals,
    ORDER_TERMINAL_STATUSES,
} = require('../services/orderService');
const { decodeBase64Pdf } = require('../utils/decodeBase64Pdf');
const { userDisplayName } = require('../../../services/inventoryService');
const { notifyOrderCreated, notifyOrderStatusChanged } = require('../../../utils/telegramCustomerBot');

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

        try {
            await notifyOrderCreated(order);
        } catch (notifyErr) {
            console.error('customerBot notifyOrderCreated error:', notifyErr);
        }

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
            { sendTelegram: false, createdByUser: req.user }
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

async function getDealsList(req, res) {
    try {
        const { q, status, type } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const result = await listDeals({ q, status, type, page, limit });
        res.json(result);
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
        if (updates.discountType != null) {
            updates.discountType = updates.discountType === 'fixed' ? 'fixed' : 'percent';
        }
        if (updates.discount != null) {
            const n = Number(String(updates.discount).replace(',', '.'));
            const isFixed = updates.discountType === 'fixed' || (updates.discountType == null && order.discountType === 'fixed');
            updates.discount = Number.isFinite(n)
                ? (isFixed ? Math.max(0, n) : Math.max(0, Math.min(100, n)))
                : 0;
        }
        if (updates.sellerId != null) {
            updates.sellerId = resolveSellerId(updates.sellerId);
        }
        if (updates.rentStartTime !== undefined) {
            const raw = String(updates.rentStartTime || '').trim();
            const m = raw.match(/^(\d{1,2}):(\d{2})/);
            if (!raw || !m) {
                updates.rentStartTime = null;
            } else {
                const h = Number(m[1]);
                const min = Number(m[2]);
                updates.rentStartTime = (Number.isFinite(h) && Number.isFinite(min) && h <= 23 && min <= 59)
                    ? `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
                    : null;
            }
        }

        // Only persist known Order columns (avoid wiping via junk from the draft dump).
        const allowed = [
            'customerName', 'customerPhone', 'customerEmail', 'address',
            'deliveryMethod', 'paymentMethod', 'items', 'totalAmount',
            'discount', 'discountType', 'clientId', 'status', 'sellerId', 'rentalApplicationId',
            'rentStartTime',
        ];
        const patch = {};
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(updates, key)) {
                patch[key] = updates[key];
            }
        }

        // Хто закрив угоду — проставляється сервером (не з клієнтського
        // запиту) один раз, саме на перехід у термінальний статус, а не на
        // кожне збереження вже закритої угоди.
        if (patch.status && ORDER_TERMINAL_STATUSES.includes(patch.status) && !ORDER_TERMINAL_STATUSES.includes(order.status)) {
            patch.closedByUserId = req.user?.id || null;
            patch.closedByName = userDisplayName(req.user);
        }

        // "Угода" (docs/admin-redesign/03-screens.md): one Save button, one
        // transaction — when the deal has rental-catalog lines, the linked
        // RentalApplication (item enrichment, passport/site/responsible,
        // derived status) is saved in the same transaction as the order.
        const dealExtras = {
            clientPassport: req.body?.rentalApplication?.clientPassport,
            clientSiteAddress: req.body?.rentalApplication?.clientSiteAddress,
            responsible: req.body?.rentalApplication?.responsible,
        };
        const previousStatus = order.status;
        const { order: updated, rentalApplication } = await saveDealWithRentalApplication(
            order.id,
            patch,
            dealExtras,
            req.user?.id || null
        );

        if (patch.status && patch.status !== previousStatus) {
            try {
                await notifyOrderStatusChanged(updated);
            } catch (notifyErr) {
                console.error('customerBot notifyOrderStatusChanged error:', notifyErr);
            }
        }

        res.json({ order: updated, rentalApplication });
    } catch (err) {
        res.status(err.status || 400).json({ message: err.message });
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
    getDealsList,
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
