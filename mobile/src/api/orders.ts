import { apiGetBinary, apiPost } from './client';

/** Той самий формат позиції, що buildOrderItemFromProduct у веб-адмінці
 *  (src/features/orders-rental/model/orderItems.js). */
export interface OrderItem {
    id: number;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    unit: string;
    packSize: number;
    isRent: boolean;
}

export interface CreateOrderPayload {
    customerName: string;
    customerPhone: string;
    items: OrderItem[];
    totalAmount: number;
}

export interface Order {
    id: number;
    orderNumber: string;
    [key: string]: unknown;
}

export interface OrderDocument {
    id: number;
    fileName: string;
    [key: string]: unknown;
}

/** POST /api/orders/admin (createAdminOrder) — та сама точка створення
 *  угоди, що кнопка "Нова угода" у веб-адмінці. */
export function createAdminOrder(payload: CreateOrderPayload): Promise<Order> {
    return apiPost<Order>('/api/orders/admin', {
        ...payload,
        deliveryMethod: 'pickup',
        paymentMethod: 'invoice',
        discount: 0,
    });
}

/** POST /api/orders/:id/documents/invoice — генерує й зберігає PDF. */
export function createInvoiceDocument(orderId: number): Promise<OrderDocument> {
    return apiPost<OrderDocument>(`/api/orders/${orderId}/documents/invoice`);
}

/** GET /api/orders/:id/documents/:docId — сирі байти PDF. */
export function downloadInvoiceFile(orderId: number, docId: number): Promise<ArrayBuffer> {
    return apiGetBinary(`/api/orders/${orderId}/documents/${docId}`);
}
