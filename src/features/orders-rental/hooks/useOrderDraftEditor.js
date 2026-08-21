import { useCallback, useState } from 'react';
import { ordersApi } from '../../../services/api';
import { resolveSellerId } from '../../../constants/sellers';
import { parseDiscountPercent, withOrderTotal } from '../amounts/orderAmounts';
import { normalizeUaPhone } from '../../../utils/phoneUtils';
import { buildOrderItemFromProduct, enrichOrderItemsFromProducts } from '../model/orderItems';
import { calcDays } from '../model/rentalItems';

export function useOrderDraftEditor({
    draft,
    setDraft,
    setOrder,
    products,
    rentProductIds,
    billingOptions,
}) {
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    const markSaved = useCallback(() => setDirty(false), []);
    const markDirty = useCallback(() => setDirty(true), []);

    function setField(field, value) {
        setDirty(true);
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
        const rentStartTime = (() => {
            const raw = String(draft.rentStartTime || '').trim();
            const m = raw.match(/^(\d{1,2}):(\d{2})/);
            if (!m) return null;
            const h = Number(m[1]);
            const min = Number(m[2]);
            if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
            return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        })();

        const payload = withOrderTotal({
            customerName: draft.customerName,
            customerPhone: normalizeUaPhone(draft.customerPhone),
            customerEmail: draft.customerEmail || null,
            address: draft.address || null,
            deliveryMethod: draft.deliveryMethod,
            paymentMethod: draft.paymentMethod,
            items: draft.items,
            totalAmount: draft.totalAmount,
            discount: parseDiscountPercent(draft.discount),
            clientId: draft.clientId || null,
            status: draft.status,
            sellerId: resolveSellerId(draft.sellerId),
            rentalApplicationId: draft.rentalApplicationId || null,
            rentStartTime,
        }, billingOptions);

        const updated = await ordersApi.update(draft.id, payload);
        setOrder(updated);
        setDraft({
            ...updated,
            rentStartTime: updated.rentStartTime || rentStartTime || null,
            discount: parseDiscountPercent(updated.discount),
            items: enrichOrderItemsFromProducts(
                updated.items ? [...updated.items.map((i) => ({ ...i }))] : [],
                products,
                rentProductIds
            ),
        });
        setDirty(false);
        return { ...updated, rentStartTime: updated.rentStartTime || rentStartTime || null };
    }

    function addItem(product) {
        setDirty(true);
        setDraft((prev) => {
            if (!prev) return prev;
            const items = [...prev.items, buildOrderItemFromProduct(product)];
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
        setProductSearch('');
    }

    function removeItem(idx) {
        setDirty(true);
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.filter((_, i) => i !== idx);
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
    }

    function updateQty(idx, qty) {
        setDirty(true);
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) =>
                i === idx ? { ...item, quantity: parseFloat(qty) || 0 } : item
            );
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
    }

    function updateRentDates(idx, { rentFrom, rentTo }) {
        setDirty(true);
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) => {
                if (i !== idx) return item;
                const nextFrom = rentFrom !== undefined ? rentFrom : (item.rentFrom || '');
                const nextTo = rentTo !== undefined ? rentTo : (item.rentTo || '');
                const days = calcDays(nextFrom, nextTo);
                return {
                    ...item,
                    rentFrom: nextFrom,
                    rentTo: nextTo,
                    rentDays: days > 0 ? days : Math.max(1, Number(item.rentDays) || 1),
                };
            });
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
        dirty,
        markSaved,
        markDirty,
        productSearch,
        setProductSearch,
        setField,
        persistDraft,
        addItem,
        removeItem,
        updateQty,
        updateRentDates,
        handleSave,
        suggestedProducts,
    };
}
