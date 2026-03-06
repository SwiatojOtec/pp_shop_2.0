const TelegramBot = require('node-telegram-bot-api');
const Product = require('../models/Product');
const { Op } = require('sequelize');
require('dotenv').config();

const rentToken = process.env.TELEGRAM_RENT_BOT_TOKEN;
const allowedIdsRaw = process.env.TELEGRAM_RENT_ALLOWED_IDS || '';
const allowedUserIds = allowedIdsRaw
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

let rentBot;

if (rentToken) {
    rentBot = new TelegramBot(rentToken, { polling: true });

    const isAllowed = (msg) => {
        const fromId = msg.from && msg.from.id ? String(msg.from.id) : null;
        return fromId && allowedUserIds.includes(fromId);
    };

    const helpText = [
        '🛠 <b>Бот оренди – команди</b>',
        '',
        'Доступні команди:',
        '<code>/rentlist</code> – список інструментів оренди з залишками',
        '<code>/setqty SKU КІЛЬКІСТЬ</code> – змінити залишок за SKU',
        '',
        'Приклад:',
        '<code>/setqty ZENIT_2020 3</code>'
    ].join('\n');

    rentBot.onText(/\/start/, async (msg) => {
        if (!isAllowed(msg)) {
            return rentBot.sendMessage(
                msg.chat.id,
                '⛔ У вас немає доступу до цього бота.'
            );
        }
        await rentBot.sendMessage(
            msg.chat.id,
            '👋 Привіт! Це бот для управління орендою.\n' +
            'Через нього можна дивитись інструменти та змінювати залишки.\n\n' +
            'Напишіть /help щоб побачити команди.',
            { parse_mode: 'HTML' }
        );
    });

    rentBot.onText(/\/help/, async (msg) => {
        if (!isAllowed(msg)) {
            return rentBot.sendMessage(
                msg.chat.id,
                '⛔ У вас немає доступу до цього бота.'
            );
        }
        await rentBot.sendMessage(msg.chat.id, helpText, { parse_mode: 'HTML' });
    });

    // Список інструментів оренди
    rentBot.onText(/\/rentlist/, async (msg) => {
        if (!isAllowed(msg)) {
            return rentBot.sendMessage(
                msg.chat.id,
                '⛔ У вас немає доступу до цього бота.'
            );
        }

        try {
            const products = await Product.findAll({
                where: { isRent: true },
                order: [['name', 'ASC']],
                limit: 30
            });

            if (!products.length) {
                return rentBot.sendMessage(msg.chat.id, 'Поки що немає інструментів оренди.');
            }

            let text = '📋 <b>Інструменти оренди</b>\n\n';
            products.forEach((p) => {
                const qty =
                    typeof p.quantityAvailable === 'number'
                        ? `${p.quantityAvailable}`
                        : '—';
                text += `• <b>${p.name}</b>\nSKU: <code>${p.sku}</code>\nЗалишок: <b>${qty}</b>\n\n`;
            });

            await rentBot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
        } catch (err) {
            console.error('rentBot /rentlist error:', err);
            await rentBot.sendMessage(
                msg.chat.id,
                'Сталася помилка при отриманні списку інструментів.'
            );
        }
    });

    // Зміна кількості: /setqty SKU QTY
    rentBot.onText(/\/setqty\s+([^\s]+)\s+(\d+)/, async (msg, match) => {
        if (!isAllowed(msg)) {
            return rentBot.sendMessage(
                msg.chat.id,
                '⛔ У вас немає доступу до цього бота.'
            );
        }

        const sku = match[1];
        const qty = parseInt(match[2], 10);

        if (isNaN(qty) || qty < 0) {
            return rentBot.sendMessage(
                msg.chat.id,
                '❌ Невірна кількість. Використовуйте: /setqty SKU КІЛЬКІСТЬ (0 або більше).'
            );
        }

        try {
            const product = await Product.findOne({
                where: {
                    sku,
                    isRent: true
                }
            });

            if (!product) {
                return rentBot.sendMessage(
                    msg.chat.id,
                    `❌ Не знайдено орендний товар з SKU <code>${sku}</code>.`,
                    { parse_mode: 'HTML' }
                );
            }

            product.quantityAvailable = qty;
            await product.save();

            await rentBot.sendMessage(
                msg.chat.id,
                `✅ Оновлено залишок для:\n<b>${product.name}</b>\nSKU: <code>${product.sku}</code>\nНовий залишок: <b>${qty}</b>`,
                { parse_mode: 'HTML' }
            );
        } catch (err) {
            console.error('rentBot /setqty error:', err);
            await rentBot.sendMessage(
                msg.chat.id,
                'Сталася помилка при оновленні залишку.'
            );
        }
    });

    // Якщо команда не розпізнана
    rentBot.on('message', (msg) => {
        if (!isAllowed(msg)) return;
        if (msg.text && msg.text.startsWith('/')) {
            // Невідомі команди
            rentBot.sendMessage(
                msg.chat.id,
                'Не розпізнана команда. Напишіть /help щоб побачити список доступних команд.'
            );
        }
    });
} else {
    console.warn('TELEGRAM_RENT_BOT_TOKEN не заданий. Бот оренди не запущено.');
}

module.exports = {};

