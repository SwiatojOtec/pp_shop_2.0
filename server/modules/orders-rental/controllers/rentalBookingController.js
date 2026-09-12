const {
    listBookings,
    getBookingById,
    createBooking,
    updateBooking,
    cancelBooking,
    deleteBooking,
    listCalendarEvents,
    convertBookingToOrder,
} = require('../services/rentalBookingService');

async function getCalendarEvents(req, res) {
    try {
        const payload = await listCalendarEvents({
            from: req.query.from,
            to: req.query.to,
        });
        res.json(payload);
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
}

async function getAllBookings(req, res) {
    try {
        const bookings = await listBookings(req.query);
        res.json(bookings);
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
}

async function getBooking(req, res) {
    try {
        const booking = await getBookingById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Бронь не знайдено' });
        res.json(booking);
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
}

async function createBookingHandler(req, res) {
    try {
        const booking = await createBooking(req.body, req.user?.id || null);
        res.status(201).json(booking);
    } catch (err) {
        res.status(err.status || 400).json({
            message: err.message,
            conflicts: err.conflicts || undefined,
        });
    }
}

async function updateBookingHandler(req, res) {
    try {
        const booking = await updateBooking(req.params.id, req.body);
        if (!booking) return res.status(404).json({ message: 'Бронь не знайдено' });
        res.json(booking);
    } catch (err) {
        res.status(err.status || 400).json({
            message: err.message,
            conflicts: err.conflicts || undefined,
        });
    }
}

async function cancelBookingHandler(req, res) {
    try {
        const booking = await cancelBooking(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Бронь не знайдено' });
        res.json(booking);
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
}

async function deleteBookingHandler(req, res) {
    try {
        const deleted = await deleteBooking(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Бронь не знайдено' });
        res.json({ message: 'Видалено' });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
}

async function convertBookingHandler(req, res) {
    try {
        const result = await convertBookingToOrder(req.params.id, req.user || null);
        if (!result) return res.status(404).json({ message: 'Бронь не знайдено' });
        res.status(201).json(result);
    } catch (err) {
        res.status(err.status || 400).json({ message: err.message });
    }
}

module.exports = {
    getCalendarEvents,
    getAllBookings,
    getBooking,
    createBookingHandler,
    updateBookingHandler,
    cancelBookingHandler,
    deleteBookingHandler,
    convertBookingHandler,
};
