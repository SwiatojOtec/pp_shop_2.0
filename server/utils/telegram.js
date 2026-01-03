const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot;

if (token) {
    bot = new TelegramBot(token, { polling: false });
}

const sendTelegramMessage = async (message) => {
    if (!bot || !chatId) {
        console.warn('Telegram bot token or chat ID not provided. Notification not sent.');
        return;
    }

    try {
        await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
        console.error('Error sending Telegram message:', error.message);
    }
};

module.exports = { sendTelegramMessage };
