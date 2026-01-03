const TelegramBot = require('node-telegram-bot-api');
const { generateInvoice } = require('../services/invoiceService');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { Op } = require('sequelize');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot;
const userState = {}; // To track calculator state

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
                const fileName = `Invoice_${order.orderNumber.replace(/\//g, '_')}.pdf`;

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

        if (data.startsWith('calc_prod_')) {
            const productId = data.replace('calc_prod_', '');
            const product = await Product.findByPk(productId);

            if (product) {
                if (product.priceMatrix && product.priceMatrix.length > 0) {
                    userState[chatId] = { step: 'awaiting_sill_width', product };
                    await bot.sendMessage(chatId, `🪟 Вибрано підвіконня: <b>${product.name}</b>\n\nВведіть <b>ширину</b> підвіконня в мм (напр. 200):`, { parse_mode: 'HTML' });
                } else {
                    userState[chatId] = { step: 'awaiting_qty', product };
                    await bot.sendMessage(chatId, `🔢 Вибрано: <b>${product.name}</b>\nЦіна: ${product.price} грн/${product.unit}\nУпаковка: ${product.packSize} ${product.unit}\n\nВведіть необхідну кількість у <b>${product.unit}</b>:`, { parse_mode: 'HTML' });
                }
            }
        }
    });

    // Handle /calc command
    bot.onText(/\/calc/, async (msg) => {
        await bot.sendMessage(chatId, '🔍 Введіть назву товару для пошуку:');
        userState[chatId] = { step: 'awaiting_search' };
    });

    // Handle text messages for calculator
    bot.on('message', async (msg) => {
        if (msg.text && msg.text.startsWith('/')) return;

        const state = userState[chatId];
        if (!state) return;

        if (state.step === 'awaiting_search') {
            const products = await Product.findAll({
                where: {
                    name: { [Op.iLike]: `%${msg.text}%` }
                },
                limit: 5
            });

            if (products.length === 0) {
                return bot.sendMessage(chatId, '❌ Товарів не знайдено. Спробуйте іншу назву:');
            }

            const buttons = products.map(p => ([{
                text: `${p.name} (${p.price} грн)`,
                callback_data: `calc_prod_${p.id}`
            }]));

            await bot.sendMessage(chatId, 'Оберіть товар:', {
                reply_markup: { inline_keyboard: buttons }
            });
            delete userState[chatId];
        } else if (state.step === 'awaiting_qty') {
            const qty = parseFloat(msg.text.replace(',', '.'));
            if (isNaN(qty)) {
                return bot.sendMessage(chatId, '❌ Будь ласка, введіть число:');
            }

            const p = state.product;
            const packSize = parseFloat(p.packSize) || 1;
            const packsNeeded = Math.ceil(qty / packSize);
            const totalQty = packsNeeded * packSize;
            const totalPrice = totalQty * parseFloat(p.price);

            const result = `
📊 <b>Результат розрахунку:</b>
📦 Товар: ${p.name}
📐 Потрібно: ${qty} ${p.unit}
🏗️ Упаковок: <b>${packsNeeded} шт</b>
📏 Разом: ${totalQty.toFixed(2)} ${p.unit}
💰 Ціна за ${p.unit}: ${p.price} грн
💵 <b>Сума до сплати: ${totalPrice.toFixed(2)} грн</b>
            `;

            await bot.sendMessage(chatId, result, { parse_mode: 'HTML' });
            delete userState[chatId];
        } else if (state.step === 'awaiting_sill_width') {
            const width = parseInt(msg.text);
            if (isNaN(width) || width <= 0) {
                return bot.sendMessage(chatId, '❌ Введіть коректну ширину в мм:');
            }

            state.width = width;
            state.step = 'awaiting_sill_length';
            await bot.sendMessage(chatId, `✅ Ширина: ${width} мм\nТепер введіть <b>довжину</b> підвіконня в мм (напр. 1500):`, { parse_mode: 'HTML' });
        } else if (state.step === 'awaiting_sill_length') {
            const length = parseInt(msg.text);
            if (isNaN(length) || length <= 0) {
                return bot.sendMessage(chatId, '❌ Введіть коректну довжину в мм:');
            }

            const p = state.product;
            const width = state.width;
            const calcWidth = Math.ceil(width / 50) * 50;

            const match = p.priceMatrix.find(row => row.width === calcWidth);

            if (!match) {
                const max = Math.max(...p.priceMatrix.map(r => r.width));
                if (width > max) {
                    await bot.sendMessage(chatId, `❌ Помилка: Максимальна ширина для цього товару ${max} мм.`);
                } else {
                    await bot.sendMessage(chatId, '❌ Помилка: Нестандартний розмір. Зверніться до менеджера.');
                }
                delete userState[chatId];
                return;
            }

            const totalPrice = Math.round((match.price * length) / 1000);

            const result = `
📊 <b>Результат розрахунку (Підвіконня):</b>
📦 Товар: ${p.name}
📏 Розмір: ${width}мм x ${length}мм
📐 Розрахункова ширина: ${calcWidth}мм
💰 Ціна за м.п.: ${match.price} грн
💵 <b>Сума до сплати: ${totalPrice} грн</b>
            `;

            await bot.sendMessage(chatId, result, { parse_mode: 'HTML' });
            delete userState[chatId];
        }
    });

    // Handle /invoice command
    bot.onText(/\/invoice (.+)/, async (msg, match) => {
        const orderNumber = match[1].trim();

        try {
            const order = await Order.findOne({ where: { orderNumber } });
            if (!order) {
                return bot.sendMessage(chatId, `Замовлення ${orderNumber} не знайдено.`);
            }

            await bot.sendMessage(chatId, 'Генерую рахунок...');
            const pdfBuffer = await generateInvoice(order);
            const fileName = `Invoice_${order.orderNumber.replace(/\//g, '_')}.pdf`;

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
