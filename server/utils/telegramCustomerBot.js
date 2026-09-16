/**
 * Telegram-бот для клієнтів (docs plan «Telegram-бот для клієнтів»):
 * клієнт сам пише боту (Telegram не дозволяє ботам писати першими за
 * номером), ділиться номером через кнопку — і далі отримує сповіщення
 * про статус своїх замовлень або дивиться їх за запитом.
 *
 * Той самий каркас, що й server/utils/telegram.js та telegramRent.js —
 * окремий токен, polling, мовчки не стартує без нього.
 */
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { Op } = require('sequelize');
const Client = require('../models/Client');
const Product = require('../models/Product');
const { getOrdersByClient } = require('../modules/orders-rental/services/orderService');
const { normalizeUaPhone, phoneTailsMatch } = require('./phoneUtils');
const { getOrderStatusLabel, getDealStatusLabel } = require('../constants/orderStatusLabels');
require('dotenv').config();

// Статична ілюстрація "у дорозі" (напр. фірмовий Fiat Doblo) — кладеться
// сюди вручну; поки файлу нема, бот просто не додає фото до повідомлення.
const IN_TRANSIT_PHOTO_PATH = path.join(__dirname, '../assets/in-transit.jpg');

const token = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;

let bot;

const contactKeyboard = {
    reply_markup: {
        keyboard: [[{ text: '📱 Поділитися номером', request_contact: true }]],
        resize_keyboard: true,
    },
};

const linkedMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '📦 Останнє замовлення' }],
            [{ text: '🗂 Усі замовлення' }],
            [{ text: '🔌 Відʼєднати' }],
        ],
        resize_keyboard: true,
    },
};

async function findClientByPhone(rawPhone) {
    const normalized = normalizeUaPhone(rawPhone);
    if (normalized.length < 12) return null;
    const tail = normalized.slice(-9);
    const candidates = await Client.findAll({
        where: {
            [Op.or]: [
                { phone: { [Op.iLike]: `%${tail}%` } },
                { phoneSecondary: { [Op.iLike]: `%${tail}%` } },
                { phoneEmergency: { [Op.iLike]: `%${tail}%` } },
            ],
        },
        limit: 30,
        order: [['updatedAt', 'DESC']],
    });
    return candidates.find((c) => (
        phoneTailsMatch(c.phone, normalized)
        || phoneTailsMatch(c.phoneSecondary, normalized)
        || phoneTailsMatch(c.phoneEmergency, normalized)
    )) || null;
}

async function findLinkedClientForOrder(order) {
    if (order.clientId) {
        const client = await Client.findByPk(order.clientId);
        return client?.telegramChatId ? client : null;
    }
    if (!order.customerPhone) return null;
    const linked = await Client.findAll({ where: { telegramChatId: { [Op.ne]: null } } });
    return linked.find((c) => (
        phoneTailsMatch(c.phone, order.customerPhone)
        || phoneTailsMatch(c.phoneSecondary, order.customerPhone)
        || phoneTailsMatch(c.phoneEmergency, order.customerPhone)
    )) || null;
}

async function linkChatToPhone(chatId, phone, from) {
    const normalized = normalizeUaPhone(phone);
    if (normalized.length < 12) return null;

    let client = await findClientByPhone(normalized);
    if (client) {
        await client.update({
            telegramChatId: String(chatId),
            telegramUsername: from?.username || null,
        });
    } else {
        const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim() || 'Клієнт Telegram';
        client = await Client.create({
            fullName,
            phone: normalized,
            telegramChatId: String(chatId),
            telegramUsername: from?.username || null,
        });
    }
    return client;
}

function formatUaDate(iso) {
    const s = String(iso || '').slice(0, 10);
    const [y, m, d] = s.split('-');
    return (y && m && d) ? `${d}.${m}.${y}` : '';
}

// RentalApplication-рядки (statusDomain 'rental', приходять окремо від
// Order — заявка оренди, ще не перетворена на замовлення) не проставляють
// isRent на кожній позиції: там усі позиції інструмент за визначенням.
function formatOrderItemLine(item, row) {
    const name = item.name || 'Позиція';
    const isRentItem = item.isRent || row.statusDomain === 'rental';
    if (isRentItem) {
        const from = formatUaDate(item.rentFrom);
        const to = formatUaDate(item.rentTo);
        const range = from && to ? ` (${from} → ${to})` : (to ? ` до ${to}` : '');
        return `🔧 ${name}${range}`;
    }
    const qty = item.quantity ?? 0;
    const unit = item.unit || 'шт';
    return `🛒 ${name} × ${qty} ${unit}`;
}

function formatOrderDetail(o) {
    const total = Number(o.totalAmount || 0).toFixed(2);
    const itemLines = (o.items || []).map((item) => formatOrderItemLine(item, o)).join('\n');
    let message = `📄 <b>№${o.number}</b> — ${getDealStatusLabel(o)}\n`;
    message += itemLines ? `${itemLines}\n` : '(поки без позицій)\n';
    message += `💰 Разом: ${total} ₴`;
    return message;
}

// RentalApplication-рядки (statusDomain 'rental') зберігають позиції з
// productId (не id — той самий id, що на Order-рядках, там сам товар).
async function getPrimaryItemImage(o) {
    const items = o.items || [];
    if (!items.length) return null;
    const ids = [...new Set(
        items.map((item) => (o.statusDomain === 'rental' ? item.productId : item.id)).filter(Boolean)
    )];
    if (!ids.length) return null;
    const products = await Product.findAll({ where: { id: ids }, attributes: ['id', 'image'] });
    const imageById = new Map(products.map((p) => [p.id, p.image]));
    for (const item of items) {
        const pid = o.statusDomain === 'rental' ? item.productId : item.id;
        const image = imageById.get(pid);
        if (image) return image;
    }
    return null;
}

async function sendLatestOrder(chatId, client) {
    const orders = await getOrdersByClient(client.id);
    if (!orders.length) {
        await bot.sendMessage(chatId, 'Замовлень поки немає.', linkedMenu);
        return;
    }
    const o = orders[0];
    const caption = formatOrderDetail(o);
    const imageUrl = await getPrimaryItemImage(o).catch(() => null);
    if (imageUrl) {
        try {
            await bot.sendPhoto(chatId, imageUrl, { caption, parse_mode: 'HTML', ...linkedMenu });
            return;
        } catch (err) {
            console.error('customerBot sendPhoto error:', err);
        }
    }
    await bot.sendMessage(chatId, caption, { parse_mode: 'HTML', ...linkedMenu });
}

async function sendOrdersList(chatId, client) {
    const orders = await getOrdersByClient(client.id);
    if (!orders.length) {
        await bot.sendMessage(chatId, 'Замовлень поки немає.', linkedMenu);
        return;
    }
    let message = '<b>Усі ваші замовлення:</b>\n\n';
    orders.slice(0, 15).forEach((o) => {
        const total = Number(o.totalAmount || 0).toFixed(2);
        message += `📄 №${o.number} — ${getDealStatusLabel(o)} — ${total} ₴\n`;
    });
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...linkedMenu });
}

if (token) {
    bot = new TelegramBot(token, { polling: true });

    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const client = await Client.findOne({ where: { telegramChatId: String(chatId) } });
        if (client) {
            await bot.sendMessage(
                chatId,
                `👋 Вітаю знову, ${client.fullName}! Оберіть дію в меню нижче.`,
                linkedMenu
            );
            return;
        }
        await bot.sendMessage(
            chatId,
            '👋 Вітаю! Я бот ПАН ПАРКЕТ — тут можна відстежувати статус ваших замовлень.\n\n' +
            'Поділіться номером телефону, яким оформлювали замовлення, щоб підключитись:',
            contactKeyboard
        );
    });

    bot.on('contact', async (msg) => {
        const chatId = msg.chat.id;
        try {
            const client = await linkChatToPhone(chatId, msg.contact.phone_number, msg.from);
            if (!client) {
                await bot.sendMessage(chatId, '❌ Не вдалося розпізнати номер. Спробуйте ще раз.', contactKeyboard);
                return;
            }
            await bot.sendMessage(
                chatId,
                `✅ Підключено, ${client.fullName}! Надсилатиму статус ваших замовлень сюди.`,
                linkedMenu
            );
        } catch (err) {
            console.error('customerBot contact error:', err);
            await bot.sendMessage(chatId, '❌ Сталася помилка. Спробуйте пізніше.');
        }
    });

    bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;
        const chatId = msg.chat.id;

        if (msg.text === '📦 Останнє замовлення') {
            const client = await Client.findOne({ where: { telegramChatId: String(chatId) } });
            if (!client) {
                await bot.sendMessage(chatId, 'Спершу поділіться номером телефону:', contactKeyboard);
                return;
            }
            await sendLatestOrder(chatId, client);
            return;
        }

        if (msg.text === '🗂 Усі замовлення') {
            const client = await Client.findOne({ where: { telegramChatId: String(chatId) } });
            if (!client) {
                await bot.sendMessage(chatId, 'Спершу поділіться номером телефону:', contactKeyboard);
                return;
            }
            await sendOrdersList(chatId, client);
            return;
        }

        if (msg.text === '🔌 Відʼєднати') {
            const client = await Client.findOne({ where: { telegramChatId: String(chatId) } });
            if (client) {
                await client.update({ telegramChatId: null, telegramUsername: null });
            }
            await bot.sendMessage(chatId, '🔌 Відʼєднано. Ви більше не отримуватимете сповіщення.', {
                reply_markup: { remove_keyboard: true },
            });
            return;
        }

        // Fallback: користувач ввів номер текстом замість кнопки.
        const digits = msg.text.replace(/\D/g, '');
        if (digits.length >= 9) {
            const client = await linkChatToPhone(chatId, msg.text, msg.from);
            if (client) {
                await bot.sendMessage(chatId, `✅ Підключено, ${client.fullName}!`, linkedMenu);
            } else {
                await bot.sendMessage(chatId, '❌ Не схоже на номер телефону. Спробуйте ще раз або скористайтесь кнопкою:', contactKeyboard);
            }
        }
    });

    bot.onText(/\/orders/, async (msg) => {
        const chatId = msg.chat.id;
        const client = await Client.findOne({ where: { telegramChatId: String(chatId) } });
        if (!client) {
            await bot.sendMessage(chatId, 'Спершу поділіться номером телефону:', contactKeyboard);
            return;
        }
        await sendLatestOrder(chatId, client);
    });

    bot.onText(/\/unlink/, async (msg) => {
        const chatId = msg.chat.id;
        const client = await Client.findOne({ where: { telegramChatId: String(chatId) } });
        if (client) {
            await client.update({ telegramChatId: null, telegramUsername: null });
        }
        await bot.sendMessage(chatId, '🔌 Відʼєднано.', { reply_markup: { remove_keyboard: true } });
    });
} else {
    console.warn('TELEGRAM_CUSTOMER_BOT_TOKEN не заданий. Клієнтський бот не запущено.');
}

async function notifyOrderCreated(order) {
    if (!bot) return;
    const client = await findLinkedClientForOrder(order);
    if (!client) return;
    await bot.sendMessage(
        client.telegramChatId,
        `✅ Замовлення №${order.orderNumber} отримано! Найближчим часом з вами зв'яжеться наш менеджер.`
    );
}

async function notifyOrderStatusChanged(order) {
    if (!bot) return;
    const client = await findLinkedClientForOrder(order);
    if (!client) return;
    const chatId = client.telegramChatId;

    await bot.sendMessage(
        chatId,
        `📦 Замовлення №${order.orderNumber}: статус змінено на «${getOrderStatusLabel(order.status)}».`
    );

    // "У дорозі" — тепле повідомлення без конкретних хвилин (реальний ОСРМ-
    // розрахунок без урахування київських заторів давав нереалістичний ETA)
    // і без мітки на карті (клієнт і так знає свою адресу) — лише фото
    // фірмової машини, якщо файл уже покладено в assets.
    if (order.status === 'in_transit' && order.deliveryMethod === 'delivery') {
        try {
            const text = `🚚 Замовлення №${order.orderNumber} вже в дорозі! Наш кур'єр везе ваше замовлення${order.address ? ` за адресою: ${order.address}` : ''}.`;
            if (fs.existsSync(IN_TRANSIT_PHOTO_PATH)) {
                await bot.sendPhoto(chatId, IN_TRANSIT_PHOTO_PATH, { caption: text });
            } else {
                await bot.sendMessage(chatId, text);
            }
        } catch (err) {
            console.error('customerBot in_transit message error:', err);
        }
    }
}

module.exports = { notifyOrderCreated, notifyOrderStatusChanged };
