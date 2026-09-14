import { useCallback, useState } from 'react';
import { ordersApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { resolveSellerId } from '../../../constants/sellers';
import { parseDiscountValue, withOrderTotal } from '../amounts/orderAmounts';
import { normalizeUaPhone } from '../../../utils/phoneUtils';
import { buildOrderItemFromProduct, enrichOrderItemsFromProducts, enrichRentOrderItemsFromApplication } from '../model/orderItems';
import { calcDays } from '../model/rentalItems';

export function useOrderDraftEditor({
    draft,
    setDraft,
    setOrder,
    setLinkedRentalApp,
    products,
    rentProductIds,
    billingOptions,
    rentalExtras,
}) {
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const { showToast } = useToast();

    const markSaved = useCallback(() => setDirty(false), []);
    const markDirty = useCallback(() => setDirty(true), []);

    function setField(field, value) {
        setDirty(true);
        setDraft((prev) => {
            if (!prev) return prev;
            let next = {
                ...prev,
                [field]: field === 'discount' ? parseDiscountValue(value, prev.discountType) : value,
            };
            // Перемикання percent/fixed переінтерпретовує вже введене число
            // (10 при переході в fixed мало б лишитись 10 ₴, не перерахунком).
            if (field === 'discountType') {
                next = { ...next, discount: parseDiscountValue(prev.discount, value) };
            }
            if (field === 'sellerId' || field === 'discount' || field === 'discountType') {
                return withOrderTotal(next, billingOptions);
            }
            return next;
        });
    }

    /** @param {{clientPassport?, clientSiteAddress?, responsible?}} [extraRentalFields] */
    async function persistDraft(extraRentalFields) {
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

        const extras = extraRentalFields || rentalExtras || {};
        const payload = withOrderTotal({
            customerName: draft.customerName,
            customerPhone: normalizeUaPhone(draft.customerPhone),
            customerEmail: draft.customerEmail || null,
            address: draft.address || null,
            deliveryMethod: draft.deliveryMethod,
            paymentMethod: draft.paymentMethod,
            items: draft.items,
            totalAmount: draft.totalAmount,
            discountType: draft.discountType === 'fixed' ? 'fixed' : 'percent',
            discount: parseDiscountValue(draft.discount, draft.discountType),
            clientId: draft.clientId || null,
            status: draft.status,
            sellerId: resolveSellerId(draft.sellerId),
            rentalApplicationId: draft.rentalApplicationId || null,
            rentStartTime,
        }, billingOptions);
        payload.rentalApplication = {
            clientPassport: extras.passport || '',
            clientSiteAddress: extras.siteAddress || '',
            responsible: Array.isArray(extras.responsible) ? extras.responsible : [],
        };

        const { order: updated, rentalApplication } = await ordersApi.update(draft.id, payload);
        setOrder(updated);
        setLinkedRentalApp?.(rentalApplication);
        setDraft({
            ...updated,
            rentStartTime: updated.rentStartTime || rentStartTime || null,
            discountType: updated.discountType === 'fixed' ? 'fixed' : 'percent',
            discount: parseDiscountValue(updated.discount, updated.discountType),
            items: enrichRentOrderItemsFromApplication(
                enrichOrderItemsFromProducts(
                    updated.items ? [...updated.items.map((i) => ({ ...i }))] : [],
                    products,
                    rentProductIds
                ),
                rentProductIds,
                rentalApplication,
                products
            ),
        });
        setDirty(false);
        return { ...updated, rentStartTime: updated.rentStartTime || rentStartTime || null };
    }

    function addItem(product) {
        setDirty(true);
        setDraft((prev) => {
            if (!prev) return prev;
            const newItem = buildOrderItemFromProduct(product);
            // Seed serial/inventory/condition/weight/replacement-cost from the
            // catalog right away — otherwise these stay blank until the next
            // save round-trip re-enriches items from the server.
            const [enriched] = newItem.isRent
                ? enrichRentOrderItemsFromApplication([newItem], rentProductIds, null, products)
                : [newItem];
            const items = [...prev.items, enriched];
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
            const items = prev.items.map((item, i) => {
                if (i !== idx) return item;
                const quantity = parseFloat(qty) || 0;
                const next = { ...item, quantity };
                if (item.replacementCostPerUnit !== undefined && item.replacementCostPerUnit !== '') {
                    next.replacementCostTotal = (parseFloat(item.replacementCostPerUnit || 0) * quantity).toFixed(2);
                    next.depositAmount = (parseFloat(next.replacementCostTotal || 0) * parseFloat(item.depositPercent || 0) / 100).toFixed(2);
                }
                if (item.weightPerUnit !== undefined && item.weightPerUnit !== '') {
                    next.weightTotal = (parseFloat(item.weightPerUnit || 0) * quantity).toFixed(2);
                }
                return next;
            });
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

    /** Enrichment fields (serial, condition, kit, weight, replacement cost, deposit %) — edited inline on the item row. */
    function updateItemEnrichment(idx, field, value) {
        setDirty(true);
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) => {
                if (i !== idx) return item;
                const updated = { ...item, [field]: value };
                if (field === 'replacementCostPerUnit') {
                    updated.replacementCostTotal = (parseFloat(value || 0) * parseFloat(updated.quantity || 1)).toFixed(2);
                    updated.depositAmount = (parseFloat(updated.replacementCostTotal || 0) * parseFloat(updated.depositPercent || 0) / 100).toFixed(2);
                } else if (field === 'depositPercent') {
                    updated.depositAmount = (parseFloat(updated.replacementCostTotal || 0) * parseFloat(value || 0) / 100).toFixed(2);
                }
                return updated;
            });
            return { ...prev, items };
        });
    }

    function removeItemKit(idx, kitIndex) {
        setDirty(true);
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) => {
                if (i !== idx) return item;
                const kitItems = Array.isArray(item.kitItems)
                    ? item.kitItems.filter((_, ki) => ki !== kitIndex)
                    : [];
                return { ...item, kitItems };
            });
            return { ...prev, items };
        });
    }

    /** Додає порожній рядок комплектації — для чогось, що менеджер видає
     * зверху стандартного набору лише в цій конкретній угоді. */
    function addItemKit(idx) {
        setDirty(true);
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) => {
                if (i !== idx) return item;
                const kitItems = Array.isArray(item.kitItems) ? [...item.kitItems, ''] : [''];
                return { ...item, kitItems };
            });
            return { ...prev, items };
        });
    }

    function changeItemKit(idx, kitIndex, value) {
        setDirty(true);
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) => {
                if (i !== idx) return item;
                const kitItems = Array.isArray(item.kitItems)
                    ? item.kitItems.map((kit, ki) => (ki === kitIndex ? value : kit))
                    : [];
                return { ...item, kitItems };
            });
            return { ...prev, items };
        });
    }

    async function handleSave() {
        if (!draft) return;
        setSaving(true);
        try {
            await persistDraft();
        } catch (err) {
            showToast(err.message || 'Помилка збереження', 'warning');
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
        updateItemEnrichment,
        removeItemKit,
        addItemKit,
        changeItemKit,
        handleSave,
        suggestedProducts,
    };
}
