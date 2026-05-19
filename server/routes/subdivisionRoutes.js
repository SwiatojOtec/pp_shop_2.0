const express = require('express');
const sequelize = require('../config/db');
const Subdivision = require('../models/Subdivision');
require('../models/SubdivisionMember'); // associations
const SubdivisionMember = require('../models/SubdivisionMember');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const MAX_MEMBERS = 2;

function userPublic(u) {
    if (!u) return null;
    return {
        id: u.id,
        name: u.name,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        status: u.status
    };
}

async function assertEligible(userId, transaction) {
    const u = await User.findByPk(userId, { transaction });
    if (!u) {
        const e = new Error('Користувача не знайдено');
        e.status = 404;
        throw e;
    }
    if (u.role === 'owner') {
        const e = new Error('Власника не можна додати до підрозділу');
        e.status = 400;
        throw e;
    }
    if (u.status !== 'active') {
        const e = new Error('Потрібен активний акаунт');
        e.status = 400;
        throw e;
    }
    return u;
}

async function assertFree(userId, exceptSubdivisionId, transaction) {
    if (!userId) return;
    const row = await SubdivisionMember.findOne({ where: { userId }, transaction });
    if (row && row.subdivisionId !== exceptSubdivisionId) {
        const e = new Error('Користувач уже в іншому підрозділі');
        e.status = 400;
        throw e;
    }
}

function normalizeMemberIds(raw) {
    if (!Array.isArray(raw)) return [];
    const ids = [...new Set(raw.map(id => parseInt(id, 10)).filter(n => Number.isInteger(n) && n > 0))];
    return ids;
}

/** members: [{ userId? }, { displayName? }] або legacy memberIds: number[] */
function normalizeMembers(membersRaw, memberIdsRaw) {
    if (Array.isArray(membersRaw) && membersRaw.length) {
        const out = [];
        for (const item of membersRaw.slice(0, MAX_MEMBERS)) {
            if (!item || typeof item !== 'object') continue;
            const uid = item.userId != null ? parseInt(item.userId, 10) : null;
            const dn = item.displayName != null ? String(item.displayName).trim() : '';
            if (uid && Number.isInteger(uid)) {
                out.push({ userId: uid });
            } else if (dn) {
                out.push({ displayName: dn.slice(0, 120) });
            }
        }
        return out;
    }
    return normalizeMemberIds(memberIdsRaw).map((userId) => ({ userId }));
}

function memberPublic(row) {
    if (!row) return null;
    if (row.User) return userPublic(row.User);
    if (row.displayName) {
        return { displayName: row.displayName, isGuest: true };
    }
    return null;
}

async function createNonHeadMembers(subdivisionId, members, exceptSubdivisionId, transaction) {
    for (const m of members) {
        if (m.userId) {
            await assertEligible(m.userId, transaction);
            await assertFree(m.userId, exceptSubdivisionId, transaction);
            await SubdivisionMember.create(
                { subdivisionId, userId: m.userId, displayName: null, isHead: false },
                { transaction }
            );
        } else if (m.displayName) {
            await SubdivisionMember.create(
                { subdivisionId, userId: null, displayName: m.displayName, isHead: false },
                { transaction }
            );
        }
    }
}

function memberUserIds(members) {
    return members.filter((m) => m.userId).map((m) => m.userId);
}

function shapeSubdivision(sub) {
    const rows = sub.SubdivisionMembers || [];
    const headRow = rows.find(r => r.isHead);
    const members = rows.filter(r => !r.isHead).sort((a, b) => a.id - b.id);
    return {
        id: sub.id,
        name: sub.name,
        head: headRow && headRow.User ? userPublic(headRow.User) : null,
        members: members.map(memberPublic).filter(Boolean)
    };
}

// GET /api/subdivisions
router.get('/', authMiddleware, requireRole(['owner']), async (req, res) => {
    try {
        const list = await Subdivision.findAll({
            order: [['id', 'ASC']],
            include: [{
                model: SubdivisionMember,
                include: [{ model: User, attributes: ['id', 'name', 'lastName', 'email', 'role', 'status'] }]
            }]
        });
        res.json(list.map(shapeSubdivision));
    } catch (err) {
        console.error('subdivisions GET', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /api/subdivisions { name?, headUserId, memberIds: number[] }
router.post('/', authMiddleware, requireRole(['owner']), async (req, res) => {
    const { name, headUserId: headRaw, memberIds: memberRaw, members: membersBody } = req.body;
    const headUserId = parseInt(headRaw, 10);
    const members = normalizeMembers(membersBody, memberRaw);

    if (!headUserId) {
        return res.status(400).json({ message: 'Оберіть голову підрозділу' });
    }
    if (memberUserIds(members).includes(headUserId)) {
        return res.status(400).json({ message: 'Голова не може бути в списку співробітників' });
    }
    if (members.length > MAX_MEMBERS) {
        return res.status(400).json({ message: `Не більше ${MAX_MEMBERS} співробітників у підрозділі (разом з табелем)` });
    }

    let createdId;
    try {
        await sequelize.transaction(async (t) => {
            await assertEligible(headUserId, t);
            await assertFree(headUserId, null, t);

            const sub = await Subdivision.create({ name: name && String(name).trim() ? String(name).trim() : null }, { transaction: t });
            createdId = sub.id;
            await SubdivisionMember.create(
                { subdivisionId: sub.id, userId: headUserId, displayName: null, isHead: true },
                { transaction: t }
            );
            await createNonHeadMembers(sub.id, members, null, t);
            await User.update(
                { role: 'pivdenbud', status: 'active' },
                { where: { id: headUserId }, transaction: t }
            );
        });

        const created = await Subdivision.findByPk(createdId, {
            include: [{
                model: SubdivisionMember,
                include: [{ model: User, attributes: ['id', 'name', 'lastName', 'email', 'role', 'status'] }]
            }]
        });
        res.status(201).json(shapeSubdivision(created));
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ message: err.message });
        }
        console.error('subdivisions POST', err);
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/subdivisions/:id
router.patch('/:id', authMiddleware, requireRole(['owner']), async (req, res) => {
    const subId = parseInt(req.params.id, 10);
    const { name, headUserId: headRaw, memberIds: memberRaw, members: membersBody } = req.body;
    const headUserId = headRaw != null ? parseInt(headRaw, 10) : null;
    const members = normalizeMembers(membersBody, memberRaw);

    if (!subId) {
        return res.status(400).json({ message: 'Некоректний id' });
    }

    try {
        await sequelize.transaction(async (t) => {
            const sub = await Subdivision.findByPk(subId, {
                include: [{ model: SubdivisionMember }],
                transaction: t
            });
            if (!sub) {
                const e = new Error('Підрозділ не знайдено');
                e.status = 404;
                throw e;
            }

            const oldHead = sub.SubdivisionMembers.find(m => m.isHead);

            if (name !== undefined) {
                sub.name = name && String(name).trim() ? String(name).trim() : null;
                await sub.save({ transaction: t });
            }

            if (headUserId && memberUserIds(members).includes(headUserId)) {
                const e = new Error('Голова не може бути в списку співробітників');
                e.status = 400;
                throw e;
            }
            if (members.length > MAX_MEMBERS) {
                const e = new Error(`Не більше ${MAX_MEMBERS} співробітників`);
                e.status = 400;
                throw e;
            }

            if (headRaw != null && headUserId) {
                await assertEligible(headUserId, t);
                await assertFree(headUserId, subId, t);

                await SubdivisionMember.destroy({ where: { subdivisionId: subId }, transaction: t });

                await SubdivisionMember.create(
                    { subdivisionId: subId, userId: headUserId, displayName: null, isHead: true },
                    { transaction: t }
                );
                await createNonHeadMembers(subId, members, subId, t);

                if (oldHead && oldHead.userId !== headUserId) {
                    await User.update(
                        { role: 'rent' },
                        { where: { id: oldHead.userId, role: 'pivdenbud' }, transaction: t }
                    );
                }
                await User.update(
                    { role: 'pivdenbud', status: 'active' },
                    { where: { id: headUserId }, transaction: t }
                );
            }
        });

        const updated = await Subdivision.findByPk(subId, {
            include: [{
                model: SubdivisionMember,
                include: [{ model: User, attributes: ['id', 'name', 'lastName', 'email', 'role', 'status'] }]
            }]
        });
        res.json(shapeSubdivision(updated));
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ message: err.message });
        }
        console.error('subdivisions PATCH', err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/subdivisions/:id
router.delete('/:id', authMiddleware, requireRole(['owner']), async (req, res) => {
    const subId = parseInt(req.params.id, 10);
    if (!subId) {
        return res.status(400).json({ message: 'Некоректний id' });
    }

    try {
        await sequelize.transaction(async (t) => {
            const sub = await Subdivision.findByPk(subId, {
                include: [{ model: SubdivisionMember }],
                transaction: t
            });
            if (!sub) {
                const e = new Error('Підрозділ не знайдено');
                e.status = 404;
                throw e;
            }
            const headRow = sub.SubdivisionMembers.find(m => m.isHead);
            await SubdivisionMember.destroy({ where: { subdivisionId: subId }, transaction: t });
            await sub.destroy({ transaction: t });
            if (headRow) {
                await User.update(
                    { role: 'rent' },
                    { where: { id: headRow.userId, role: 'pivdenbud' }, transaction: t }
                );
            }
        });
        res.json({ ok: true });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ message: err.message });
        }
        console.error('subdivisions DELETE', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
