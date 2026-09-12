const Order = require('../models/Order');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Client = require('../models/Client');
const Seller = require('../models/Seller');
const { getAllDealRows } = require('../modules/orders-rental/services/orderService');
const { resolveLineNetTotal, roundMoney, parseDiscountPercent } = require('../utils/orderAmounts');

/** Угода вважається «оплаченою» (реальні гроші отримано) з цього статусу і
 *  далі — той самий поріг, що й «Робочий стіл» (server/services/
 *  dashboardService.js, PAID_OR_LATER_STATUSES). Тримати синхронізовано. */
const REVENUE_STATUSES = ['paid', 'issued', 'returned', 'done'];

const ALL_STATUSES = ['new', 'invoice', 'paid', 'issued', 'returned', 'done', 'cancelled'];

/**
 * Податкове навантаження для «реального прибутку» (за словами власника):
 * — ФОП на єдиному податку — 5% від усієї отриманої виручки (це і є вся
 *   сума, яку заплатив клієнт: ФОП тут не рахує ПДВ).
 * — ТОВ — на угоду зверху накладається ~22%, і саме з цією надбавкою
 *   виставляється рахунок клієнту (100 грн товару → 122 грн у рахунку).
 *   item.price в цій системі завжди БЕЗ цієї надбавки (рахується лише на
 *   рівні угоди при виставленні документів, server/utils/orderAmounts.js) —
 *   тобто «виручка» в аналітиці й так вже виключає цю надбавку, і додаткове
 *   віднімання зробило б подвійний облік. Тому для ТОВ додаткового податку
 *   в прибутку не віднімаємо (надбавка — не наш дохід, а транзитоміде
 *   державі), а для ФОП — віднімаємо 5% від виручки як реальний податок.
 */
const FOP_TAX_PERCENT = 5;

function dayMs() { return 86400000; }

/** Проста агрегація за день/тиждень/місяць — вибір гранулярності залежить
 *  від довжини періоду, щоб графік не перетворювався на «шум» з 365 точок. */
function pickGranularity(fromDate, toDate) {
    const days = Math.max(1, Math.round((toDate - fromDate) / dayMs()) + 1);
    if (days <= 45) return 'day';
    if (days <= 210) return 'week';
    return 'month';
}

function startOfWeek(d) {
    const copy = new Date(d);
    const day = (copy.getDay() + 6) % 7; // 0 = понеділок
    copy.setDate(copy.getDate() - day);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function bucketKey(date, granularity) {
    const d = new Date(date);
    if (granularity === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (granularity === 'week') {
        const s = startOfWeek(d);
        return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Усі ключі бакетів між from/to включно, щоб графік не «пропускав» порожні
 *  періоди (наприклад, тиждень без жодної угоди). */
function allBucketKeys(fromDate, toDate, granularity) {
    const keys = [];
    const seen = new Set();
    let cursor = new Date(fromDate);
    const step = granularity === 'month' ? 1 : granularity === 'week' ? 7 : 1;
    while (cursor <= toDate) {
        const key = bucketKey(cursor, granularity);
        if (!seen.has(key)) {
            seen.add(key);
            keys.push(key);
        }
        if (granularity === 'month') {
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + step, 1);
        } else {
            cursor = new Date(cursor.getTime() + step * dayMs());
        }
    }
    return keys;
}

function sortEntriesByRevenueDesc(map) {
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

/**
 * Собівартість одиниці товару (для прибутку по неорендних позиціях):
 * 1) якщо вручну вказана Product.supplierPrice — використовуємо її напряму
 *    (найточніше джерело, коли воно є);
 * 2) інакше, якщо товар привʼязаний до постачальника зі знижкою — власник
 *    веде облік так: ціна товару в каталозі ≈ прайс постачальника без
 *    знижки, а знижка постачальника (%) і є нашою маржею. Тобто
 *    собівартість = ціна_товару × (1 − знижка% / 100). Це саме ті «гроші, з
 *    якими ми працюємо» — знижка постачальника застосовується до нашої
 *    відпускної ціни, а не до якоїсь третьої величини;
 * 3) інакше собівартість невідома — прибуток по цій позиції не рахуємо
 *    (показуємо «—», а не фальшивий нуль).
 */
function resolveUnitCost(product, unitPrice, supplierById) {
    if (!product) return null;
    if (product.supplierPrice != null) return Number(product.supplierPrice) || 0;
    if (product.supplierId) {
        const supplier = supplierById.get(product.supplierId);
        const discountPct = supplier?.discountPercent != null ? Number(supplier.discountPercent) : null;
        if (discountPct != null) return roundMoney(unitPrice * (1 - discountPct / 100));
    }
    return null;
}

/**
 * Аналітика (docs — вкладка «Аналітика»): виручка/прибуток/топи рахуються тут
 * з тих самих даних, що й решта адмінки — getAllDealRows() (Угоди, Робочий
 * стіл) для складу й типу угоди, resolveLineNetTotal (server/utils/
 * orderAmounts.js) для суми рядка без ПДВ/надбавки (item.price завжди «наша»
 * ціна без ПДВ — надбавка ТОВ рахується лише на рівні угоди при виставленні
 * документів, тож усі суми тут вже на порівнюваній із собівартістю основі).
 *
 * Знижку, яку МИ даємо клієнту (Order.discount), застосовано до виручки, але
 * НЕ до собівартості — собівартість не залежить від того, скільки ми
 * поступилися клієнту.
 *
 * Оренда: інструмент — капітальні витрати, вже сплачені один раз, тому
 * собівартість одного дня оренди вважаємо нульовою (не «невідомою») —
 * прибуток з оренди = виручка мінус податок.
 *
 * `productId` (опційно) — звузити всю агрегацію до одного товару (для
 * пошуку «аналітика по товару»); решта полів (byCategory/byBrand/…)
 * природно схлопуються до одного рядка, topClients лишається змістовним
 * («хто купував саме цей товар»).
 *
 * `sellerFilter` (опційно) — за юрособою, від імені якої йде угода:
 * `'fop'` — усі ФОП разом, `'tov'` — усі ТОВ разом (зараз лише одна, але
 * рахуємо за типом, а не за конкретним id, щоб не ламати фільтр, якщо
 * з'явиться друга), конкретний `Seller.id` — лише ця юрособа. Відсутній/
 * `'all'` — без фільтра.
 */
async function buildAnalytics({ fromDate, toDate, productId = null, sellerFilter = null }) {
    const granularity = pickGranularity(fromDate, toDate);

    const [dealRows, orders, sellers, products, suppliers, clients] = await Promise.all([
        getAllDealRows(),
        Order.findAll({ attributes: ['id', 'discount', 'sellerId'] }),
        Seller.findAll({ attributes: ['id', 'type'] }),
        Product.findAll({ attributes: ['id', 'name', 'category', 'brand', 'supplierId', 'supplierPrice', 'isRent', 'quantityAvailable'] }),
        Supplier.findAll({ attributes: ['id', 'name', 'discountPercent'] }),
        Client.findAll({ attributes: ['id', 'fullName'] }),
    ]);

    const discountByOrderId = new Map(orders.map((o) => [o.id, parseDiscountPercent(o.discount)]));
    const orderSellerIdById = new Map(orders.map((o) => [o.id, o.sellerId]));
    const sellerTypeByOrderId = new Map();
    const sellerTypeById = new Map(sellers.map((s) => [s.id, s.type]));
    for (const o of orders) sellerTypeByOrderId.set(o.id, sellerTypeById.get(o.sellerId) || 'fop');
    const productById = new Map(products.map((p) => [p.id, p]));
    const supplierById = new Map(suppliers.map((s) => [s.id, s]));
    const clientById = new Map(clients.map((c) => [c.id, c]));

    const inRange = (createdAt) => {
        const d = new Date(createdAt);
        return d >= fromDate && d <= toDate;
    };

    const matchesSellerFilter = (row) => {
        if (!sellerFilter || sellerFilter === 'all') return true;
        if (sellerFilter === 'fop' || sellerFilter === 'tov') {
            return sellerTypeByOrderId.get(row.id) === sellerFilter;
        }
        return orderSellerIdById.get(row.id) === sellerFilter;
    };

    const allOrderRows = dealRows.filter((r) => r.kind === 'order' && inRange(r.createdAt) && matchesSellerFilter(r));
    const revenueRows = allOrderRows.filter((r) => REVENUE_STATUSES.includes(r.status));

    // ── Воронка угод: усі статуси, включно зі скасованими/непідтвердженими.
    // У режимі «по товару» — лише угоди, де цей товар справді був у списку
    // позицій (незалежно від статусу — навіть скасовану чи ще неоплачену
    // угоду з цим товаром показуємо, це частина воронки саме по ньому). ──
    const rowsForFunnel = productId
        ? allOrderRows.filter((r) => (r.items || []).some((item) => Number(item.id) === productId))
        : allOrderRows;
    const funnelCounts = new Map(ALL_STATUSES.map((s) => [s, 0]));
    for (const row of rowsForFunnel) {
        funnelCounts.set(row.status, (funnelCounts.get(row.status) || 0) + 1);
    }

    // ── Ряд виручки в часі + розбивка магазин/оренда ──
    const seriesMap = new Map(
        allBucketKeys(fromDate, toDate, granularity).map((k) => [k, { bucket: k, shop: 0, rent: 0, profit: 0, total: 0 }])
    );

    const byCategory = new Map();
    const byBrand = new Map();
    const byProduct = new Map();
    const byClient = new Map();
    const bySupplier = new Map();

    let shopRevenue = 0;
    let rentRevenue = 0;
    let knownRevenue = 0; // виручка по рядках, де прибуток порахований (не «—»)
    let totalCost = 0;
    let totalTax = 0;
    let totalProfit = 0;
    let matchedOrdersCount = 0; // скільки угод у вибірці містили цей товар (лише для productId-фільтра)

    function bump(map, key, init, revenue, qty, profit, costKnown) {
        if (!map.has(key)) map.set(key, { ...init, revenue: 0, qty: 0, profit: 0, costKnown: false });
        const entry = map.get(key);
        entry.revenue = roundMoney(entry.revenue + revenue);
        entry.qty += qty;
        if (costKnown) {
            entry.profit = roundMoney(entry.profit + profit);
            entry.costKnown = true;
        }
    }

    for (const row of revenueRows) {
        const discountPct = discountByOrderId.get(row.id) || 0;
        const isFop = sellerTypeByOrderId.get(row.id) !== 'tov';
        const bucket = seriesMap.get(bucketKey(row.createdAt, granularity));
        const clientKey = row.clientId ? `c${row.clientId}` : `guest:${row.customerName || ''}:${row.customerPhone || ''}`;
        const clientLabel = (row.clientId && clientById.get(row.clientId)?.fullName) || row.customerName || 'Без імені';
        let clientEntryTouched = false;

        for (const item of row.items || []) {
            if (productId && Number(item.id) !== productId) continue;

            const netLine = resolveLineNetTotal(item, null, new Map());
            const revenue = roundMoney(netLine * (1 - discountPct / 100));
            if (revenue <= 0) continue;

            if (!clientEntryTouched) {
                if (!byClient.has(clientKey)) byClient.set(clientKey, { clientId: row.clientId || null, name: clientLabel, revenue: 0, orders: 0, profit: 0, costKnown: false });
                byClient.get(clientKey).orders += 1;
                clientEntryTouched = true;
                matchedOrdersCount += 1;
            }

            const qty = Number(item.quantity) || 0;
            const product = productById.get(Number(item.id));
            const isRentLine = !!item.isRent;
            const unitPrice = Number(item.price) || 0;
            const packSize = Number(item.packSize) || 1;

            const tax = isFop ? roundMoney(revenue * (FOP_TAX_PERCENT / 100)) : 0;
            totalTax = roundMoney(totalTax + tax);

            let lineCost = 0;
            let costKnown = true;
            if (!isRentLine) {
                const unitCost = resolveUnitCost(product, unitPrice, supplierById);
                if (unitCost == null) {
                    costKnown = false;
                } else {
                    lineCost = roundMoney(unitCost * qty * packSize);
                }
            }
            const lineProfit = costKnown ? roundMoney(revenue - lineCost - tax) : null;

            if (bucket) {
                if (isRentLine) bucket.rent = roundMoney(bucket.rent + revenue);
                else bucket.shop = roundMoney(bucket.shop + revenue);
                bucket.total = roundMoney(bucket.total + revenue);
                if (lineProfit != null) bucket.profit = roundMoney(bucket.profit + lineProfit);
            }
            const clientEntry = byClient.get(clientKey);
            clientEntry.revenue = roundMoney(clientEntry.revenue + revenue);
            if (costKnown) {
                clientEntry.profit = roundMoney(clientEntry.profit + lineProfit);
                clientEntry.costKnown = true;
            }

            if (isRentLine) rentRevenue = roundMoney(rentRevenue + revenue);
            else shopRevenue = roundMoney(shopRevenue + revenue);

            if (costKnown) {
                knownRevenue = roundMoney(knownRevenue + revenue);
                totalCost = roundMoney(totalCost + lineCost);
                totalProfit = roundMoney(totalProfit + lineProfit);
            }

            const categoryLabel = product?.category || item.category || (isRentLine ? 'Оренда' : 'Інше');
            const brandLabel = product?.brand || '—';
            const pId = product?.id ?? item.id ?? null;
            const productName = product?.name || item.name || 'Видалений товар';

            bump(byCategory, categoryLabel, { category: categoryLabel }, revenue, qty, lineProfit, costKnown);
            bump(byBrand, brandLabel, { brand: brandLabel }, revenue, qty, lineProfit, costKnown);
            bump(byProduct, pId ?? productName, { productId: pId, name: productName }, revenue, qty, lineProfit, costKnown);

            if (!isRentLine) {
                const supplierId = product?.supplierId || null;
                const supplierLabel = supplierId ? (supplierById.get(supplierId)?.name || 'Постачальник видалений') : 'Без постачальника';
                bump(bySupplier, supplierId || 'none', { supplierId, name: supplierLabel }, revenue, qty, lineProfit, costKnown);
            }
        }
    }

    const netRevenue = roundMoney(shopRevenue + rentRevenue);
    const dealsCount = allOrderRows.length;
    const paidDealsCount = revenueRows.length;

    // ── Оренда: скільки різних позицій інструменту зараз «на руках» (не
    // залежить від обраного періоду — це миттєвий знімок парку). Рахуємо
    // кількість РІЗНИХ товарів, а не суму quantityAvailable — серед орендних
    // товарів трапляються службові рядки (напр. «Доставка») з фейковим
    // quantityAvailable у тисячі одиниць, які зробили б суму безглуздою. ──
    const rentableProductCount = products.filter((p) => p.isRent).length;
    const currentlyIssued = dealRows.filter((r) => r.kind === 'order' && r.status === 'issued' && (r.type === 'rent' || r.type === 'both'));
    const issuedProductIds = new Set();
    for (const row of currentlyIssued) {
        for (const item of row.items || []) {
            if (item.isRent) issuedProductIds.add(item.id);
        }
    }
    const productsCurrentlyOut = issuedProductIds.size;

    return {
        range: { granularity },
        kpis: {
            netRevenue,
            shopRevenue: roundMoney(shopRevenue),
            rentRevenue: roundMoney(rentRevenue),
            dealsCount,
            paidDealsCount,
            avgOrderValue: paidDealsCount ? roundMoney(netRevenue / paidDealsCount) : 0,
            cost: totalCost,
            tax: totalTax,
            profit: totalProfit,
            marginPercent: knownRevenue > 0 ? roundMoney((totalProfit / knownRevenue) * 100) : null,
            costCoveragePercent: netRevenue > 0 ? roundMoney((knownRevenue / netRevenue) * 100) : null,
            productsCurrentlyOut,
            rentableProductCount,
            matchedOrdersCount,
        },
        revenueSeries: [...seriesMap.values()],
        statusFunnel: ALL_STATUSES.map((status) => ({ status, count: funnelCounts.get(status) || 0 })),
        byCategory: sortEntriesByRevenueDesc(byCategory),
        byBrand: sortEntriesByRevenueDesc(byBrand),
        topProducts: sortEntriesByRevenueDesc(byProduct).slice(0, productId ? undefined : 10),
        topClients: sortEntriesByRevenueDesc(byClient).slice(0, 10),
        bySupplier: sortEntriesByRevenueDesc(bySupplier),
    };
}

module.exports = { buildAnalytics, REVENUE_STATUSES, FOP_TAX_PERCENT };
