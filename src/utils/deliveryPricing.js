/**
 * Автоматичне додавання рядка «Доставка» до позицій замовлення, коли обрано
 * адресну доставку — щоб клієнт бачив повну суму (з доставкою) ще до
 * підтвердження, а не дізнавався про неї згодом від менеджера. Сама послуга
 * «Доставка» — звичайний Product з isService:true, category:'Доставка'
 * (docs plan «Каталог «Послуги»»), приховано з публічного /poslugy
 * (showInServiceCatalog:false) — саме тому й потрібне це явне з'єднання за
 * категорією, а не показ у публічному каталозі послуг.
 */
export const DELIVERY_FREE_THRESHOLD = 30000;
export const DELIVERY_CATEGORY = 'Доставка';

export function findDeliveryProduct(products) {
    return (products || []).find((p) => p.isService && p.category === DELIVERY_CATEGORY) || null;
}

export function itemsSubtotal(items) {
    return (items || []).reduce(
        (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0) * (Number(it.packSize) || 1),
        0
    );
}

/**
 * Повертає новий масив позицій: коли deliveryMethod === 'delivery' —
 * рядок доставки додано (безкоштовно від DELIVERY_FREE_THRESHOLD, інакше
 * за ціною послуги); інакше рядок прибрано. Раніше доданий рядок
 * ідентифікується за id товару-послуги, тож ручне видалення чи інші
 * позиції в замовленні не зачіпаються.
 */
export function applyDeliveryItem(items, deliveryMethod, deliveryProduct) {
    const withoutDelivery = deliveryProduct
        ? (items || []).filter((it) => it.id !== deliveryProduct.id)
        : (items || []);
    if (deliveryMethod !== 'delivery' || !deliveryProduct) return withoutDelivery;

    const subtotal = itemsSubtotal(withoutDelivery);
    const price = subtotal >= DELIVERY_FREE_THRESHOLD ? 0 : (Number(deliveryProduct.price) || 0);
    return [...withoutDelivery, {
        id: deliveryProduct.id,
        name: deliveryProduct.name,
        sku: deliveryProduct.sku || '',
        price,
        quantity: 1,
        unit: deliveryProduct.unit || 'послуга',
        packSize: 1,
        isRent: false,
    }];
}
