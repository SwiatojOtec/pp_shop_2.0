const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const TimesheetEntry = require('../models/TimesheetEntry');
const SubdivisionMember = require('../models/SubdivisionMember');
const Subdivision = require('../models/Subdivision');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');
const allowedRoles = ['owner', 'manager', 'pivdenbud'];

function formatPersonLabel(usr) {
    if (!usr) return '';
    const s = [usr.name, usr.lastName].filter(Boolean).join(' ').trim();
    return s || usr.email || '—';
}

async function teamLabelsForUser(user) {
    const slot1 = formatPersonLabel(user) || 'Співробітник 1';
    const fallback2 = process.env.PIVDENBUD_EMP2_NAME || 'Співробітник 2';
    const fallback3 = process.env.PIVDENBUD_EMP3_NAME || 'Співробітник 3';

    if (user.role === 'pivdenbud') {
        const headRow = await SubdivisionMember.findOne({
            where: { userId: user.id, isHead: true }
        });
        if (headRow) {
            const rows = await SubdivisionMember.findAll({
                where: { subdivisionId: headRow.subdivisionId },
                include: [{ model: User, attributes: ['id', 'name', 'lastName', 'email'] }],
                order: [['isHead', 'DESC'], ['id', 'ASC']]
            });
            const names = rows.map(r => formatPersonLabel(r.User));
            return [names[0] || slot1, names[1] || fallback2, names[2] || fallback3];
        }
    }

    return [slot1, fallback2, fallback3];
}

async function teamLabels(req) {
    return teamLabelsForUser(req.user);
}

/** Підписи колонок для табелю голови за userId (для overview). */
async function teamLabelsForHeadUserId(headUserId) {
    const u = await User.findByPk(headUserId);
    if (!u) {
        return ['—', '—', '—'];
    }
    return teamLabelsForUser(u);
}

function clampInt(n, min, max) {
    if (Number.isNaN(n)) return null;
    return Math.min(max, Math.max(min, n));
}

function parsePart(val, max) {
    if (val === '' || val === undefined || val === null) return null;
    const n = parseInt(String(val).trim(), 10);
    if (Number.isNaN(n)) return null;
    return clampInt(n, 0, max);
}

function mapEntryRow(r) {
    return {
        day: r.day,
        slot: r.employeeSlot,
        arrivalHour: r.arrivalHour != null ? parseInt(r.arrivalHour, 10) : null,
        arrivalMinute: r.arrivalMinute != null ? parseInt(r.arrivalMinute, 10) : null,
        departureHour: r.departureHour != null ? parseInt(r.departureHour, 10) : null,
        departureMinute: r.departureMinute != null ? parseInt(r.departureMinute, 10) : null
    };
}

// GET /api/timesheet?year=2026&month=2 — власник/менеджер: порожньо (див. /overview); pivdenbud: свій табель
router.get('/', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const year = parseInt(req.query.year, 10);
        const month = parseInt(req.query.month, 10);
        if (!year || !month || month < 1 || month > 12) {
            return res.status(400).json({ message: 'Потрібні коректні year та month' });
        }

        if (req.user.role === 'owner' || req.user.role === 'manager') {
            return res.json({
                year,
                month,
                labels: [],
                entries: [],
                viewer: true
            });
        }

        const uid = req.user.id;
        const rows = await TimesheetEntry.findAll({
            where: {
                year,
                month,
                [Op.or]: [{ headUserId: uid }, { headUserId: null, updatedByUserId: uid }]
            },
            order: [['day', 'ASC'], ['employeeSlot', 'ASC']]
        });
        const entries = rows.map(mapEntryRow);
        res.json({
            year,
            month,
            labels: await teamLabels(req),
            entries,
            viewer: false
        });
    } catch (err) {
        console.error('timesheet GET', err);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/timesheet/overview?year=&month= — усі табелі підрозділів (owner / manager)
router.get('/overview', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const year = parseInt(req.query.year, 10);
        const month = parseInt(req.query.month, 10);
        if (!year || !month || month < 1 || month > 12) {
            return res.status(400).json({ message: 'Потрібні коректні year та month' });
        }

        const headsFromSubs = await SubdivisionMember.findAll({
            where: { isHead: true },
            include: [
                { model: User, attributes: ['id', 'name', 'lastName', 'email'] },
                { model: Subdivision, attributes: ['id', 'name'], required: false }
            ]
        });

        const byHead = new Map();
        headsFromSubs.forEach(row => {
            byHead.set(row.userId, {
                headUserId: row.userId,
                subdivisionId: row.subdivisionId,
                subdivisionName: row.Subdivision ? row.Subdivision.name : null,
                headUser: row.User
            });
        });

        const withSavedRows = await TimesheetEntry.findAll({
            attributes: ['headUserId'],
            where: { year, month, headUserId: { [Op.ne]: null } },
            raw: true
        });
        const seenHeads = new Set();
        for (const row of withSavedRows) {
            const hid = row.headUserId;
            if (seenHeads.has(hid)) continue;
            seenHeads.add(hid);
            if (!byHead.has(hid)) {
                const u = await User.findByPk(hid, { attributes: ['id', 'name', 'lastName', 'email'] });
                if (u) {
                    byHead.set(hid, {
                        headUserId: hid,
                        subdivisionId: null,
                        subdivisionName: null,
                        headUser: u
                    });
                }
            }
        }

        const sheets = [];
        const sorted = [...byHead.values()].sort((a, b) => {
            const na = (a.subdivisionName || '\uffff').toLowerCase();
            const nb = (b.subdivisionName || '\uffff').toLowerCase();
            if (na !== nb) return na.localeCompare(nb, 'uk');
            return formatPersonLabel(a.headUser).localeCompare(formatPersonLabel(b.headUser), 'uk');
        });

        for (const meta of sorted) {
            const hid = meta.headUserId;
            const entryRows = await TimesheetEntry.findAll({
                where: { year, month, headUserId: hid },
                order: [['day', 'ASC'], ['employeeSlot', 'ASC']]
            });
            if (entryRows.length === 0) continue;
            const labels = await teamLabelsForHeadUserId(hid);
            sheets.push({
                headUserId: hid,
                subdivisionName: meta.subdivisionName,
                headDisplayName: formatPersonLabel(meta.headUser),
                headEmail: meta.headUser.email,
                labels,
                entries: entryRows.map(mapEntryRow)
            });
        }

        res.json({ year, month, sheets });
    } catch (err) {
        console.error('timesheet overview GET', err);
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/timesheet/month — лише pivdenbud (голови підрозділів)
router.put('/month', authMiddleware, requireRole(['pivdenbud']), async (req, res) => {
    try {
        const { year, month, cells } = req.body;
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);
        if (!y || !m || m < 1 || m > 12) {
            return res.status(400).json({ message: 'Некоректний рік або місяць' });
        }
        const lastDay = new Date(y, m, 0).getDate();

        const headId = req.user.id;

        await TimesheetEntry.destroy({
            where: {
                year: y,
                month: m,
                [Op.or]: [{ headUserId: headId }, { headUserId: null, updatedByUserId: headId }]
            }
        });

        const uid = req.user.id;
        const bulk = [];
        if (Array.isArray(cells)) {
            for (const c of cells) {
                const day = parseInt(c.day, 10);
                const slot = parseInt(c.slot, 10);
                if (day < 1 || day > lastDay || slot < 1 || slot > 3) continue;

                const ah = parsePart(c.arrivalHour, 23);
                const am = parsePart(c.arrivalMinute, 59);
                const dh = parsePart(c.departureHour, 23);
                const dm = parsePart(c.departureMinute, 59);

                if (ah == null && am == null && dh == null && dm == null) continue;

                bulk.push({
                    year: y,
                    month: m,
                    day,
                    employeeSlot: slot,
                    arrivalHour: ah,
                    arrivalMinute: am,
                    departureHour: dh,
                    departureMinute: dm,
                    updatedByUserId: uid,
                    headUserId: headId
                });
            }
        }
        if (bulk.length) {
            await TimesheetEntry.bulkCreate(bulk);
        }
        res.json({ ok: true, saved: bulk.length });
    } catch (err) {
        console.error('timesheet PUT', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
