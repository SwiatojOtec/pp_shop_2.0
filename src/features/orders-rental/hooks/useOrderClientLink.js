import { useEffect, useState } from 'react';
import { ordersApi, clientsApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { resolveSellerId } from '../../../constants/sellers';
import { parseDiscountPercent, parseDiscountValue, withOrderTotal } from '../amounts/orderAmounts';
import { isValidUaPhone, normalizeUaPhone } from '../../../utils/phoneUtils';
import { enrichOrderItemsFromProducts, enrichRentOrderItemsFromApplication } from '../model/orderItems';

export function useOrderClientLink({
    draft,
    setDraft,
    setOrder,
    setLinkedRentalApp,
    products,
    rentProductIds,
    billingOptions,
    onPersisted,
}) {
    const [linkedClient, setLinkedClient] = useState(null);
    const [phoneMatch, setPhoneMatch] = useState(null);
    const [clientLookupLoading, setClientLookupLoading] = useState(false);
    const [addingClient, setAddingClient] = useState(false);
    const [linkingClient, setLinkingClient] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (!draft) return undefined;

        if (draft.clientId) {
            setPhoneMatch(null);
            setClientLookupLoading(true);
            clientsApi.get(draft.clientId)
                .then((c) => setLinkedClient(c))
                .catch(() => setLinkedClient(null))
                .finally(() => setClientLookupLoading(false));
            return undefined;
        }

        setLinkedClient(null);
        const phone = normalizeUaPhone(String(draft.customerPhone || '').trim());
        if (!isValidUaPhone(phone)) {
            setPhoneMatch(null);
            setClientLookupLoading(false);
            return undefined;
        }

        setClientLookupLoading(true);
        const timer = setTimeout(() => {
            clientsApi.lookupByPhone(phone)
                .then((res) => setPhoneMatch(res?.found ? res.client : null))
                .catch(() => setPhoneMatch(null))
                .finally(() => setClientLookupLoading(false));
        }, 400);

        return () => clearTimeout(timer);
    }, [draft?.clientId, draft?.customerPhone]);

    async function linkClientToOrder(clientId) {
        if (!draft || !clientId) return;
        setLinkingClient(true);
        try {
            const client = await clientsApi.get(clientId);
            const clientDiscount = parseDiscountPercent(client?.discountPercent);
            // Знижка клієнта з бази завжди відсоткова — якщо вона є, вона
            // перемикає угоду в percent-режим (навіть якщо перед тим була
            // фіксована сума), інакше лишаємо поточну знижку угоди як є.
            const discountType = clientDiscount > 0 ? 'percent' : (draft.discountType === 'fixed' ? 'fixed' : 'percent');
            const discount = clientDiscount > 0 ? clientDiscount : parseDiscountValue(draft.discount, draft.discountType);
            const payload = withOrderTotal({
                ...draft,
                clientId,
                customerPhone: normalizeUaPhone(draft.customerPhone),
                sellerId: resolveSellerId(draft.sellerId),
                discountType,
                discount,
            }, billingOptions);
            const { order: updated, rentalApplication } = await ordersApi.update(draft.id, payload);
            setOrder(updated);
            setLinkedRentalApp?.(rentalApplication);
            setDraft({
                ...updated,
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
            setLinkedClient(client);
            setPhoneMatch(null);
            onPersisted?.();
        } catch (err) {
            showToast(err.message || 'Не вдалося прив\'язати клієнта', 'warning');
        } finally {
            setLinkingClient(false);
        }
    }

    async function addClientToDatabase() {
        if (!draft) return;
        if (!String(draft.customerName || '').trim() || !String(draft.customerPhone || '').trim()) {
            showToast('Спочатку вкажіть ім\'я та телефон клієнта', 'warning');
            return;
        }
        setAddingClient(true);
        try {
            const created = await clientsApi.create({
                fullName: String(draft.customerName).trim(),
                phone: normalizeUaPhone(draft.customerPhone),
                email: draft.customerEmail?.trim() || null,
                address: draft.address?.trim() || null,
                discountPercent: draft.discountType === 'fixed' ? 0 : (Number(draft.discount) || 0),
            });
            await linkClientToOrder(created.id);
        } catch (err) {
            showToast(err.message || 'Не вдалося додати клієнта', 'warning');
        } finally {
            setAddingClient(false);
        }
    }

    return {
        linkedClient,
        setLinkedClient,
        phoneMatch,
        clientLookupLoading,
        addingClient,
        linkingClient,
        linkClientToOrder,
        addClientToDatabase,
    };
}
