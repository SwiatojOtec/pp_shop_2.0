const { Op } = require('sequelize');
const Product = require('../models/Product');
const InventoryItem = require('../models/InventoryItem');
const User = require('../models/User');
const WarehouseEvent = require('../models/WarehouseEvent');
const { getAllDealRows } = require('../modules/orders-rental/services/orderService');
const { toIsoDate } = require('../modules/orders-rental/services/rentalApplicationService');
const { hasShopAccess, hasRentAccess } = require('../utils/roles');

const NON_TURNOVER_STATUSES = ['cancelled'];
const PAID_OR_LATER_STATUSES = ['paid', 'issued', 'returned', 'done'];
const NEW_INVOICE_THRESHOLD_DAYS = 3;

function startOfMonth(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysAgoIso(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return toIsoDate(d);
}

function pluralDeals(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'угода';
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'угоди';
    return 'угод';
}

/**
 * Робочий стіл (docs/admin-redesign/03-screens.md, 9.1): список того, що
 * потребує дії, замість вітрини цифр — один ендпоінт з готовими рядками й
 * числами, з урахуванням ролі. Дані переважно з getAllDealRows() — той самий
 * розрахунок isOverdue/rentTo/rentFrom, що й «Угоди» та картка клієнта.
 */
async function buildDashboard(user) {
    const role = user?.role;
    const isOwner = role === 'owner';
    const canShop = hasShopAccess(role);
    const canRent = hasRentAccess(role);
    const todayIso = toIsoDate();

    const rows = [];
    const deals = await getAllDealRows();

    if (canRent) {
        // Оренда прострочена — окремий рядок на кожну угоду, веде прямо туди,
        // де вирішується (не на загальний список).
        const overdue = deals
            .filter((d) => d.isOverdue && (d.type === 'rent' || d.type === 'both'))
            .sort((a, b) => (a.rentTo || '').localeCompare(b.rentTo || ''));
        for (const d of overdue) {
            rows.push({
                tone: 'danger',
                title: 'Оренда прострочена',
                detail: `${d.number} · ${d.customerName || '—'} · до ${d.rentTo}`,
                to: d.kind === 'application' ? `/admin/rental-applications/${d.id}` : `/admin/deals/${d.id}`,
                date: d.rentTo,
            });
        }

        // Повертаються сьогодні — аґрегат, веде на фільтрований список.
        const dueToday = deals.filter((d) => !d.isOverdue && d.rentTo === todayIso && (d.type === 'rent' || d.type === 'both'));
        if (dueToday.length) {
            rows.push({
                tone: 'warning',
                title: 'Повертаються сьогодні',
                detail: `${dueToday.length} ${pluralDeals(dueToday.length)}`,
                to: '/admin/deals?due=today',
                date: todayIso,
            });
        }
    }

    if (isOwner) {
        // Запит на видалення складу — той самий журнал, що й на Склад → Склади.
        const pendingDeleteRequests = await WarehouseEvent.count({ where: { action: 'warehouse_delete_request' } });
        if (pendingDeleteRequests > 0) {
            rows.push({
                tone: 'warning',
                title: 'Запит на видалення складу',
                detail: `${pendingDeleteRequests} ${pendingDeleteRequests === 1 ? 'запит' : 'запитів'} чекають рішення`,
                to: '/admin/stock/warehouses',
                date: todayIso,
            });
        }

        // Нові користувачі — тільки owner бачить і може діяти (Компанія — owner-only).
        const pendingUsers = await User.count({ where: { status: 'pending' } });
        if (pendingUsers > 0) {
            rows.push({
                tone: 'info',
                title: 'Нові користувачі',
                detail: `${pendingUsers} ${pendingUsers === 1 ? 'чекає' : 'чекають'} підтвердження`,
                to: '/admin/company/users',
                date: todayIso,
            });
        }
    }

    if (canRent) {
        // Мало вільних — вільно ≤ мін. залишок позиції (мін. залишок редагується
        // на Склад → Залишки → панель позиції).
        const [rentProducts, items] = await Promise.all([
            Product.findAll({
                where: { isRent: true },
                attributes: ['id', 'name', 'quantityAvailable'],
            }),
            InventoryItem.findAll({ attributes: ['productId', 'minStock'] }),
        ]);
        const minStockByProduct = new Map();
        for (const it of items) {
            const cur = minStockByProduct.get(it.productId) || 0;
            minStockByProduct.set(it.productId, Math.max(cur, it.minStock || 0));
        }
        const lowStock = rentProducts.filter((p) => {
            const min = minStockByProduct.get(p.id) || 0;
            return min > 0 && Number(p.quantityAvailable ?? 0) <= min;
        });
        if (lowStock.length) {
            rows.push({
                tone: 'warning',
                title: 'Мало вільних',
                detail: `${lowStock.length} ${lowStock.length === 1 ? 'позиція' : 'позицій'} на межі мінімального залишку`,
                to: '/admin/stock?status=low',
                date: todayIso,
            });
        }

        // Картки без головного фото — тільки інструмент (Каталог → Інструмент).
        const noPhoto = await Product.count({ where: { isRent: true, [Op.or]: [{ image: null }, { image: '' }] } });
        if (noPhoto > 0) {
            rows.push({
                tone: 'neutral',
                title: 'Картки без головного фото',
                detail: `${noPhoto} ${noPhoto === 1 ? 'картка' : 'карток'} без зображення`,
                to: '/admin/catalog/tools',
                date: todayIso,
            });
        }
    }

    if (canShop || canRent) {
        // Угода без рахунку — статус new понад 3 доби; тип рядка фільтрується під
        // роль так само, як решта Робочого столу.
        const threshold = daysAgoIso(NEW_INVOICE_THRESHOLD_DAYS);
        const staleNew = deals
            .filter((d) => d.kind === 'order' && d.status === 'new' && toIsoDate(new Date(d.createdAt)) <= threshold)
            .filter((d) => {
                if (canShop && canRent) return true;
                if (canRent) return d.type === 'rent' || d.type === 'both';
                return d.type === 'shop' || d.type === 'both';
            })
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        for (const d of staleNew) {
            rows.push({
                tone: 'info',
                title: 'Угода без рахунку',
                detail: `${d.number} · ${d.customerName || '—'} · від ${toIsoDate(new Date(d.createdAt))}`,
                to: `/admin/deals/${d.id}`,
                date: toIsoDate(new Date(d.createdAt)),
            });
        }
    }

    // Порядок: критичні → попередження → інформаційні → нейтральні; усередині
    // групи — за датою.
    const toneOrder = { danger: 0, warning: 1, info: 2, neutral: 3 };
    rows.sort((a, b) => {
        const t = toneOrder[a.tone] - toneOrder[b.tone];
        if (t !== 0) return t;
        return (a.date || '').localeCompare(b.date || '');
    });

    const result = { attention: rows, today: null, shop: null };

    if (canRent) {
        const rentDeals = deals.filter((d) => d.kind === 'order' && (d.type === 'rent' || d.type === 'both'));
        const issued = rentDeals.filter((d) => d.status === 'issued');
        result.today = {
            date: todayIso,
            toIssue: rentDeals.filter((d) => d.rentFrom === todayIso && ['new', 'invoice', 'paid'].includes(d.status)).length,
            toReturn: issued.filter((d) => d.rentTo === todayIso).length,
            activeRentals: issued.length,
        };
    }

    if (canShop) {
        const monthStart = startOfMonth();
        const shopDeals = deals.filter((d) => {
            if (d.kind !== 'order') return false;
            if (d.type !== 'shop' && d.type !== 'both') return false;
            return new Date(d.createdAt) >= monthStart;
        });
        const turnover = shopDeals.filter((d) => !NON_TURNOVER_STATUSES.includes(d.status));
        result.shop = {
            month: monthStart.toISOString(),
            orders: turnover.length,
            paid: turnover.filter((d) => PAID_OR_LATER_STATUSES.includes(d.status)).length,
        };
    }

    return result;
}

module.exports = { buildDashboard };
