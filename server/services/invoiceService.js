const PDFDocument = require('pdfkit-table');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const RentalApplication = require('../models/RentalApplication');
const { numberToWordsUA } = require('../utils/numberToWordsUA');
const { getSeller, formatSupplierBlock } = require('../constants/sellers');
const {
    calcOrderAmounts,
    calcDepositInvoiceAmounts,
    buildDepositInvoiceRows,
    calcLineDisplayAmounts,
    sellerAppliesVat,
    roundMoney,
} = require('../utils/orderAmounts');

const RENT_INVOICE_NAME_PREFIX = 'Надання в оренду будiвельних машин i устатковання. ';
const DEPOSIT_INVOICE_NAME_PREFIX = 'Застава за оренду обладнання. ';

async function getRentProductIds(items) {
    const ids = [...new Set((items || []).map((item) => item.id).filter(Boolean))];
    if (!ids.length) return new Set();

    const products = await Product.findAll({
        where: { id: ids, isRent: true },
        attributes: ['id'],
    });
    return new Set(products.map((p) => p.id));
}

function isRentInvoiceItem(item, rentProductIds) {
    if (item?.isRent) return true;
    return rentProductIds.has(item?.id);
}

function formatInvoiceItemName(item, rentProductIds) {
    const name = String(item?.name || '').trim();
    if (!name) return name;
    if (!isRentInvoiceItem(item, rentProductIds)) return name;
    if (name.startsWith(RENT_INVOICE_NAME_PREFIX)) return name;
    return `${RENT_INVOICE_NAME_PREFIX}${name}`;
}

function formatDepositInvoiceItemName(item) {
    const name = String(item?.name || '').trim();
    if (!name) return name;
    if (name.startsWith(DEPOSIT_INVOICE_NAME_PREFIX)) return name;
    return `${DEPOSIT_INVOICE_NAME_PREFIX}${name}`;
}

async function loadRentalApplication(order) {
    if (!order?.rentalApplicationId) return null;
    return RentalApplication.findByPk(order.rentalApplicationId);
}

function renderInvoicePdf({
    order,
    seller,
    amounts,
    tableDatas,
    title,
    discountPercent = 0,
}) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const fontPath = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
            const fontBoldPath = path.join(__dirname, '../fonts/Roboto-Bold.ttf');

            if (fs.existsSync(fontPath)) {
                doc.font(fontPath);
            }

            doc.fontSize(8).rect(30, 30, 535, 40).stroke();
            doc.text('Увага! Оплата даного рахунку означає згоду з умовами постачання товару. Повідомлення про оплату обов\'язково, у противному випадку не гарантується наявність товару на складі. Товар відпускається по факту приходу грошей на п/р Постачальника, самовивозом, при наявності доручення і паспорта.', 35, 35, { width: 525, align: 'center' });

            doc.moveDown(2);
            const tableTop = 85;
            doc.fontSize(9);
            doc.rect(30, tableTop, 535, 80).stroke();

            doc.moveTo(180, tableTop).lineTo(180, tableTop + 80).stroke();
            doc.moveTo(380, tableTop).lineTo(380, tableTop + 40).stroke();
            doc.moveTo(180, tableTop + 40).lineTo(565, tableTop + 40).stroke();
            doc.moveTo(30, tableTop + 40).lineTo(180, tableTop + 40).stroke();

            doc.text('Одержувач', 35, tableTop + 5);
            if (fs.existsSync(fontBoldPath)) doc.font(fontBoldPath);
            doc.text(seller.recipientLine, 185, tableTop + 5, { width: 190 });
            if (fs.existsSync(fontPath)) doc.font(fontPath);

            doc.text(seller.taxIdLabel, 35, tableTop + 45);
            doc.fontSize(11);
            doc.text(seller.taxId, 185, tableTop + 45, { characterSpacing: 1 });
            doc.fontSize(9);

            doc.text('Банк одержувача', 35, tableTop + 65);
            doc.text(seller.bankName, 185, tableTop + 65);

            doc.text('Код банку', 385, tableTop + 45);
            doc.text(seller.bankMfo, 450, tableTop + 45);

            doc.text('КРЕДИТ рах. №', 385, tableTop + 5);
            doc.fontSize(10);
            doc.text(seller.iban, 385, tableTop + 15, { width: 175 });
            doc.fontSize(9);

            doc.y = tableTop + 100;
            if (fs.existsSync(fontBoldPath)) doc.font(fontBoldPath);
            doc.fontSize(14);
            doc.text(title, 30, doc.y, { align: 'left' });
            doc.moveDown(0.5);
            doc.rect(30, doc.y, 535, 1.5).fill('#000');
            doc.moveDown(1);

            doc.fontSize(9);
            if (fs.existsSync(fontPath)) doc.font(fontPath);

            const startY = doc.y;
            doc.text('Постачальник:', 30, startY);
            doc.text(formatSupplierBlock(seller), 120, startY, { width: 400 });

            doc.moveDown(2.5);
            const custY = doc.y;
            doc.text('Замовник:', 30, custY);
            doc.text(`${order.customerName}, ${order.customerPhone}`, 120, custY, { width: 400 });

            doc.moveDown(1.5);
            doc.text('Договір:', 30, doc.y);
            doc.moveDown(0.5);

            const table = {
                headers: [
                    { label: '№', property: 'index', width: 25 },
                    { label: 'Артикул', property: 'sku', width: 65 },
                    { label: 'Найменування', property: 'name', width: 250 },
                    { label: 'Кіл-сть', property: 'quantity', width: 45 },
                    { label: 'Од.вим.', property: 'unit', width: 45 },
                    { label: 'Ціна', property: 'price', width: 50 },
                    { label: 'Сума', property: 'total', width: 55 },
                ],
                datas: tableDatas,
            };

            doc.table(table, {
                prepareHeader: () => doc.font(fontBoldPath || 'Helvetica-Bold').fontSize(8),
                prepareRow: () => {
                    doc.font(fontPath || 'Helvetica').fontSize(8);
                },
            });

            doc.moveDown(1);
            doc.fontSize(9);
            const subtotalLabel = amounts.appliesVat ? amounts.grossSubtotal : amounts.netSubtotal;
            const discountAmount = amounts.appliesVat
                ? roundMoney(amounts.grossSubtotal - amounts.grossAfterDiscount)
                : roundMoney(amounts.netSubtotal - amounts.netAfterDiscount);
            const finalTotal = amounts.total;

            const labelX = 400;
            const valueX = 500;
            const rowWidth = 65;

            let currentY = doc.y;
            doc.text('Разом, грн:', labelX, currentY, { width: 100, align: 'right' });
            doc.text(subtotalLabel.toFixed(2), valueX, currentY, { width: rowWidth, align: 'right' });

            if (discountPercent > 0) {
                doc.moveDown(0.5);
                currentY = doc.y;
                doc.text(`Знижка (${discountPercent}%):`, labelX, currentY, { width: 100, align: 'right' });
                doc.text(discountAmount.toFixed(2), valueX, currentY, { width: rowWidth, align: 'right' });
            }

            if (amounts.appliesVat) {
                doc.moveDown(0.5);
                currentY = doc.y;
                doc.text('в т.ч. ПДВ:', labelX, currentY, { width: 100, align: 'right' });
                doc.text(amounts.vatAmount.toFixed(2), valueX, currentY, { width: rowWidth, align: 'right' });
            }

            doc.moveDown(0.5);
            currentY = doc.y;
            if (fs.existsSync(fontBoldPath)) doc.font(fontBoldPath);
            doc.text('До сплати:', labelX, currentY, { width: 100, align: 'right' });
            doc.text(finalTotal.toFixed(2), valueX, currentY, { width: rowWidth, align: 'right' });

            doc.moveDown(2);
            if (fs.existsSync(fontPath)) doc.font(fontPath);
            doc.text(`Всього найменувань ${tableDatas.length}, на суму:`, 30, doc.y);
            doc.moveDown(0.2);
            if (fs.existsSync(fontBoldPath)) doc.font(fontBoldPath);
            doc.text(numberToWordsUA(finalTotal), 30, doc.y, { width: 535 });

            doc.moveDown(2);
            doc.rect(30, doc.y, 535, 1).fill('#000');
            doc.moveDown(1);
            doc.text(`Виписав(ла): ${seller.signedBy}`, 30, doc.y, { align: 'right', width: 535 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

function formatInvoiceDate(order) {
    return new Date(order.createdAt).toLocaleDateString('uk-UA');
}

const generateInvoice = async (order, options = {}) => {
    const rentProductIds = await getRentProductIds(order.items);
    const seller = getSeller(options.sellerId ?? order.sellerId);
    const appliesVat = sellerAppliesVat(seller);
    const rentalApplication = await loadRentalApplication(order);
    const billingOptions = { rentProductIds, rentalApplication };
    const amounts = calcOrderAmounts(order.items, order.discount, seller, billingOptions);
    const discountPercent = Number(order.discount) || 0;

    const tableDatas = (order.items || []).map((item, i) => {
        const line = calcLineDisplayAmounts(item, appliesVat, billingOptions);
        return {
            index: i + 1,
            sku: item.sku || '-',
            name: formatInvoiceItemName(item, rentProductIds),
            quantity: line.quantity,
            unit: line.unit,
            price: line.unitPrice.toFixed(2),
            total: line.lineTotal.toFixed(2),
        };
    });

    return renderInvoicePdf({
        order,
        seller,
        amounts,
        tableDatas,
        title: `Рахунок на оплату №${order.orderNumber} від ${formatInvoiceDate(order)}р.`,
        discountPercent,
    });
};

const generateDepositInvoice = async (order, options = {}) => {
    const rentProductIds = await getRentProductIds(order.items);
    const seller = getSeller(options.sellerId ?? order.sellerId);
    const appliesVat = sellerAppliesVat(seller);
    const rentalApplication = options.rentalApplication || await loadRentalApplication(order);

    if (!rentalApplication) {
        const err = new Error('Для рахунку на заставу потрібна заявка на оренду');
        err.status = 400;
        throw err;
    }

    const depositRows = buildDepositInvoiceRows(
        order.items,
        rentalApplication,
        rentProductIds,
        appliesVat
    );

    if (!depositRows.length) {
        const err = new Error('У замовленні немає позицій застави для рахунку');
        err.status = 400;
        throw err;
    }

    const amounts = calcDepositInvoiceAmounts(rentalApplication, seller);
    const tableDatas = depositRows.map((row, i) => ({
        index: i + 1,
        sku: row.item.sku || '-',
        name: formatDepositInvoiceItemName(row.item),
        quantity: 1,
        unit: 'шт.',
        price: row.unitPrice.toFixed(2),
        total: row.lineTotal.toFixed(2),
    }));

    return renderInvoicePdf({
        order,
        seller,
        amounts,
        tableDatas,
        title: `Рахунок на оплату застави №${order.orderNumber} від ${formatInvoiceDate(order)}р.`,
        discountPercent: 0,
    });
};

module.exports = {
    generateInvoice,
    generateDepositInvoice,
    RENT_INVOICE_NAME_PREFIX,
    DEPOSIT_INVOICE_NAME_PREFIX,
    formatInvoiceItemName,
    formatDepositInvoiceItemName,
    isRentInvoiceItem,
};
