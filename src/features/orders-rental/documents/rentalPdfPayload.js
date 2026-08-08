export const RENTAL_LESSOR = {
    name: 'Панкрат єв Олександр Миколайович',
    ipn: '2490020092',
    address: '15300, м. Корюківка, вул. Садова, буд. 139',
    phone: '+38 098 188 00 44; +38 095 672 44 00',
    email: 'office@ppbud.info',
    warehouseAddress: 'м. Київ, вул. Холодноярська 2а',
};

import { buildRentalActContractRef } from './rentalContractRef';
import { computeRentalTotals } from '../model/rentalTotals';

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
