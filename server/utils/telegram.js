const TelegramBot = require('node-telegram-bot-api');
const { generateInvoice } = require('../services/invoiceService');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { Op } = require('sequelize');
const { normalizeUaPhone } = require('./phoneUtils');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot;
const userState = {}; // To track calculator state

if (token) {
    bot = new TelegramBot(token, { polling: true });

    const mainMenu = {
        reply_markup: {
            keyboard: [
                [{ text: '📊 Калькулятор' }, { text: '📦 Останні замовлення' }],
                [{ text: '❓ Допомога' }]
            ],
            resize_keyboard: true
        }
    };

    // Handle /start command
    bot.onText(/\/start/, async (msg) => {
        await bot.sendMessage(chatId, '👋 Вітаю! Я ваш помічник PP-Shop.\nОберіть потрібну дію в меню нижче:', mainMenu);
    });

    // Handle all text messages
    bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;

        const state = userState[chatId];

        // 1. Handle Main Menu Buttons
        if (msg.text === '📊 Калькулятор') {
            await bot.sendMessage(chatId, '🔍 Введіть назву товару для пошуку:', {
                reply_markup: {
                    keyboard: [[{ text: '❌ Скасувати розрахунок' }]],
                    resize_keyboard: true
                }
            });
            userState[chatId] = { step: 'awaiting_search', items: [], totalAmount: 0 };
            return;
        }

        if (msg.text === '❌ Скасувати розрахунок') {
            delete userState[chatId];
            await bot.sendMessage(chatId, 'Розрахунок скасовано.', mainMenu);
            return;
        }

        if (msg.text === '📦 Останні замовлення') {
            try {
                const orders = await Order.findAll({ limit: 5, order: [['createdAt', 'DESC']] });
                if (orders.length === 0) {
                    return bot.sendMessage(chatId, 'Замовлень поки немає.');
                }

                let message = '<b>Останні 5 замовлень:</b>\n\n';
                orders.forEach(o => {
                    message += `📄 №${o.orderNumber} - ${o.customerName} (${o.totalAmount} грн)\n`;
                });

                await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
            } catch (error) {
                bot.sendMessage(chatId, 'Помилка при отриманні замовлень.');
            }
            return;
        }

        if (msg.text === '❓ Допомога') {
            await bot.sendMessage(chatId, '💡 <b>Як користуватися ботом:</b>\n\n1. Натисніть <b>Калькулятор</b>, щоб швидко порахувати вартість вінілу або підвіконня.\n2. Натисніть <b>Останні замовлення</b>, щоб побачити список нових покупок.\n3. Ви можете ввести <code>/invoice НОМЕР</code>, щоб отримати рахунок у PDF.', { parse_mode: 'HTML' });
            return;
        }

        // 2. Handle Calculator Steps
        if (state) {
            if (state.step === 'awaiting_search') {
                const products = await Product.findAll({
                    where: {
                        name: { [Op.iLike]: `%${msg.text}%` }
                    },
                    limit: 5
                });

                if (products.length === 0) {
                    return bot.sendMessage(chatId, '❌ Товарів не знайдено. Спробуйте іншу назву або натисніть "Скасувати":');
                }

                const buttons = products.map(p => ([{
                    text: `${p.name} (${p.price} грн)`,
                    callback_data: `calc_prod_${p.id}`
                }]));

                await bot.sendMessage(chatId, 'Оберіть товар:', {
                    reply_markup: { inline_keyboard: buttons }
                });
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

                const item = {
                    name: p.name,
                    price: p.price, // Base price per m2
                    quantity: packsNeeded,
                    unit: 'уп.',
                    sku: p.sku,
                    packSize: packSize,
                    total: totalPrice
                };

                state.items = state.items || [];
                state.items.push(item);
                state.totalAmount = (state.totalAmount || 0) + totalPrice;
                state.step = 'awaiting_next_action';

                await bot.sendMessage(chatId, '🛒 <b>Товар додано до списку.</b>\nБажаєте додати ще щось чи сформувати рахунок?', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '➕ Додати ще товар', callback_data: 'add_more' }],
                            [{ text: '📄 Оформити рахунок', callback_data: 'invoice_confirm' }],
                            [{ text: '❌ Скасувати все', callback_data: 'invoice_cancel' }]
                        ]
                    }
                });
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
                        await bot.sendMessage(chatId, `❌ Помилка: Максимальна ширина для этого товара ${max} мм.`);
                    } else {
                        await bot.sendMessage(chatId, '❌ Помилка: Нестандартний розмір. Зверніться до менеджера.');
                    }
                    await bot.sendMessage(chatId, 'Повернутися до головного меню:', mainMenu);
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

                const item = {
                    name: `${p.name} (${width}x${length}мм)`,
                    price: totalPrice,
                    quantity: 1,
                    unit: 'шт',
                    sku: p.sku,
                    packSize: 1,
                    total: totalPrice
                };

                state.items = state.items || [];
                state.items.push(item);
                state.totalAmount = (state.totalAmount || 0) + totalPrice;
                state.step = 'awaiting_next_action';

                await bot.sendMessage(chatId, '🛒 <b>Товар додано до списку.</b>\nБажаєте додати ще щось чи сформувати рахунок?', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '➕ Додати ще товар', callback_data: 'add_more' }],
                            [{ text: '📄 Оформити рахунок', callback_data: 'invoice_confirm' }],
                            [{ text: '❌ Скасувати все', callback_data: 'invoice_cancel' }]
                        ]
                    }
                });
            } else if (state.step === 'awaiting_discount_value') {
                const discount = parseFloat(msg.text.replace(',', '.'));
                if (isNaN(discount) || discount < 0 || discount > 100) {
                    return bot.sendMessage(chatId, '❌ Введіть коректне число від 0 до 100:');
                }
                state.discount = discount;
                state.totalAmount = state.totalAmount * (1 - discount / 100);
                state.step = 'awaiting_customer_name';

                const opts = { parse_mode: 'HTML' };
                if (state.orderId) {
                    opts.reply_markup = {
                        inline_keyboard: [[{ text: `✅ Залишити: ${state.customerName}`, callback_data: 'keep_existing_name' }]]
                    };
                }
                await bot.sendMessage(chatId, `✅ Знижка ${discount}% додана.\n👤 Тепер введіть <b>ПІБ</b> покупця:`, opts);
            } else if (state.step === 'awaiting_customer_name') {
                state.customerName = msg.text;
                state.step = 'awaiting_customer_phone';

                const opts = { parse_mode: 'HTML' };
                if (state.orderId) {
                    opts.reply_markup = {
                        inline_keyboard: [[{ text: `✅ Залишити: ${state.customerPhone}`, callback_data: 'keep_existing_phone' }]]
                    };
                }
                await bot.sendMessage(chatId, `👤 Клієнт: <b>${state.customerName}</b>\n📱 Тепер введіть <b>номер телефону</b> клієнта:`, opts);
            } else if (state.step === 'awaiting_customer_phone') {
                state.customerPhone = normalizeUaPhone(msg.text);
                await bot.sendMessage(chatId, '⏳ Генерую замовлення та рахунок...');

                try {
                    let order;
                    if (state.orderId) {
                        order = await Order.findByPk(state.orderId);
                        await order.update({
                            customerName: state.customerName,
                            customerPhone: state.customerPhone,
                            totalAmount: state.totalAmount,
                            discount: state.discount || 0,
                            items: state.items
                        });
                    } else {
                        // 1. Generate order number
                        const now = new Date();
                        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const countToday = await Order.count({
                            where: { createdAt: { [Op.gte]: startOfDay } }
                        });
                        const day = String(now.getDate()).padStart(2, '0');
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const year = now.getFullYear();
                        const orderNumber = `${countToday + 1}/${day}/${month}/${year}`;

                        // 2. Create Order in DB
                        order = await Order.create({
                            orderNumber,
                            customerName: state.customerName,
                            customerPhone: state.customerPhone,
                            address: 'Самовивіз (Магазин)',
                            deliveryMethod: 'pickup',
                            paymentMethod: 'invoice',
                            totalAmount: state.totalAmount,
                            discount: state.discount || 0,
                            items: state.items
                        });
                    }

                    // 3. Generate and send PDF
                    const pdfBuffer = await generateInvoice(order);
                    const fileName = `Invoice_${order.orderNumber.replace(/\//g, '_')}.pdf`;

                    await bot.sendDocument(chatId, pdfBuffer, {
                        caption: `✅ Рахунок №${order.orderNumber} сформовано!`
                    }, {
                        filename: fileName,
                        contentType: 'application/pdf'
                    });

                    await bot.sendMessage(chatId, 'Повернутися до головного меню:', mainMenu);
                    delete userState[chatId];

                } catch (error) {
                    console.error('Error creating invoice from calc:', error);
                    bot.sendMessage(chatId, `❌ Помилка при створенні рахунку: ${error.message}`);
                }
            }
        }
    });

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

        if (data.startsWith('edit_order_')) {
            const orderId = data.replace('edit_order_', '');
            try {
                const order = await Order.findByPk(orderId);
                if (!order) return bot.sendMessage(chatId, 'Помилка: Замовлення не знайдено.');

                userState[chatId] = {
                    step: 'awaiting_next_action',
                    items: order.items,
                    totalAmount: parseFloat(order.totalAmount),
                    customerName: order.customerName,
                    customerPhone: order.customerPhone,
                    orderId: order.id,
                    orderNumber: order.orderNumber
                };

                await bot.answerCallbackQuery(callbackQuery.id);

                let itemsList = order.items.map((it, i) => `${i + 1}. ${it.name} x ${it.quantity}`).join('\n');

                await bot.sendMessage(chatId, `✏️ <b>Редагування замовлення №${order.orderNumber}</b>\n\nПоточні товари:\n${itemsList}\n\nЩо бажаєте зробити?`, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '➕ Додати ще товар', callback_data: 'add_more' }],
                            [{ text: '📄 Оформити рахунок', callback_data: 'invoice_confirm' }],
                            [{ text: '❌ Скасувати', callback_data: 'invoice_cancel' }]
                        ]
                    }
                });
            } catch (error) {
                console.error('Error in edit_order:', error);
                bot.sendMessage(chatId, 'Сталася помилка при завантаженні замовлення.');
            }
        }

        if (data.startsWith('calc_prod_')) {
            const productId = data.replace('calc_prod_', '');
            const product = await Product.findByPk(productId);

            if (product) {
                const cancelKeyboard = {
                    reply_markup: {
                        keyboard: [[{ text: '❌ Скасувати розрахунок' }]],
                        resize_keyboard: true
                    }
                };

                if (product.priceMatrix && product.priceMatrix.length > 0) {
                    const state = userState[chatId];
                    userState[chatId] = { ...state, step: 'awaiting_sill_width', product };
                    await bot.sendMessage(chatId, `🪟 Вибрано підвіконня: <b>${product.name}</b>\n\nВведіть <b>ширину</b> підвіконня в мм (напр. 200):`, { parse_mode: 'HTML', ...cancelKeyboard });
                } else {
                    const state = userState[chatId];
                    userState[chatId] = { ...state, step: 'awaiting_qty', product };
                    await bot.sendMessage(chatId, `🔢 Вибрано: <b>${product.name}</b>\nЦіна: ${product.price} грн/${product.unit}\nУпаковка: ${product.packSize} ${product.unit}\n\nВведіть необхідну кількість у <b>${product.unit}</b>:`, { parse_mode: 'HTML', ...cancelKeyboard });
                }
            }
        }

        if (data === 'add_more') {
            const state = userState[chatId];
            if (state) {
                state.step = 'awaiting_search';
                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.sendMessage(chatId, '🔍 Введіть назву наступного товару для пошуку:');
            }
        }

        if (data === 'invoice_confirm') {
            const state = userState[chatId];
            if (state && (state.step === 'awaiting_invoice_confirm' || state.step === 'awaiting_next_action')) {
                state.step = 'awaiting_discount_confirm';
                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.sendMessage(chatId, '🏷️ <b>Бажаєте додати знижку?</b>', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ Так', callback_data: 'discount_confirm' }, { text: '❌ Ні', callback_data: 'discount_skip' }]
                        ]
                    }
                });
            }
        }

        if (data === 'discount_confirm') {
            const state = userState[chatId];
            if (state && state.step === 'awaiting_discount_confirm') {
                state.step = 'awaiting_discount_value';
                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.sendMessage(chatId, '📉 Введіть значення знижки у <b>%</b> (напр. 5):', { parse_mode: 'HTML' });
            }
        }

        if (data === 'discount_skip') {
            const state = userState[chatId];
            if (state && state.step === 'awaiting_discount_confirm') {
                state.discount = 0;
                state.step = 'awaiting_customer_name';
                await bot.answerCallbackQuery(callbackQuery.id);

                const opts = { parse_mode: 'HTML' };
                if (state.orderId) {
                    opts.reply_markup = {
                        inline_keyboard: [[{ text: `✅ Залишити: ${state.customerName}`, callback_data: 'keep_existing_name' }]]
                    };
                }
                await bot.sendMessage(chatId, '👤 Введіть <b>ПІБ</b> покупця:', opts);
            }
        }

        if (data === 'keep_existing_name') {
            const state = userState[chatId];
            if (state && state.step === 'awaiting_customer_name') {
                state.step = 'awaiting_customer_phone';
                await bot.answerCallbackQuery(callbackQuery.id);

                const opts = { parse_mode: 'HTML' };
                if (state.orderId) {
                    opts.reply_markup = {
                        inline_keyboard: [[{ text: `✅ Залишити: ${state.customerPhone}`, callback_data: 'keep_existing_phone' }]]
                    };
                }
                await bot.sendMessage(chatId, `👤 Клієнт: <b>${state.customerName}</b>\n📱 Тепер введіть <b>номер телефону</b> клієнта:`, opts);
            }
        }

        if (data === 'keep_existing_phone') {
            const state = userState[chatId];
            if (state && state.step === 'awaiting_customer_phone') {
                await bot.answerCallbackQuery(callbackQuery.id);
                // Trigger the finalization logic by sending a dummy message or calling the handler
                // For simplicity, let's just send a message and the user can press it or we can call the logic.
                // Better: simulate a message receive or just run the logic.
                // Since we are in callback_query, we can't easily "jump" to the message handler logic without refactoring.
                // Let's just send a message "Confirming..." and then run the logic.

                await bot.sendMessage(chatId, '⏳ Оновлюю замовлення та генерую рахунок...');

                try {
                    const order = await Order.findByPk(state.orderId);
                    await order.update({
                        customerName: state.customerName,
                        customerPhone: state.customerPhone,
                        totalAmount: state.totalAmount,
                        discount: state.discount || 0,
                        items: state.items
                    });

                    const pdfBuffer = await generateInvoice(order);
                    const fileName = `Invoice_${order.orderNumber.replace(/\//g, '_')}.pdf`;

                    await bot.sendDocument(chatId, pdfBuffer, {
                        caption: `✅ Рахунок №${order.orderNumber} оновлено!`
                    }, {
                        filename: fileName,
                        contentType: 'application/pdf'
                    });

                    await bot.sendMessage(chatId, 'Повернутися до головного меню:', mainMenu);
                    delete userState[chatId];
                } catch (error) {
                    console.error('Error updating order from keep_existing_phone:', error);
                    bot.sendMessage(chatId, `❌ Помилка при оновленні рахунку: ${error.message}`);
                }
            }
        }

        if (data === 'invoice_cancel') {
            delete userState[chatId];
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Скасовано' });
            await bot.sendMessage(chatId, 'Добре, розрахунок завершено.', mainMenu);
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
