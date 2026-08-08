import { useState } from 'react';
import { ordersApi } from '../../../services/api';
import { resolveSellerId } from '../../../constants/sellers';
import { parseDiscountPercent, withOrderTotal } from '../amounts/orderAmounts';
import { normalizeUaPhone } from '../../../utils/phoneUtils';
import { buildOrderItemFromProduct, enrichOrderItemsFromProducts } from '../model/orderItems';

export function useOrderDraftEditor({
    draft,
    setDraft,
    setOrder,
    products,
    rentProductIds,
    billingOptions,
}) {
    const [saving, setSaving] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    function setField(field, value) {
        setDraft((prev) => {
            if (!prev) return prev;
            const next = {
                ...prev,
                [field]: field === 'discount' ? parseDiscountPercent(value) : value,
            };
            if (field === 'sellerId' || field === 'discount') {
                return withOrderTotal(next, billingOptions);
            }
            return next;
        });
    }

    async function persistDraft() {
        if (!draft) return null;
        const payload = withOrderTotal({
            ...draft,
            customerPhone: normalizeUaPhone(draft.customerPhone),
            sellerId: resolveSellerId(draft.sellerId),
            discount: parseDiscountPercent(draft.discount),
        }, billingOptions);
        const updated = await ordersApi.update(draft.id, payload);
        setOrder(updated);
        setDraft({
            ...updated,
            discount: parseDiscountPercent(updated.discount),
            items: enrichOrderItemsFromProducts(
                updated.items ? [...updated.items.map((i) => ({ ...i }))] : [],
                products,
                rentProductIds
            ),
        });
        return updated;
    }

    function addItem(product) {
        setDraft((prev) => {
            if (!prev) return prev;
            const items = [...prev.items, buildOrderItemFromProduct(product)];
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
        setProductSearch('');
    }

    function removeItem(idx) {
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.filter((_, i) => i !== idx);
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
    }

    function updateQty(idx, qty) {
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) =>
                i === idx ? { ...item, quantity: parseFloat(qty) || 0 } : item
            );
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
    }

    function updateRentDays(idx, days) {
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) =>
                i === idx ? { ...item, rentDays: Math.max(1, parseFloat(days) || 1) } : item
            );
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
    }

    async function handleSave() {
        if (!draft) return;
        setSaving(true);
        try {
            await persistDraft();
        } catch (err) {
            alert(err.message || 'Помилка збереження');
        } finally {
            setSaving(false);
        }
    }

    const suggestedProducts = productSearch.length > 1
        ? products.filter((p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
        ).slice(0, 8)
        : [];

    return {
        saving,
        productSearch,
        setProductSearch,
        setField,
        persistDraft,
        addItem,
        removeItem,
        updateQty,
        updateRentDays,
        handleSave,
        suggestedProducts,
    };
}
