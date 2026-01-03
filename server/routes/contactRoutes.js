const express = require('express');
const router = express.Router();
const { sendTelegramMessage } = require('../utils/telegram');

// Handle contact form submission
router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !message) {
            return res.status(400).json({ message: 'Name and message are required' });
        }

        // Send Telegram Notification
        const telegramMessage = `
✉️ <b>Нове повідомлення з сайту</b>
👤 Ім'я: ${name}
📧 Email: ${email || 'не вказано'}
💬 Повідомлення:
${message}
        `;

        await sendTelegramMessage(telegramMessage);

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
