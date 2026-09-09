const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../../../middleware/auth');
const rentalApplicationController = require('../controllers/rentalApplicationController');

const RENTAL_APP_ROLES = ['owner', 'shop_rent', 'rent', 'pivdenbud'];

router.get('/', authMiddleware, requireRole(RENTAL_APP_ROLES), rentalApplicationController.getAllApplications);

router.get('/:id', authMiddleware, requireRole(RENTAL_APP_ROLES), rentalApplicationController.getApplication);

router.post('/', authMiddleware, requireRole(RENTAL_APP_ROLES), rentalApplicationController.createApplicationHandler);

router.put('/:id', authMiddleware, requireRole(RENTAL_APP_ROLES), rentalApplicationController.updateApplicationHandler);

router.delete('/:id', authMiddleware, requireRole(RENTAL_APP_ROLES), rentalApplicationController.deleteApplicationHandler);

router.post('/:id/convert-to-order', authMiddleware, requireRole(RENTAL_APP_ROLES), rentalApplicationController.convertApplicationToOrderHandler);

module.exports = router;
