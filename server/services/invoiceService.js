const PDFDocument = require('pdfkit-table');
const fs = require('fs');
const path = require('path');

const generateInvoice = async (order) => {
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

            // 1. Header Warning Box
            doc.fontSize(8).rect(30, 30, 535, 40).stroke();
            doc.text('Увага! Оплата даного рахунку означає згоду з умовами постачання товару. Повідомлення про оплату обов\'язково, у противному випадку не гарантується наявність товару на складі. Товар відпускається по факту приходу грошей на п/р Постачальника, самовивозом, при наявності доручення і паспорта.', 35, 35, { width: 525, align: 'center' });

            // 2. Payment Details Table (Manual drawing for exact match)
            doc.moveDown(2);
            const tableTop = 80;
            doc.fontSize(9);
            doc.rect(30, tableTop, 535, 80).stroke();

            // Vertical lines
            doc.moveTo(200, tableTop).lineTo(200, tableTop + 80).stroke();
            doc.moveTo(400, tableTop).lineTo(400, tableTop + 40).stroke();

            // Horizontal lines inside
            doc.moveTo(200, tableTop + 40).lineTo(565, tableTop + 40).stroke();
            doc.moveTo(30, tableTop + 40).lineTo(200, tableTop + 40).stroke();

            doc.text('Одержувач', 35, tableTop + 5);
            if (fs.existsSync(fontBoldPath)) doc.font(fontBoldPath);
            doc.text('Фізична особа-підприємець Панкрат\'єв Микола Олександрович', 205, tableTop + 5);
            if (fs.existsSync(fontPath)) doc.font(fontPath);

            doc.text('ІПН', 35, tableTop + 45);
            doc.fontSize(11);
            doc.text('3584307038', 210, tableTop + 45, { characterSpacing: 2 });
            doc.fontSize(9);

            doc.text('Банк одержувача', 35, tableTop + 65);
            doc.text('АТ "УНІВЕРСАЛ БАНК"', 205, tableTop + 65);

            doc.text('Код банку', 405, tableTop + 45);
            doc.text('322001', 470, tableTop + 45);

            doc.text('КРЕДИТ рах. №', 405, tableTop + 5);
            doc.fontSize(10);
            doc.text('UA733220010000026002330029958', 405, tableTop + 15, { width: 155 });
            doc.fontSize(9);

            // 3. Invoice Title
            doc.moveDown(6);
            if (fs.existsSync(fontBoldPath)) doc.font(fontBoldPath);
            doc.fontSize(14);
            const date = new Date(order.createdAt).toLocaleDateString('uk-UA');
            doc.text(`Рахунок на оплату №${order.orderNumber.replace('PP-', '')} від ${date}р.`, { align: 'left' });
            doc.moveDown(0.5);
            doc.rect(30, doc.y, 535, 1.5).fill('#000');
            doc.moveDown(1);

            // 4. Supplier & Customer
            doc.fontSize(9);
            if (fs.existsSync(fontPath)) doc.font(fontPath);

            const startY = doc.y;
            doc.text('Постачальник:', 30, startY);
            doc.text('Фізична особа-підприємець Панікрат\'єв Микола Олександрович\nЮр. адреса: 08130, м. Київ, вул. Садова, буд 139\nІПН 3584307038', 120, startY, { width: 400 });

            doc.moveDown(2);
            const custY = doc.y;
            doc.text('Замовник:', 30, custY);
            doc.text(`${order.customerName}, ${order.customerPhone}`, 120, custY, { width: 400 });

            doc.moveDown(2);
            doc.text('Договір:', 30, doc.y);

            // 5. Items Table
            const table = {
                headers: [
                    { label: "№", property: 'index', width: 30 },
                    { label: "Артикул", property: 'sku', width: 70 },
                    { label: "Найменування", property: 'name', width: 235 },
                    { label: "Кіл-сть", property: 'quantity', width: 50 },
                    { label: "Од.вим.", property: 'unit', width: 50 },
                    { label: "Ціна", property: 'price', width: 50 },
                    { label: "Сума", property: 'total', width: 50 },
                ],
                datas: order.items.map((item, i) => {
                    const price = Number(item.price) || 0;
                    const quantity = Number(item.quantity) || 0;
                    return {
                        index: i + 1,
                        sku: item.sku || '-',
                        name: item.name,
                        quantity: quantity,
                        unit: item.unit || 'м²',
                        price: price.toFixed(2),
                        total: (price * quantity).toFixed(2)
                    };
                })
            };

            doc.table(table, {
                prepareHeader: () => doc.font(fontBoldPath || 'Helvetica-Bold').fontSize(8),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font(fontPath || 'Helvetica').fontSize(8);
                },
            });

            // 6. Totals
            doc.moveDown(1);
            doc.fontSize(9);
            const totalY = doc.y;
            doc.text('Разом, грн:', 450, totalY, { width: 60, align: 'right' });
            doc.text(order.totalAmount.toFixed(2), 515, totalY, { width: 50, align: 'right' });

            doc.moveDown(0.5);
            if (fs.existsSync(fontBoldPath)) doc.font(fontBoldPath);
            doc.text('До сплати:', 450, doc.y, { width: 60, align: 'right' });
            doc.text(order.totalAmount.toFixed(2), 515, doc.y, { width: 50, align: 'right' });

            doc.moveDown(2);
            if (fs.existsSync(fontPath)) doc.font(fontPath);
            doc.text(`Всього найменувань ${order.items.length}, на суму ${order.totalAmount.toFixed(2)} грн.`);

            // TODO: Add amount in words (Ukrainian) if needed

            doc.moveDown(2);
            doc.rect(30, doc.y, 535, 1).fill('#000');
            doc.moveDown(1);
            doc.text('Виписав(ла): Панікрат\'єв М.О.', { align: 'right' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { generateInvoice };
