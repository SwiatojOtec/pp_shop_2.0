/** Стандартна ставка ПДВ в Україні, % */
const UA_VAT_PERCENT = 20;
const UA_VAT_RATE = UA_VAT_PERCENT / 100;

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function buildRentalAppIndex(rentalApplication) {
    const map = new Map();
    const items = rentalApplication?.items;
    if (!Array.isArray(items)) return map;
    for (const line of items) {
        const pid = Number(line?.productId);
        if (Number.isFinite(pid) && pid > 0) {
            map.set(pid, line);
        }
    }
    return map;
}

function isRentBillingItem(item, rentProductIds) {
    if (item?.isRent) return true;
    if (!rentProductIds) return false;
    if (rentProductIds instanceof Set) return rentProductIds.has(item?.id);
    return Array.isArray(rentProductIds) && rentProductIds.includes(item?.id);
}

function resolveRentLineNetTotal(orderItem, appLine) {
    const parsedTotal = parseFloat(appLine?.totalRental);
    if (Number.isFinite(parsedTotal) && parsedTotal > 0) {
        return roundMoney(parsedTotal);
    }

    const days = Number(appLine?.days) || 0;
    const pricePerDay = parseFloat(appLine?.pricePerDay) || 0;
    const qty = Number(appLine?.quantity) || Number(orderItem?.quantity) || 1;
    if (days > 0 && pricePerDay > 0) {
        return roundMoney(days * pricePerDay * qty);
    }

    return 0;
}

function resolveLineNetTotal(item, rentProductIds, rentalAppIndex) {
    if (isRentBillingItem(item, rentProductIds)) {
        const appLine = rentalAppIndex.get(Number(item?.id));
        const rentTotal = appLine ? resolveRentLineNetTotal(item, appLine) : 0;
        if (rentTotal > 0) return rentTotal;
    }

    return roundMoney(
        (Number(item?.price) || 0)
        * (Number(item?.quantity) || 0)
        * (Number(item?.packSize) || 1)
    );
}

function sellerAppliesVat(seller) {
    return seller?.type === 'tov' || !!seller?.appliesVat;
}

/**
 * @param {Array} items
 * @param {number|string} discountPercent
 * @param {{ type?: string, appliesVat?: boolean }} seller
 * @param {{ rentProductIds?: Set|number[], rentalApplication?: object }} [billingOptions]
 */
function calcOrderAmounts(items, discountPercent = 0, seller, billingOptions = {}) {
    const appliesVat = sellerAppliesVat(seller);
    const rentalAppIndex = buildRentalAppIndex(billingOptions.rentalApplication);
    const netSubtotal = roundMoney(
        (items || []).reduce(
            (sum, item) => sum + resolveLineNetTotal(item, billingOptions.rentProductIds, rentalAppIndex),
            0
        )
    );
    const discount = Number(discountPercent) || 0;
    const netAfterDiscount = roundMoney(netSubtotal * (1 - discount / 100));

    if (!appliesVat) {
        return {
            appliesVat: false,
            vatPercent: 0,
            netSubtotal,
            netAfterDiscount,
            vatAmount: 0,
            grossSubtotal: netSubtotal,
            grossAfterDiscount: netAfterDiscount,
            total: netAfterDiscount,
        };
    }

    const grossSubtotal = roundMoney(netSubtotal * (1 + UA_VAT_RATE));
    const vatAmount = roundMoney(netAfterDiscount * UA_VAT_RATE);
    const grossAfterDiscount = roundMoney(netAfterDiscount + vatAmount);

    return {
        appliesVat: true,
        vatPercent: UA_VAT_PERCENT,
        netSubtotal,
        netAfterDiscount,
        vatAmount,
        grossSubtotal,
        grossAfterDiscount,
        total: grossAfterDiscount,
    };
}

function applyVatToLine(netUnit, netLine, appliesVat) {
    if (!appliesVat) {
        return { unitPrice: netUnit, lineTotal: netLine };
    }
    return {
        unitPrice: roundMoney(netUnit * (1 + UA_VAT_RATE)),
        lineTotal: roundMoney(netLine * (1 + UA_VAT_RATE)),
    };
}

function calcDepositInvoiceAmounts(rentalApplication, seller) {
    const appliesVat = sellerAppliesVat(seller);
    const netSubtotal = roundMoney(
        (rentalApplication?.items || []).reduce(
            (sum, line) => sum + parseFloat(line.depositAmount || 0),
            0
        )
    );

    if (!appliesVat) {
        return {
            appliesVat: false,
            vatPercent: 0,
            netSubtotal,
            netAfterDiscount: netSubtotal,
            vatAmount: 0,
            grossSubtotal: netSubtotal,
            grossAfterDiscount: netSubtotal,
            total: netSubtotal,
        };
    }

    const grossSubtotal = roundMoney(netSubtotal * (1 + UA_VAT_RATE));
    const vatAmount = roundMoney(netSubtotal * UA_VAT_RATE);
    const grossAfterDiscount = roundMoney(netSubtotal + vatAmount);

    return {
        appliesVat: true,
        vatPercent: UA_VAT_PERCENT,
        netSubtotal,
        netAfterDiscount: netSubtotal,
        vatAmount,
        grossSubtotal,
        grossAfterDiscount,
        total: grossAfterDiscount,
    };
}

function buildDepositInvoiceRows(orderItems, rentalApplication, rentProductIds, appliesVat) {
    const rentalAppIndex = buildRentalAppIndex(rentalApplication);
    const rows = [];

    for (const item of orderItems || []) {
        if (!isRentBillingItem(item, rentProductIds)) continue;

        const appLine = rentalAppIndex.get(Number(item?.id));
        const netLine = parseFloat(appLine?.depositAmount || 0);
        if (!(netLine > 0)) continue;

        const { unitPrice, lineTotal } = applyVatToLine(netLine, netLine, appliesVat);
        rows.push({ item, unitPrice, lineTotal });
    }

    return rows;
}

function calcLineNetUnitPrice(item) {
    return (Number(item.price) || 0) * (Number(item.packSize) || 1);
}

function calcLineDisplayAmounts(item, appliesVat, billingOptions = {}) {
    const rentalAppIndex = buildRentalAppIndex(billingOptions.rentalApplication);

    if (isRentBillingItem(item, billingOptions.rentProductIds)) {
        const appLine = rentalAppIndex.get(Number(item?.id));
        if (appLine) {
            const netLine = resolveRentLineNetTotal(item, appLine);
            const days = Number(appLine.days) || 0;
            const pricePerDay = parseFloat(appLine.pricePerDay) || 0;
            const qty = Number(appLine.quantity) || Number(item.quantity) || 1;

            if (netLine > 0 && days > 0) {
                const netUnit = roundMoney(pricePerDay > 0 ? pricePerDay : netLine / (days * qty));
                const { unitPrice, lineTotal } = applyVatToLine(netUnit, netLine, appliesVat);
                return {
                    quantity: days * qty,
                    unit: 'доба',
                    unitPrice,
                    lineTotal,
                };
            }
        }
    }

    const quantity = Number(item.quantity) || 0;
    const netUnit = calcLineNetUnitPrice(item);
    const netLine = roundMoney(netUnit * quantity);
    const { unitPrice, lineTotal } = applyVatToLine(netUnit, netLine, appliesVat);

    return {
        quantity,
        unit: item.unit === 'м²' ? 'уп.' : (item.unit || 'шт.'),
        unitPrice,
        lineTotal,
    };
}

function calcItemsNetSubtotal(items, billingOptions = {}) {
    const rentalAppIndex = buildRentalAppIndex(billingOptions.rentalApplication);
    return roundMoney(
        (items || []).reduce(
            (sum, item) => sum + resolveLineNetTotal(item, billingOptions.rentProductIds, rentalAppIndex),
            0
        )
    );
}

module.exports = {
    UA_VAT_PERCENT,
    UA_VAT_RATE,
    roundMoney,
    buildRentalAppIndex,
    resolveLineNetTotal,
    calcItemsNetSubtotal,
    sellerAppliesVat,
    calcOrderAmounts,
    calcDepositInvoiceAmounts,
    buildDepositInvoiceRows,
    calcLineNetUnitPrice,
    calcLineDisplayAmounts,
};
