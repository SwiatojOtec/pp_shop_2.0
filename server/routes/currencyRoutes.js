const express = require('express');
const router = express.Router();
const Currency = require('../models/Currency');

// Get all currency rates
router.get('/', async (req, res) => {
    try {
        const currencies = await Currency.findAll();
        res.json(currencies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update or create a currency rate
router.post('/', async (req, res) => {
    const { code, rate } = req.body;
    try {
        const [currency, created] = await Currency.findOrCreate({
            where: { code },
            defaults: { rate }
        });

        if (!created) {
            currency.rate = rate;
            await currency.save();
        }
        res.json(currency);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
