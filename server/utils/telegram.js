const TelegramBot = require('node-telegram-bot-api');
const { generateInvoice } = require('../services/invoiceService');
const Order = require('../models/Order');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot;

if (token) {
    bot = new TelegramBot(token, { polling: true });

    // Handle button clicks
    bot.on('callback_query', async (callbackQuery) => {
        const { data, message } = callbackQuery;

        if (data.startsWith('gen_invoice_')) {
            const orderId = data.replace('gen_invoice_', '');

            try {
                // Inform user that we are working on it
                await bot.answerCallbackQuery(callbackQuery.id, { text: 'Генерую рахунок...' });

                const order = await Order.findByPk(orderId);
                if (!order) {
                    return bot.sendMessage(chatId, 'Помилка: Замовлення не знайдено.');
                }

                const pdfBuffer = await generateInvoice(order);
                const fileName = `Invoice_${order.orderNumber}.pdf`;

                await bot.sendDocument(chatId, pdfBuffer, {
                    caption: `📄 Рахунок для замовлення ${order.orderNumber}`
                }, {
                    filename: fileName,
                    contentType: 'application/pdf'
                });

            } catch (error) {
                console.error('Error in callback_query:', error);
                bot.sendMessage(chatId, 'Сталася помилка при генерації рахунку.');
            }
        }
    });

    // Handle commands
    bot.onText(/\/invoice (.+)/, async (msg, match) => {
        const orderNumber = match[1].trim();

        try {
            const order = await Order.findOne({ where: { orderNumber } });
            if (!order) {
                return bot.sendMessage(chatId, `Замовлення ${orderNumber} не знайдено.`);
            }

            await bot.sendMessage(chatId, 'Генерую рахунок...');
            const pdfBuffer = await generateInvoice(order);
            const fileName = `Invoice_${order.orderNumber}.pdf`;

            await bot.sendDocument(chatId, pdfBuffer, {
                caption: `📄 Рахунок для замовлення ${order.orderNumber}`
            }, {
                filename: fileName,
                contentType: 'application/pdf'
            });

        } catch (error) {
            console.error('Error in /invoice command:', error);
            bot.sendMessage(chatId, 'Сталася помилка при генерації рахунку.');
        }
    });
}

const sendTelegramMessage = async (message, options = {}) => {
    if (!bot || !chatId) {
        console.warn('Telegram bot token or chat ID not provided. Notification not sent.');
        return;
    }

    try {
        await bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            ...options
        });
    } catch (error) {
        console.error('Error sending Telegram message:', error.message);
    }
};

module.exports = { sendTelegramMessage };
