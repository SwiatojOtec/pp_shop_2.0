const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../../../middleware/auth');
const rentalBookingController = require('../controllers/rentalBookingController');

const RENTAL_ROLES = ['owner', 'shop_rent', 'rent', 'pivdenbud'];

router.get('/events', authMiddleware, requireRole(RENTAL_ROLES), rentalBookingController.getCalendarEvents);

router.get('/bookings', authMiddleware, requireRole(RENTAL_ROLES), rentalBookingController.getAllBookings);

router.get('/bookings/:id', authMiddleware, requireRole(RENTAL_ROLES), rentalBookingController.getBooking);

router.post('/bookings', authMiddleware, requireRole(RENTAL_ROLES), rentalBookingController.createBookingHandler);

router.patch('/bookings/:id', authMiddleware, requireRole(RENTAL_ROLES), rentalBookingController.updateBookingHandler);

router.post('/bookings/:id/cancel', authMiddleware, requireRole(RENTAL_ROLES), rentalBookingController.cancelBookingHandler);

router.post('/bookings/:id/convert', authMiddleware, requireRole(RENTAL_ROLES), rentalBookingController.convertBookingHandler);

router.delete('/bookings/:id', authMiddleware, requireRole(RENTAL_ROLES), rentalBookingController.deleteBookingHandler);

module.exports = router;
