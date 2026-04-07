const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const WarehouseEvent = require('../models/WarehouseEvent');
const RentalApplication = require('../models/RentalApplication');
const Product = require('../models/Product');
const InventoryItem = require('../models/InventoryItem');
const Warehouse = require('../models/Warehouse');
const { authMiddleware, requireRole } = require('../middleware/auth');

const GUARD = [authMiddleware, requireRole(['owner', 'manager', 'rent', 'pivdenbud'])];

router.get('/dashboard', ...GUARD, async (req, res) => {
    try {
        const eventLimit = Math.min(100, Math.max(1, parseInt(req.query.eventLimit, 10) || 50));
        const events = await WarehouseEvent.findAll({
            order: [['createdAt', 'DESC']],
            limit: eventLimit
        });

        const rentProducts = await Product.findAll({
            where: { isRent: true },
            attributes: ['id', 'name', 'sku', 'image', 'stockStatus', 'quantityAvailable'],
            order: [['name', 'ASC']]
        });

        const invRows = await InventoryItem.findAll({
            include: [
                { model: Warehouse, attributes: ['id', 'name'] },
                { model: Product, where: { isRent: true }, required: true, attributes: ['id', 'name', 'sku'] }
            ]
        });

        const byProduct = new Map();
        for (const r of invRows) {
            const pid = r.productId;
            if (!byProduct.has(pid)) {
                byProduct.set(pid, []);
            }
            byProduct.get(pid).push({
                warehouseId: r.warehouseId,
                warehouseName: r.Warehouse ? r.Warehouse.name : '—',
                quantity: r.quantity,
                reserved: r.reserved
            });
        }

        const apps = await RentalApplication.findAll({
            where: { status: { [Op.in]: ['active', 'booked', 'overdue'] } },
            order: [['updatedAt', 'DESC']],
            attributes: ['id', 'applicationNumber', 'status', 'clientName', 'rentFrom', 'rentTo', 'items']
        });

        const rentalsByProduct = new Map();
        for (const app of apps) {
            for (const line of app.items || []) {
                const pid = Number(line.productId);
                if (!pid) continue;
                if (!rentalsByProduct.has(pid)) rentalsByProduct.set(pid, []);
                rentalsByProduct.get(pid).push({
                    applicationId: app.id,
                    applicationNumber: app.applicationNumber,
                    status: app.status,
                    clientName: app.clientName,
                    rentFrom: app.rentFrom,
                    rentTo: app.rentTo
                });
            }
        }

        const productLocations = rentProducts.map((p) => ({
            productId: p.id,
            name: p.name,
            sku: p.sku,
            image: p.image,
            stockStatus: p.stockStatus,
            quantityAvailable: p.quantityAvailable,
            warehouses: byProduct.get(p.id) || [],
            activeRentals: rentalsByProduct.get(p.id) || []
        }));

        res.json({ events, productLocations });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/product-rentals/:productId', ...GUARD, async (req, res) => {
    try {
        const pid = Number(req.params.productId);
        if (!Number.isFinite(pid)) return res.status(400).json({ message: 'Некоректний ID' });

        const apps = await RentalApplication.findAll({
            where: { status: { [Op.in]: ['active', 'booked', 'overdue', 'returned', 'draft'] } },
            order: [['updatedAt', 'DESC']],
            attributes: ['id', 'applicationNumber', 'status', 'clientName', 'rentFrom', 'rentTo', 'items']
        });

        const filtered = apps.filter((a) => (a.items || []).some((i) => Number(i.productId) === pid));
        res.json(filtered.map((a) => ({
            id: a.id,
            applicationNumber: a.applicationNumber,
            status: a.status,
            clientName: a.clientName,
            rentFrom: a.rentFrom,
            rentTo: a.rentTo
        })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
