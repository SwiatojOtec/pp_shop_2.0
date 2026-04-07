const express = require('express');
const router = express.Router();
const RentalApplication = require('../models/RentalApplication');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

// Generate application number like RA-2024-001
const generateAppNumber = async () => {
    const year = new Date().getFullYear();
    const last = await RentalApplication.findOne({
        where: { applicationNumber: { [require('sequelize').Op.like]: `RA-${year}-%` } },
        order: [['id', 'DESC']]
    });
    const nextNum = last
        ? String(parseInt(last.applicationNumber.split('-')[2]) + 1).padStart(3, '0')
        : '001';
    return `RA-${year}-${nextNum}`;
};

const toIsoDate = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const shouldBeOverdue = (app, todayIso = toIsoDate()) => {
    if (!app?.rentTo) return false;
    if (!['active', 'booked'].includes(app.status)) return false;
    return app.rentTo < todayIso;
};

const applyAutoOverdueStatus = async (app, todayIso = toIsoDate()) => {
    if (!shouldBeOverdue(app, todayIso)) return app;
    await app.update({ status: 'overdue' });
    app.status = 'overdue';
    return app;
};

const applyAutoOverdueForAll = async () => {
    const todayIso = toIsoDate();
    await RentalApplication.update(
        { status: 'overdue' },
        {
            where: {
                status: { [Op.in]: ['active', 'booked'] },
                rentTo: { [Op.lt]: todayIso }
            }
        }
    );
};

// GET all applications
router.get('/', authMiddleware, requireRole(['owner', 'manager', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        await applyAutoOverdueForAll();
        const where = {};
        if (req.query.clientId) {
            const cid = parseInt(req.query.clientId, 10);
            if (!Number.isNaN(cid) && cid > 0) where.clientId = cid;
        }
        const applications = await RentalApplication.findAll({ where, order: [['createdAt', 'DESC']] });
        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single application
router.get('/:id', authMiddleware, requireRole(['owner', 'manager', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const app = await RentalApplication.findByPk(req.params.id);
        if (!app) return res.status(404).json({ message: 'Application not found' });
        await applyAutoOverdueStatus(app);
        res.json(app);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create application
router.post('/', authMiddleware, requireRole(['owner', 'manager', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const applicationNumber = await generateAppNumber();
        const payload = { ...req.body };
        if (payload.rentTo && ['active', 'booked'].includes(payload.status)) {
            if (payload.rentTo < toIsoDate()) payload.status = 'overdue';
        }
        const application = await RentalApplication.create({
            ...payload,
            applicationNumber,
            createdBy: req.user?.id || null
        });
        res.status(201).json(application);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update application
router.put('/:id', authMiddleware, requireRole(['owner', 'manager', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const app = await RentalApplication.findByPk(req.params.id);
        if (!app) return res.status(404).json({ message: 'Application not found' });
        const next = { ...req.body };
        const nextStatus = next.status || app.status;
        const nextRentTo = next.rentTo || app.rentTo;
        if (nextRentTo && ['active', 'booked'].includes(nextStatus) && nextRentTo < toIsoDate()) {
            next.status = 'overdue';
        }
        await app.update(next);
        res.json(app);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE application
router.delete('/:id', authMiddleware, requireRole(['owner', 'manager', 'rent', 'pivdenbud']), async (req, res) => {
    try {
        const app = await RentalApplication.findByPk(req.params.id);
        if (!app) return res.status(404).json({ message: 'Application not found' });
        await app.destroy();
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
