const {
    listApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    deleteApplication,
} = require('../services/rentalApplicationService');
const { convertApplicationToOrder } = require('../services/orderRentalService');

async function getAllApplications(req, res) {
    try {
        const applications = await listApplications(req.query);
        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function getApplication(req, res) {
    try {
        const payload = await getApplicationById(req.params.id);
        if (!payload) return res.status(404).json({ message: 'Application not found' });
        res.json(payload);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function createApplicationHandler(req, res) {
    try {
        const application = await createApplication(req.body, req.user?.id || null);
        res.status(201).json(application);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}

async function updateApplicationHandler(req, res) {
    try {
        const app = await updateApplication(req.params.id, req.body);
        if (!app) return res.status(404).json({ message: 'Application not found' });
        res.json(app);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}

async function deleteApplicationHandler(req, res) {
    try {
        const deleted = await deleteApplication(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Application not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function convertApplicationToOrderHandler(req, res) {
    try {
        const order = await convertApplicationToOrder(req.params.id, req.user || null);
        res.status(201).json({ order });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
}

module.exports = {
    getAllApplications,
    getApplication,
    createApplicationHandler,
    updateApplicationHandler,
    deleteApplicationHandler,
    convertApplicationToOrderHandler,
};
