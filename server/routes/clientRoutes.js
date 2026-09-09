const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const Client = require('../models/Client');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getAllDealRows } = require('../modules/orders-rental/services/orderService');

const { phoneTailsMatch, normalizePhonesField, normalizeUaPhone } = require('../utils/phoneUtils');

const allowedRoles = ['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud'];

const DEAL_NON_TURNOVER_STATUSES = ['cancelled'];
const ACTIVE_RENTAL_STATUSES = ['active', 'booked'];

/** «Стан» pill (docs/admin-redesign/03-screens.md, «Клієнти»): прострочена
 *  оренда переважає активну, активна — претензії. */
function resolveClientState({ hasOverdue, hasActive, hasClaims }) {
    if (hasOverdue) return 'overdue';
    if (hasActive) return 'active';
    if (hasClaims) return 'claims';
    return 'none';
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
            const hasClaims = !!(c.claims && String(c.claims).trim());
            const state = resolveClientState({ ...deals, hasClaims });
            return {
                ...c.toJSON(),
                dealsCount: deals.count,
                revenue: deals.revenue,
                state,
            };
        });

        if (filter === 'claims') enriched = enriched.filter((c) => c.claims && String(c.claims).trim());
        if (filter === 'discount') enriched = enriched.filter((c) => Number(c.discountPercent || 0) > 0);
        if (filter === 'activeRent') enriched = enriched.filter((c) => c.state === 'active' || c.state === 'overdue');

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
            where: { phone: { [Op.iLike]: `%${tail}%` } },
            limit: 30,
            order: [['updatedAt', 'DESC']]
        });
        const client = candidates.find((c) => phoneTailsMatch(c.phone, normalized)) || null;
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
        const payload = {
            fullName: req.body.fullName,
            phone: normalizePhonesField(req.body.phone),
            email: req.body.email || null,
            passport: req.body.passport || null,
            passportIssuedAt: req.body.passportIssuedAt || req.body.passportIssued || null,
            ipn: req.body.ipn || null,
            address: req.body.address || null,
            siteAddress: req.body.siteAddress || null,
            discountPercent: Math.max(0, Math.min(100, Number(req.body.discountPercent || 0))),
            notes: req.body.notes || null,
            claims: req.body.claims || null
        };
        const created = await Client.create(payload);
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ message: 'Клієнта не знайдено' });
        const updates = {
            fullName: req.body.fullName,
            phone: normalizePhonesField(req.body.phone),
            email: req.body.email || null,
            passport: req.body.passport || null,
            passportIssuedAt: req.body.passportIssuedAt || req.body.passportIssued || null,
            ipn: req.body.ipn || null,
            address: req.body.address || null,
            siteAddress: req.body.siteAddress || null,
            discountPercent: Math.max(0, Math.min(100, Number(req.body.discountPercent || 0))),
            notes: req.body.notes || null,
        };
        if (Object.prototype.hasOwnProperty.call(req.body, 'claims')) {
            updates.claims = req.body.claims || null;
        }
        await client.update(updates);
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
        // (напр. з відкритої вкладки нотаток) не затер сусідні зміни (claims).
        const patchable = ['notes', 'claims', 'discountPercent', 'siteAddress'];
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
