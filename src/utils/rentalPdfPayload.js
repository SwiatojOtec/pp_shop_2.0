export const RENTAL_LESSOR = {
    name: 'Панкрат єв Олександр Миколайович',
    ipn: '2490020092',
    address: '15300, м. Корюківка, вул. Садова, буд. 139',
    phone: '+38 098 188 00 44; +38 095 672 44 00',
    email: 'office@ppbud.info',
    warehouseAddress: 'м. Київ, вул. Холодноярська 2а',
};

import { buildRentalActContractRef } from './rentalContractRef';

export function buildRentalPdfPayload(application, order = null) {
    const items = Array.isArray(application?.items) ? application.items : [];
    const totalRental = items.reduce((sum, item) => sum + parseFloat(item.totalRental || 0), 0);
    const totalDeposit = items.reduce((sum, item) => sum + parseFloat(item.depositAmount || 0), 0);
    const discountType = application?.discountType || 'fixed';
    const parsedDiscount = parseFloat(application?.discountValue || 0);
    const rawDiscountAmount = discountType === 'percent'
        ? (totalRental * Math.min(parsedDiscount, 100)) / 100
        : parsedDiscount;
    const discountAmount = Math.min(rawDiscountAmount, totalRental);
    const totalRentalAfterDiscount = Math.max(totalRental - discountAmount, 0);

    return {
        applicationNumber: application?.applicationNumber,
        lessor: RENTAL_LESSOR,
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
