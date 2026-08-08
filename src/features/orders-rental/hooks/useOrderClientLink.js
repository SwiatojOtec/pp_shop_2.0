import { useEffect, useState } from 'react';
import { ordersApi, clientsApi } from '../../../services/api';
import { resolveSellerId } from '../../../constants/sellers';
import { parseDiscountPercent, withOrderTotal } from '../amounts/orderAmounts';
import { isValidUaPhone, normalizeUaPhone } from '../../../utils/phoneUtils';
import { enrichOrderItemsFromProducts } from '../model/orderItems';

export function useOrderClientLink({
    draft,
    setDraft,
    setOrder,
    products,
    rentProductIds,
    billingOptions,
}) {
    const [linkedClient, setLinkedClient] = useState(null);
    const [phoneMatch, setPhoneMatch] = useState(null);
    const [clientLookupLoading, setClientLookupLoading] = useState(false);
    const [addingClient, setAddingClient] = useState(false);
    const [linkingClient, setLinkingClient] = useState(false);

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
            const payload = withOrderTotal({
                ...draft,
                clientId,
                customerPhone: normalizeUaPhone(draft.customerPhone),
                sellerId: resolveSellerId(draft.sellerId),
                discount: clientDiscount > 0 ? clientDiscount : parseDiscountPercent(draft.discount),
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
            setLinkedClient(client);
            setPhoneMatch(null);
        } catch (err) {
            alert(err.message || 'Не вдалося прив\'язати клієнта');
        } finally {
            setLinkingClient(false);
        }
    }

    async function addClientToDatabase() {
        if (!draft) return;
        if (!String(draft.customerName || '').trim() || !String(draft.customerPhone || '').trim()) {
            alert('Спочатку вкажіть ім\'я та телефон клієнта');
            return;
        }
        setAddingClient(true);
        try {
            const created = await clientsApi.create({
                fullName: String(draft.customerName).trim(),
                phone: normalizeUaPhone(draft.customerPhone),
                email: draft.customerEmail?.trim() || null,
                address: draft.address?.trim() || null,
                discountPercent: Number(draft.discount) || 0,
            });
            await linkClientToOrder(created.id);
        } catch (err) {
            alert(err.message || 'Не вдалося додати клієнта');
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
