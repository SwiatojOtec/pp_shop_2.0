import { buildRentalActContractRef } from './rentalContractRef';
import { computeRentalTotals } from '../model/rentalTotals';
import { recalcLineTotals } from '../model/rentalItems';
import { DEFAULT_SELLER_ID, getRentalLessor, RENTAL_LESSOR } from '../../../constants/sellers';

export { RENTAL_LESSOR };

export function buildRentalPdfPayload(application, order = null) {
    const rawItems = Array.isArray(application?.items) ? application.items : [];
    // Always derive days from rentFrom/rentTo (inclusive) so PDF matches the selected period.
    const items = rawItems.map((item) => (
        item?.rentFrom && item?.rentTo ? recalcLineTotals(item) : item
    ));
    const discountType = application?.discountType || 'fixed';
    const {
        totalRental,
        totalDeposit,
        parsedDiscount,
        discountAmount,
        totalRentalAfterDiscount,
    } = computeRentalTotals(items, discountType, application?.discountValue);

    const sellerId = order?.sellerId
        || application?.sellerId
        || application?.linkedOrder?.sellerId
        || DEFAULT_SELLER_ID;

    return {
        applicationNumber: application?.applicationNumber,
        lessor: getRentalLessor(sellerId),
        client: {
            name: application?.clientName || '',
            phone: application?.clientPhone || '',
            email: application?.clientEmail || '',
            passport: application?.clientPassport || '',
            address: application?.clientAddress || '',
            siteAddress: application?.clientSiteAddress || '',
        },
        responsible: Array.isArray(application?.responsible) ? application.responsible : [],
        items,
        totalRental,
        totalDeposit,
        discountType,
        discountValue: parsedDiscount,
        discountAmount,
        totalRentalAfterDiscount,
        contractRef: buildRentalActContractRef(order, application),
        orderId: order?.id || application?.linkedOrder?.id || application?.orderId || null,
    };
}

export async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = String(reader.result || '');
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
