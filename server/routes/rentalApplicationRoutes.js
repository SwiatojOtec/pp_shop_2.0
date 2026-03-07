const express = require('express');
const router = express.Router();
const RentalApplication = require('../models/RentalApplication');
const { authMiddleware, requireRole } = require('../middleware/auth');

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

// GET all applications
router.get('/', authMiddleware, requireRole(['owner', 'manager', 'rent']), async (req, res) => {
    try {
        const applications = await RentalApplication.findAll({ order: [['createdAt', 'DESC']] });
        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single application
router.get('/:id', authMiddleware, requireRole(['owner', 'manager', 'rent']), async (req, res) => {
    try {
        const app = await RentalApplication.findByPk(req.params.id);
        if (!app) return res.status(404).json({ message: 'Application not found' });
        res.json(app);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create application
router.post('/', authMiddleware, requireRole(['owner', 'manager', 'rent']), async (req, res) => {
    try {
        const applicationNumber = await generateAppNumber();
        const application = await RentalApplication.create({
            ...req.body,
            applicationNumber,
            createdBy: req.user?.id || null
        });
        res.status(201).json(application);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update application
router.put('/:id', authMiddleware, requireRole(['owner', 'manager', 'rent']), async (req, res) => {
    try {
        const app = await RentalApplication.findByPk(req.params.id);
        if (!app) return res.status(404).json({ message: 'Application not found' });
        await app.update(req.body);
        res.json(app);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE application
router.delete('/:id', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
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
