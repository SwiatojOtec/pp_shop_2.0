import { buildRentalActContractRef } from './rentalContractRef';
import { computeRentalTotals } from '../model/rentalTotals';
import { DEFAULT_SELLER_ID, getRentalLessor, RENTAL_LESSOR } from '../../../constants/sellers';

export { RENTAL_LESSOR };

export function buildRentalPdfPayload(application, order = null) {
    const items = Array.isArray(application?.items) ? application.items : [];
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
