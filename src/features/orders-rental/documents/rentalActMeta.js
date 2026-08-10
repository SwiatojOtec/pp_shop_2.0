import { ordersApi } from '../../../services/api';
import { formatDailyDocumentNumber } from '../model/rentalDocFormat';

const DOC_TYPE_BY_VARIANT = {
    handover: 'rental_application',
    return_inspection: 'rental_return_act',
};

export async function resolveRentalActMeta({ orderId, variant = 'handover' } = {}) {
    const actDate = new Date();
    const docType = DOC_TYPE_BY_VARIANT[variant] || DOC_TYPE_BY_VARIANT.handover;

    if (orderId) {
        const { actNumber, actDate: serverDate } = await ordersApi.getNextRentalActNumber(orderId, docType);
        return {
            actNumber,
            actDate: serverDate ? new Date(serverDate) : actDate,
        };
    }

    return {
        actNumber: formatDailyDocumentNumber(actDate, 1),
        actDate,
    };
}
