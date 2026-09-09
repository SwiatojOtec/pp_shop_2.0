const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../../../middleware/auth');
const orderController = require('../controllers/orderController');

const ORDER_ROLES = ['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud'];

router.post('/', orderController.createOrder);

router.post('/admin', authMiddleware, requireRole(ORDER_ROLES), orderController.createAdminOrder);

router.get('/by-client/:clientId', authMiddleware, requireRole(ORDER_ROLES), orderController.getOrdersByClientHandler);

router.get('/', authMiddleware, requireRole(ORDER_ROLES), orderController.getAllOrders);

router.get('/deals', authMiddleware, requireRole(ORDER_ROLES), orderController.getDealsList);

router.get('/:id/documents', authMiddleware, requireRole(ORDER_ROLES), orderController.listDocuments);

router.post('/:id/documents/rental-act-number', authMiddleware, requireRole(ORDER_ROLES), orderController.getNextRentalActNumber);

router.post('/:id/documents/invoice', authMiddleware, requireRole(ORDER_ROLES), orderController.createInvoiceDocument);

router.post('/:id/documents/deposit-invoice', authMiddleware, requireRole(ORDER_ROLES), orderController.createDepositInvoiceDocument);

router.post('/:id/documents/rental-contract/check', authMiddleware, requireRole(ORDER_ROLES), orderController.checkRentalContract);

router.post('/:id/documents/rental-contract', authMiddleware, requireRole(ORDER_ROLES), orderController.createRentalContractDocument);

router.post('/:id/documents/rental-protocol/check', authMiddleware, requireRole(ORDER_ROLES), orderController.checkRentalProtocol);

router.post('/:id/documents/rental-protocol', authMiddleware, requireRole(ORDER_ROLES), orderController.createRentalProtocolDocument);

router.get('/:id/documents/:docId', authMiddleware, requireRole(ORDER_ROLES), orderController.getDocumentFile);

router.delete('/:id/documents/:docId', authMiddleware, requireRole(ORDER_ROLES), orderController.deleteDocument);

router.post('/:id/documents/rental-application', authMiddleware, requireRole(ORDER_ROLES), orderController.uploadRentalApplicationDocument);

router.post('/:id/documents/rental-return-act', authMiddleware, requireRole(ORDER_ROLES), orderController.uploadRentalReturnActDocument);

router.post('/:id/rental-application', authMiddleware, requireRole(ORDER_ROLES), orderController.createRentalApplicationFromOrder);

router.get('/:id', authMiddleware, requireRole(ORDER_ROLES), orderController.getOrderById);

router.put('/:id', authMiddleware, requireRole(ORDER_ROLES), orderController.updateOrder);

router.delete('/:id', authMiddleware, requireRole(ORDER_ROLES), orderController.deleteOrder);

module.exports = router;
