import { apiGet, apiPost } from './client';

export interface RentalBooking {
    id: number;
    productId: number;
    productName: string | null;
    rentFrom: string;
    rentTo: string;
    note: string;
    clientName: string;
    clientPhone: string;
    status: 'hold' | 'converted' | 'cancelled';
    rentalApplicationId: number | null;
    createdBy: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBookingPayload {
    productId: number;
    rentFrom: string;
    rentTo: string;
    note?: string;
    clientName?: string;
    clientPhone?: string;
}

/** Активні («hold») брони конкретного товару — щоб перед створенням
 *  побачити, на які дати він уже зайнятий. */
export function listActiveBookingsForProduct(productId: number): Promise<RentalBooking[]> {
    return apiGet<RentalBooking[]>('/api/rental-calendar/bookings', {
        productId,
        status: 'hold',
    });
}

export function createBooking(payload: CreateBookingPayload): Promise<RentalBooking> {
    return apiPost<RentalBooking>('/api/rental-calendar/bookings', payload);
}
