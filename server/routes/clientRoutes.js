const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const Client = require('../models/Client');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getAllDealRows } = require('../modules/orders-rental/services/orderService');

const { phoneTailsMatch, normalizeUaPhone } = require('../utils/phoneUtils');

const allowedRoles = ['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud'];
const CLIENT_TYPES = ['individual', 'fop', 'tov'];

const DEAL_NON_TURNOVER_STATUSES = ['cancelled'];
const ACTIVE_RENTAL_STATUSES = ['active', 'booked'];

/** «Стан» pill (docs/admin-redesign/03-screens.md, «Клієнти»): прострочена
 *  оренда переважає активну. Статусні прапорці (постійний/претензія/
 *  хороший/чорний список) — окремі значки біля імені, не входять сюди. */
function resolveClientState({ hasOverdue, hasActive }) {
    if (hasOverdue) return 'overdue';
    if (hasActive) return 'active';
    return 'none';
}

function normalizeClientType(value) {
    return CLIENT_TYPES.includes(value) ? value : 'individual';
}

function pickClientPayload(body) {
    return {
        fullName: body.fullName,
        clientType: normalizeClientType(body.clientType),
        phone: normalizeUaPhone(body.phone) || body.phone || '',
        phoneSecondary: body.phoneSecondary ? (normalizeUaPhone(body.phoneSecondary) || body.phoneSecondary) : null,
        phoneEmergency: body.phoneEmergency ? (normalizeUaPhone(body.phoneEmergency) || body.phoneEmergency) : null,
        email: body.email || null,
        passport: body.passport || null,
        passportIssuedAt: body.passportIssuedAt || body.passportIssued || null,
        ipn: body.ipn || null,
        bankName: body.bankName || null,
        bankAccount: body.bankAccount || null,
        address: body.address || null,
        siteAddress: body.siteAddress || null,
        discountPercent: Math.max(0, Math.min(100, Number(body.discountPercent || 0))),
        notes: body.notes || null,
        isRegularClient: !!body.isRegularClient,
        hasComplaint: !!body.hasComplaint,
        isGoodClient: !!body.isGoodClient,
        isBlacklisted: !!body.isBlacklisted,
    };
}

router.get('/', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        const filter = String(req.query.filter || '').trim();
        const where = {};
        if (q) {
            where[Op.or] = [
                { fullName: { [Op.iLike]: `%${q}%` } },
                { phone: { [Op.iLike]: `%${q}%` } },
                { phoneSecondary: { [Op.iLike]: `%${q}%` } },
                { phoneEmergency: { [Op.iLike]: `%${q}%` } },
                { email: { [Op.iLike]: `%${q}%` } }
            ];
        }
        const clients = await Client.findAll({ where, order: [['createdAt', 'DESC']] });

        // Аgregати з сервера, не з картки клієнта (docs/admin-redesign/03-screens.md,
        // «Клієнти»): той самий isOverdue/type, що й у списку «Угоди» та в
        // картці клієнта — один прохід по angoдах, а не окремий підрахунок
        // лише по RentalApplication.status (заявка створюється лише коли
        // потрібен документ, тож частина угод з простроченою орендою її
        // ще не має).
        const rows = (await getAllDealRows()).filter((r) => r.clientId != null);

        const dealsByClient = new Map();
        for (const r of rows) {
            const acc = dealsByClient.get(r.clientId) || { count: 0, revenue: 0, hasOverdue: false, hasActive: false };
            if (!DEAL_NON_TURNOVER_STATUSES.includes(r.status)) {
                acc.count += 1;
                acc.revenue += Number(r.totalAmount || 0);
            }
            if (r.isOverdue) acc.hasOverdue = true;
            if (r.statusDomain === 'rental' && ACTIVE_RENTAL_STATUSES.includes(r.status)) acc.hasActive = true;
            if (r.statusDomain === 'order' && r.status === 'issued') acc.hasActive = true;
            dealsByClient.set(r.clientId, acc);
        }

        let enriched = clients.map((c) => {
            const deals = dealsByClient.get(c.id) || { count: 0, revenue: 0, hasOverdue: false, hasActive: false };
            const state = resolveClientState(deals);
            return {
                ...c.toJSON(),
                dealsCount: deals.count,
                revenue: deals.revenue,
                state,
            };
        });

        if (filter === 'discount') enriched = enriched.filter((c) => Number(c.discountPercent || 0) > 0);
        if (filter === 'activeRent') enriched = enriched.filter((c) => c.state === 'active' || c.state === 'overdue');
        if (filter === 'regular') enriched = enriched.filter((c) => c.isRegularClient);
        if (filter === 'complaint') enriched = enriched.filter((c) => c.hasComplaint);
        if (filter === 'good') enriched = enriched.filter((c) => c.isGoodClient);
        if (filter === 'blacklist') enriched = enriched.filter((c) => c.isBlacklisted);

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/lookup', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const raw = String(req.query.phone || '').trim();
        const normalized = normalizeUaPhone(raw);
        if (normalized.length < 12) {
            return res.json({ found: false, client: null });
        }
        const tail = normalized.slice(-9);
        const candidates = await Client.findAll({
            where: {
                [Op.or]: [
                    { phone: { [Op.iLike]: `%${tail}%` } },
                    { phoneSecondary: { [Op.iLike]: `%${tail}%` } },
                    { phoneEmergency: { [Op.iLike]: `%${tail}%` } },
                ],
            },
            limit: 30,
            order: [['updatedAt', 'DESC']]
        });
        const client = candidates.find((c) => (
            phoneTailsMatch(c.phone, normalized)
            || phoneTailsMatch(c.phoneSecondary, normalized)
            || phoneTailsMatch(c.phoneEmergency, normalized)
        )) || null;
        res.json({ found: !!client, client });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ message: 'Клієнта не знайдено' });
        res.json(client);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const created = await Client.create(pickClientPayload(req.body));
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ message: 'Клієнта не знайдено' });
        await client.update(pickClientPayload(req.body));
        res.json(client);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.patch('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ message: 'Клієнта не знайдено' });
        // Partial update — тільки передані поля, щоб застарілий знімок клієнта
        // (напр. з відкритої вкладки нотаток) не затер сусідні зміни.
        const patchable = [
            'notes', 'discountPercent', 'siteAddress',
            'isRegularClient', 'hasComplaint', 'isGoodClient', 'isBlacklisted',
        ];
        const updates = {};
        for (const key of patchable) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updates[key] = req.body[key];
            }
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'discountPercent')) {
            updates.discountPercent = Math.max(0, Math.min(100, Number(updates.discountPercent || 0)));
        }
        await client.update(updates);
        res.json(client);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ message: 'Клієнта не знайдено' });
        await client.destroy();
        res.json({ message: 'Клієнта видалено' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
